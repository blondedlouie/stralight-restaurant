CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE order_type_enum AS ENUM ('delivery', 'pickup');
CREATE TYPE order_status_enum AS ENUM ('placed', 'kitchen', 'ready', 'dispatched', 'enroute', 'delivered', 'cancelled');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE kitchen_dept_enum AS ENUM ('chicken', 'pizza', 'drinks', 'general');

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    region VARCHAR(50) NOT NULL DEFAULT 'Nairobi',
    phone_primary VARCHAR(20) NOT NULL,
    phone_chicken VARCHAR(20),
    phone_pizza VARCHAR(20),
    has_split_kitchen BOOLEAN DEFAULT FALSE,
    average_prep_minutes INT NOT NULL DEFAULT 25 CHECK (average_prep_minutes > 0),
    average_delivery_minutes INT NOT NULL DEFAULT 20 CHECK (average_delivery_minutes >= 0),
    delivery_radius_m INT NOT NULL DEFAULT 3000 CHECK (delivery_radius_m > 0),
    glovo_address_book_id UUID,
    uber_store_id VARCHAR(120),
    address_description TEXT NOT NULL,
    operating_hours TEXT DEFAULT '10:00 AM - 02:00 AM',
    coordinates GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y(coordinates)) STORED,
    longitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_X(coordinates)) STORED,
    delivery_boundary GEOMETRY(Polygon, 4326),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_branches_coords ON branches USING GIST (coordinates);
CREATE INDEX idx_branches_boundary ON branches USING GIST (delivery_boundary);

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'dispatch', 'kitchen', 'rider', 'pos')),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_riders_branch ON delivery_riders(branch_id, is_active);

CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    sort_order INT DEFAULT 0
);

CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    kitchen_dept kitchen_dept_enum DEFAULT 'chicken',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE menu_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    price_override DECIMAL(10, 2) NOT NULL,
    sort_order INT DEFAULT 0
);

CREATE TABLE branch_menu_stock (
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (branch_id, menu_item_id)
);

CREATE TABLE orders (
    id VARCHAR(20) PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    order_type order_type_enum NOT NULL DEFAULT 'delivery',
    status order_status_enum NOT NULL DEFAULT 'placed',
    payment_status payment_status_enum NOT NULL DEFAULT 'pending',
    preferred_date DATE NOT NULL,
    preferred_time VARCHAR(50) NOT NULL,
    search_estate VARCHAR(150),
    specific_landmark TEXT,
    building_name TEXT,
    delivery_latitude DOUBLE PRECISION,
    delivery_longitude DOUBLE PRECISION,
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    mpesa_checkout_id VARCHAR(100) UNIQUE,
    mpesa_receipt_number VARCHAR(100),
    pod_token UUID DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_deliveries (
    order_id VARCHAR(20) PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES delivery_riders(id) ON DELETE SET NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'in_house' CHECK (provider IN ('in_house', 'glovo', 'uber_direct')),
    rider_name VARCHAR(150),
    rider_phone VARCHAR(20),
    courier_name VARCHAR(100),
    courier_reference VARCHAR(100),
    tracking_url TEXT,
    eta_minutes INT CHECK (eta_minutes IS NULL OR eta_minutes >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(20) REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(150) NOT NULL,
    variant_name VARCHAR(100),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    kitchen_dept kitchen_dept_enum DEFAULT 'general'
);

CREATE OR REPLACE FUNCTION route_customer_order(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS TABLE (
    branch_id UUID,
    branch_name VARCHAR,
    is_deliverable BOOLEAN,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.name,
        TRUE AS is_deliverable,
        ST_Distance(b.coordinates::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_meters
    FROM branches b
    WHERE b.is_active = TRUE
      AND ST_Covers(
        COALESCE(b.delivery_boundary, ST_Buffer(b.coordinates::geography, b.delivery_radius_m)::geometry),
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)
      )
    ORDER BY ST_Distance(b.coordinates::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN QUERY
      SELECT b.id, b.name, FALSE AS is_deliverable,
        ST_Distance(b.coordinates::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_meters
      FROM branches b WHERE b.is_active = TRUE
      ORDER BY distance_meters ASC LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.admin_set_branch_delivery_radius(target_branch UUID, radius_meters INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_staff_role(ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'Super admin role required';
  END IF;
  IF radius_meters < 500 OR radius_meters > 30000 THEN
    RAISE EXCEPTION 'Radius must be between 500 and 30000 meters';
  END IF;

  UPDATE branches
  SET delivery_radius_m = radius_meters,
      delivery_boundary = ST_Buffer(coordinates::geography, radius_meters)::geometry,
      updated_at = NOW()
  WHERE id = target_branch AND is_active;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_branch_delivery_radius(UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_branch_delivery_radius_service(target_branch UUID, radius_meters INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF radius_meters < 500 OR radius_meters > 30000 THEN RAISE EXCEPTION 'Radius must be between 500 and 30000 meters'; END IF;
  UPDATE branches SET delivery_radius_m = radius_meters,
    delivery_boundary = ST_Buffer(coordinates::geography, radius_meters)::geometry,
    updated_at = NOW()
  WHERE id = target_branch AND is_active;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_branch_delivery_radius_service(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_branch_delivery_radius_service(UUID, INTEGER) TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- SEED BRANCHES
INSERT INTO branches (name, slug, region, phone_primary, phone_chicken, phone_pizza, has_split_kitchen, address_description, coordinates, delivery_boundary)
VALUES
('Eastleigh Jam', 'eastleigh-jam', 'Eastleigh', '0726744444', '0726744444', '0720456789', TRUE, 'Jam Street, Eastleigh', ST_SetSRID(ST_MakePoint(36.8524, -1.2758), 4326), ST_SetSRID(ST_GeomFromText('POLYGON((36.848 -1.272, 36.856 -1.272, 36.856 -1.280, 36.848 -1.280, 36.848 -1.272))'), 4326)),
('Eastleigh 4th Street', 'eastleigh-4th-street', 'Eastleigh', '0720411111', '0720411111', NULL, FALSE, '4th Street, Eastleigh', ST_SetSRID(ST_MakePoint(36.8501, -1.2742), 4326), NULL),
('Eastleigh Donbosco', 'eastleigh-donbosco', 'Eastleigh', '0717666622', '0717666622', NULL, FALSE, 'Near Don Bosco Centre', ST_SetSRID(ST_MakePoint(36.8550, -1.2730), 4326), NULL),
('Eastleigh Juja B', 'eastleigh-juja-b', 'Eastleigh', '0728333366', '0728333366', '0728999977', TRUE, 'Juja B Road', ST_SetSRID(ST_MakePoint(36.8580, -1.2710), 4326), NULL),
('Eastleigh Nova', 'eastleigh-nova', 'Eastleigh', '0728999966', '0728999966', NULL, FALSE, 'Nova Area', ST_SetSRID(ST_MakePoint(36.8533, -1.2770), 4326), NULL),
('Eastleigh Section 3', 'eastleigh-section-3', 'Eastleigh', '0728333355', '0728333355', '0116999922', TRUE, 'Section 3, Eastleigh', ST_SetSRID(ST_MakePoint(36.8560, -1.2790), 4326), NULL),
('Eastleigh 6th Street', 'eastleigh-6th-street', 'Eastleigh', '0116999933', '0116999933', NULL, FALSE, '6th Street, Eastleigh', ST_SetSRID(ST_MakePoint(36.8488, -1.2755), 4326), NULL),
('Eastleigh 5th', 'eastleigh-5th', 'Eastleigh', '0142343434', '0142343434', '0718222277', TRUE, '5th Street, Eastleigh', ST_SetSRID(ST_MakePoint(36.8495, -1.2760), 4326), NULL),
('South C', 'south-c', 'South C', '0704878787', '0704878787', NULL, FALSE, 'Near Muhoho Avenue', ST_SetSRID(ST_MakePoint(36.8315, -1.3204), 4326), ST_SetSRID(ST_GeomFromText('POLYGON((36.820 -1.310, 36.845 -1.310, 36.845 -1.335, 36.820 -1.335, 36.820 -1.310))'), 4326)),
('James Gichuru', 'james-gichuru', 'Lavington', '0728449999', '0728449999', '0717994444', TRUE, 'James Gichuru Road', ST_SetSRID(ST_MakePoint(36.7712, -1.2721), 4326), NULL),
('Hurlingham', 'hurlingham', 'Hurlingham', '0142353535', '0142353535', NULL, FALSE, 'Argwings Kodhek Road', ST_SetSRID(ST_MakePoint(36.7924, -1.2952), 4326), NULL),
('Muthangari', 'muthangari', 'Muthangari', '0728666663', '0728666663', '0718244444', TRUE, 'Muthangari Drive', ST_SetSRID(ST_MakePoint(36.7663, -1.2638), 4326), NULL),
('Bamburi', 'bamburi', 'Mombasa', '0117000044', '0117000044', NULL, FALSE, 'Bamburi Main Road', ST_SetSRID(ST_MakePoint(39.7145, -4.0152), 4326), NULL);

-- SEED CATEGORIES
INSERT INTO menu_categories (name, slug, sort_order) VALUES
('Fried Chicken', 'fried-chicken', 1),
('Wings', 'wings', 2),
('Burgers', 'burgers', 3),
('Shawarma', 'shawarma', 4),
('Pizza', 'pizza', 5),
('Sides', 'sides', 6),
('Hot Drinks', 'hot-drinks', 7),
('Milkshakes', 'milkshakes', 8);

-- SEED ITEMS
INSERT INTO menu_items (category_id, name, slug, description, base_price, kitchen_dept) VALUES
((SELECT id FROM menu_categories WHERE slug = 'fried-chicken'), '2 Pieces with Chips', '2-pieces-chips', 'Signature fried chicken served with golden chips.', 400, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'fried-chicken'), '3 Pieces with Chips', '3-pieces-chips', 'Signature fried chicken served with golden chips.', 500, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'fried-chicken'), '5 Pieces with Chips', '5-pieces-chips', '5 pieces signature chicken with golden chips.', 750, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'fried-chicken'), '7 Pieces with Chips and 1.2L Soda', '7-pieces-chips-soda', '7 pieces served with regular chips and 1.2L soda.', 1000, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'fried-chicken'), '9 Piece Bucket', '9-piece-bucket', '9 pieces chicken, 2 large chips, 4 wings, and 2L soda.', 1800, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'fried-chicken'), 'Family Meal', 'family-meal', '1 Pizza, 6 pieces fried chicken, 2 large chips, 2L soda.', 2800, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'burgers'), 'Classic Burger', 'classic-burger', 'Crispy chicken patty with lettuce and special mayo.', 400, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'burgers'), 'Double Burger', 'double-burger', 'Double crispy patty layered with cheese and fresh garnish.', 550, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'burgers'), 'Classic Burger Meal', 'classic-burger-meal', 'Burger served with chips and 500ml soda or juice.', 550, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'burgers'), 'Double Burger Meal', 'double-burger-meal', 'Double burger served with chips and 500ml soda or juice.', 650, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'wings'), '5 Wings with Chips and Soda', '5-wings-chips', 'Crispy wings with chips and 350ml soda.', 300, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'wings'), '5 BBQ Wings with Chips and Soda', '5-bbq-wings-chips', 'Glazed BBQ wings with chips and 350ml soda.', 400, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'wings'), '12 Wings with Large Chips and 1.25L Soda', '12-wings-chips', '12 wings, large chips, and 1.25L soda.', 1000, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'wings'), '12 BBQ Wings with Large Chips and 1.25L Soda', '12-bbq-wings-chips', '12 BBQ wings, large chips, and 1.25L soda.', 1100, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'shawarma'), 'Shawarma Regular', 'shawarma-reg', 'Spiced chicken wrap with garlic tahini.', 250, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'shawarma'), 'Shawarma Large', 'shawarma-lrg', 'Loaded large spiced chicken wrap.', 300, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'pizza'), 'BBQ Steak Pizza', 'bbq-steak-pizza', 'Marinated steak chunks in rich barbecue drizzle with mozzarella.', 600, 'pizza'),
((SELECT id FROM menu_categories WHERE slug = 'pizza'), 'Chicken Tikka Pizza', 'chicken-tikka-pizza', 'Spiced chicken breast chunks, bell peppers, onions, and cheese.', 600, 'pizza'),
((SELECT id FROM menu_categories WHERE slug = 'pizza'), 'Meat Deluxe Pizza', 'meat-deluxe-pizza', 'Loaded with spiced beef, chicken bits, pepperoni, and rich cheese.', 700, 'pizza'),
((SELECT id FROM menu_categories WHERE slug = 'sides'), 'Chips Regular', 'chips-regular', 'Freshly sliced deep-fried potato chips.', 200, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'sides'), 'Chips Large', 'chips-large', 'Large portion of golden crisp potato chips.', 300, 'chicken');

INSERT INTO menu_items (category_id, name, slug, description, base_price, kitchen_dept) VALUES
((SELECT id FROM menu_categories WHERE slug = 'fried-chicken'), '4 Pieces with Chips', '4-pieces-chips', 'Signature fried chicken served with golden chips.', 650, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'fried-chicken'), '6 Pieces with Chips', '6-pieces-chips', 'Six pieces of signature fried chicken served with golden chips.', 900, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'wings'), '7 Regular Wings', '7-regular-wings', 'Seven crispy regular chicken wings.', 500, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'wings'), '7 BBQ Wings', '7-bbq-wings', 'Seven wings glazed in Starlight BBQ sauce.', 600, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'wings'), '9 Regular Wings', '9-regular-wings', 'Nine crispy regular chicken wings.', 800, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'wings'), '9 BBQ Wings', '9-bbq-wings', 'Nine wings glazed in Starlight BBQ sauce.', 900, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'wings'), '5 Regular Wings', '5-regular-wings', 'Five crispy regular chicken wings.', 300, 'chicken'),
((SELECT id FROM menu_categories WHERE slug = 'pizza'), 'Hawaiian Pizza', 'hawaiian-pizza', 'Chicken, pineapple and mozzarella.', 600, 'pizza'),
((SELECT id FROM menu_categories WHERE slug = 'pizza'), 'Veggie Feast Pizza', 'veggie-feast-pizza', 'Capsicum, mushroom, onion, olives and sweetcorn.', 600, 'pizza'),
((SELECT id FROM menu_categories WHERE slug = 'pizza'), 'Chicken BBQ Pizza', 'chicken-bbq-pizza', 'Chicken, red onion, smoky sauce and mozzarella.', 600, 'pizza'),
((SELECT id FROM menu_categories WHERE slug = 'milkshakes'), 'Milkshake', 'milkshake', 'Freshly blended milkshake.', 200, 'drinks'),
((SELECT id FROM menu_categories WHERE slug = 'hot-drinks'), 'Chai Dawa', 'chai-dawa', 'Spiced chai dawa served hot.', 200, 'drinks'),
((SELECT id FROM menu_categories WHERE slug = 'hot-drinks'), 'Caramel Latte', 'caramel-latte', 'Smooth caramel espresso with steamed milk.', 250, 'drinks');

-- SEED PIZZA VARIANTS
INSERT INTO menu_item_variants (menu_item_id, variant_name, price_override, sort_order)
SELECT id, 'Regular', 600, 1 FROM menu_items WHERE slug = 'bbq-steak-pizza'
UNION ALL SELECT id, 'Medium', 800, 2 FROM menu_items WHERE slug = 'bbq-steak-pizza'
UNION ALL SELECT id, 'Large', 1000, 3 FROM menu_items WHERE slug = 'bbq-steak-pizza'
UNION ALL SELECT id, 'Mega', 1300, 4 FROM menu_items WHERE slug = 'bbq-steak-pizza'
UNION ALL SELECT id, 'Regular', 700, 1 FROM menu_items WHERE slug = 'meat-deluxe-pizza'
UNION ALL SELECT id, 'Medium', 900, 2 FROM menu_items WHERE slug = 'meat-deluxe-pizza'
UNION ALL SELECT id, 'Large', 1100, 3 FROM menu_items WHERE slug = 'meat-deluxe-pizza'
UNION ALL SELECT id, 'Mega', 1400, 4 FROM menu_items WHERE slug = 'meat-deluxe-pizza';
INSERT INTO menu_item_variants (menu_item_id, variant_name, price_override, sort_order)
SELECT item.id, size.variant_name, size.price_override, size.sort_order
FROM menu_items item
CROSS JOIN (VALUES ('Regular', 600::DECIMAL, 1), ('Medium', 800::DECIMAL, 2), ('Large', 1000::DECIMAL, 3), ('Mega', 1300::DECIMAL, 4)) AS size(variant_name, price_override, sort_order)
WHERE item.slug IN ('hawaiian-pizza', 'veggie-feast-pizza', 'chicken-bbq-pizza');

INSERT INTO branch_menu_stock (branch_id, menu_item_id, is_available)
SELECT branch.id, item.id, TRUE FROM branches branch CROSS JOIN menu_items item
ON CONFLICT (branch_id, menu_item_id) DO NOTHING;

-- Staff authorization helpers. Roles are stored in user_profiles, never supplied by the browser.
CREATE OR REPLACE FUNCTION public.has_staff_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles p
    WHERE p.user_id = auth.uid() AND p.is_active AND p.role = ANY(required_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_can_access_branch(target_branch UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles p
    WHERE p.user_id = auth.uid() AND p.is_active
      AND (p.role = 'super_admin' OR p.branch_id = target_branch)
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_assigned_to_order(target_order TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles p
    JOIN delivery_riders r ON r.user_id = p.user_id AND r.is_active
    JOIN order_deliveries d ON d.rider_id = r.id
    WHERE p.user_id = auth.uid() AND p.is_active AND p.role = 'rider'
      AND d.order_id = target_order
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_can_view_order(target_order TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = target_order AND (
      public.has_staff_role(ARRAY['super_admin']) OR
      (public.staff_can_access_branch(o.branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch','kitchen','pos'])) OR
      public.staff_assigned_to_order(o.id)
    )
  );
$$;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_menu_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_self_or_super_admin" ON user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_staff_role(ARRAY['super_admin']));
CREATE POLICY "active_branches_are_public" ON branches FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "super_admin_updates_branches" ON branches FOR UPDATE TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin']));
CREATE POLICY "menu_categories_are_public" ON menu_categories FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "available_menu_items_are_public" ON menu_items FOR SELECT TO anon, authenticated USING (is_available);
CREATE POLICY "super_admin_manages_menu_items" ON menu_items FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin']));
CREATE POLICY "available_variants_are_public" ON menu_item_variants FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM menu_items m WHERE m.id = menu_item_id AND m.is_available));
CREATE POLICY "super_admin_manages_menu_variants" ON menu_item_variants FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin']));

CREATE POLICY "customers_can_create_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "customers_can_add_order_items" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "staff_can_read_orders" ON orders FOR SELECT TO authenticated
  USING (
    public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch','kitchen','pos'])) OR
    public.staff_assigned_to_order(id)
  );
CREATE POLICY "staff_can_update_orders" ON orders FOR UPDATE TO authenticated
  USING (
    public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch','kitchen']))
  )
  WITH CHECK (
    public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch','kitchen']))
  );
CREATE POLICY "staff_can_read_order_items" ON order_items FOR SELECT TO authenticated
  USING (public.staff_can_view_order(order_id));
CREATE POLICY "staff_can_read_deliveries" ON order_deliveries FOR SELECT TO authenticated
  USING (public.staff_can_view_order(order_id));
CREATE POLICY "dispatch_can_manage_deliveries" ON order_deliveries FOR ALL TO authenticated
  USING (
    public.has_staff_role(ARRAY['super_admin']) OR
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND public.staff_can_access_branch(o.branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch']))
  )
  WITH CHECK (
    public.has_staff_role(ARRAY['super_admin']) OR
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND public.staff_can_access_branch(o.branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch']))
  );
CREATE POLICY "riders_read_self_or_branch_riders" ON delivery_riders FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch']))
  );
CREATE POLICY "branch_managers_manage_riders" ON delivery_riders FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin']) OR (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager'])))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']) OR (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager'])));
CREATE POLICY "public_reads_available_stock" ON branch_menu_stock FOR SELECT TO anon, authenticated USING (is_available);
CREATE POLICY "branch_staff_manage_stock" ON branch_menu_stock FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin']) OR (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager'])))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']) OR (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager'])));

REVOKE UPDATE ON orders FROM anon, authenticated;
GRANT UPDATE (status, updated_at) ON orders TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE order_deliveries;
