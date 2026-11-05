ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS average_prep_minutes INT NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS average_delivery_minutes INT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS delivery_radius_m INT NOT NULL DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS glovo_address_book_id UUID,
  ADD COLUMN IF NOT EXISTS uber_store_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y(coordinates)) STORED;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_X(coordinates)) STORED;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;

ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'ready';

CREATE TABLE IF NOT EXISTS delivery_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'dispatch', 'kitchen', 'rider', 'pos')),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_deliveries (
  order_id VARCHAR(20) PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES delivery_riders(id) ON DELETE SET NULL,
  rider_name VARCHAR(150),
  rider_phone VARCHAR(20),
  courier_name VARCHAR(100),
  courier_reference VARCHAR(100),
  eta_minutes INT CHECK (eta_minutes IS NULL OR eta_minutes >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE order_deliveries ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES delivery_riders(id) ON DELETE SET NULL;
ALTER TABLE order_deliveries ADD COLUMN IF NOT EXISTS provider VARCHAR(30) NOT NULL DEFAULT 'in_house';
ALTER TABLE order_deliveries ADD COLUMN IF NOT EXISTS tracking_url TEXT;

CREATE TABLE IF NOT EXISTS branch_menu_stock (
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (branch_id, menu_item_id)
);
