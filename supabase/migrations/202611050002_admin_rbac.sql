CREATE OR REPLACE FUNCTION public.has_staff_role(required_roles TEXT[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.user_id = auth.uid() AND p.is_active AND p.role = ANY(required_roles)
); $$;

CREATE OR REPLACE FUNCTION public.staff_can_access_branch(target_branch UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.user_id = auth.uid() AND p.is_active
    AND (p.role = 'super_admin' OR p.branch_id = target_branch)
); $$;

CREATE OR REPLACE FUNCTION public.staff_assigned_to_order(target_order TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM user_profiles p
  JOIN delivery_riders r ON r.user_id = p.user_id AND r.is_active
  JOIN order_deliveries d ON d.rider_id = r.id
  WHERE p.user_id = auth.uid() AND p.is_active AND p.role = 'rider' AND d.order_id = target_order
); $$;

CREATE OR REPLACE FUNCTION public.staff_can_view_order(target_order TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM orders o WHERE o.id = target_order AND (
    public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(o.branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch','kitchen','pos'])) OR
    public.staff_assigned_to_order(o.id)
  )
); $$;

CREATE OR REPLACE FUNCTION public.admin_set_branch_delivery_radius(target_branch UUID, radius_meters INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_staff_role(ARRAY['super_admin']) THEN RAISE EXCEPTION 'Super admin role required'; END IF;
  IF radius_meters < 500 OR radius_meters > 30000 THEN RAISE EXCEPTION 'Radius must be between 500 and 30000 meters'; END IF;
  UPDATE branches SET delivery_radius_m = radius_meters,
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

DROP POLICY IF EXISTS profiles_read_self_or_super_admin ON user_profiles;
CREATE POLICY profiles_read_self_or_super_admin ON user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_staff_role(ARRAY['super_admin']));

DROP POLICY IF EXISTS active_branches_are_public ON branches;
CREATE POLICY active_branches_are_public ON branches FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS super_admin_updates_branches ON branches;
CREATE POLICY super_admin_updates_branches ON branches FOR UPDATE TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin']));

DROP POLICY IF EXISTS menu_categories_are_public ON menu_categories;
CREATE POLICY menu_categories_are_public ON menu_categories FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS available_menu_items_are_public ON menu_items;
CREATE POLICY available_menu_items_are_public ON menu_items FOR SELECT TO anon, authenticated USING (is_available);
DROP POLICY IF EXISTS super_admin_manages_menu_items ON menu_items;
CREATE POLICY super_admin_manages_menu_items ON menu_items FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin']));
DROP POLICY IF EXISTS available_variants_are_public ON menu_item_variants;
CREATE POLICY available_variants_are_public ON menu_item_variants FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM menu_items m WHERE m.id = menu_item_id AND m.is_available));
DROP POLICY IF EXISTS super_admin_manages_menu_variants ON menu_item_variants;
CREATE POLICY super_admin_manages_menu_variants ON menu_item_variants FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin']));

DROP POLICY IF EXISTS customers_can_create_orders ON orders;
CREATE POLICY customers_can_create_orders ON orders FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS customers_can_add_order_items ON order_items;
CREATE POLICY customers_can_add_order_items ON order_items FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS staff_can_read_orders ON orders;
CREATE POLICY staff_can_read_orders ON orders FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch','kitchen','pos'])) OR
    public.staff_assigned_to_order(id));
DROP POLICY IF EXISTS staff_can_update_orders ON orders;
CREATE POLICY staff_can_update_orders ON orders FOR UPDATE TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch','kitchen'])))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch','kitchen'])));
DROP POLICY IF EXISTS staff_can_read_order_items ON order_items;
CREATE POLICY staff_can_read_order_items ON order_items FOR SELECT TO authenticated
  USING (public.staff_can_view_order(order_id));
DROP POLICY IF EXISTS staff_can_read_deliveries ON order_deliveries;
CREATE POLICY staff_can_read_deliveries ON order_deliveries FOR SELECT TO authenticated
  USING (public.staff_can_view_order(order_id));
DROP POLICY IF EXISTS dispatch_can_manage_deliveries ON order_deliveries;
CREATE POLICY dispatch_can_manage_deliveries ON order_deliveries FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin']) OR EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_id AND public.staff_can_access_branch(o.branch_id)
      AND public.has_staff_role(ARRAY['branch_manager','dispatch'])
  ))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']) OR EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_id AND public.staff_can_access_branch(o.branch_id)
      AND public.has_staff_role(ARRAY['branch_manager','dispatch'])
  ));
DROP POLICY IF EXISTS riders_read_self_or_branch_riders ON delivery_riders;
CREATE POLICY riders_read_self_or_branch_riders ON delivery_riders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager','dispatch'])));
DROP POLICY IF EXISTS branch_managers_manage_riders ON delivery_riders;
CREATE POLICY branch_managers_manage_riders ON delivery_riders FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager'])))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager'])));
DROP POLICY IF EXISTS public_reads_available_stock ON branch_menu_stock;
CREATE POLICY public_reads_available_stock ON branch_menu_stock FOR SELECT TO anon, authenticated USING (is_available);
DROP POLICY IF EXISTS branch_staff_manage_stock ON branch_menu_stock;
CREATE POLICY branch_staff_manage_stock ON branch_menu_stock FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager'])))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']) OR
    (public.staff_can_access_branch(branch_id) AND public.has_staff_role(ARRAY['branch_manager'])));

REVOKE UPDATE ON orders FROM anon, authenticated;
GRANT UPDATE (status, updated_at) ON orders TO authenticated;

INSERT INTO branch_menu_stock (branch_id, menu_item_id, is_available)
SELECT branch.id, item.id, TRUE FROM branches branch CROSS JOIN menu_items item
ON CONFLICT (branch_id, menu_item_id) DO NOTHING;
