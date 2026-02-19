-- Run this SQL in your Supabase SQL Editor to create the database tables

-- Orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number serial,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Order items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  size text NOT NULL CHECK (size IN ('small', 'large')),
  temperature text NOT NULL CHECK (temperature IN ('hot', 'iced', 'n/a')),
  milk_type text DEFAULT 'none' CHECK (milk_type IN ('whole', 'skim', 'oat', 'almond', 'none')),
  sweetness text DEFAULT 'normal' CHECK (sweetness IN ('no_sugar', 'less_sugar', 'normal', 'extra_sugar', 'n/a')),
  ice_level text DEFAULT 'normal' CHECK (ice_level IN ('no_ice', 'less_ice', 'normal', 'extra_ice', 'n/a')),
  extra_shots integer NOT NULL DEFAULT 0,
  syrups jsonb NOT NULL DEFAULT '[]',
  item_price numeric(10,2) NOT NULL,
  modifiers_price numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster order lookups
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Enable Realtime for the orders table (used by barista view)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- ============================================================
-- Order Modifications (run these in Supabase SQL Editor for existing deployments)
-- ============================================================

-- Add is_modified flag to orders table
ALTER TABLE orders ADD COLUMN is_modified boolean NOT NULL DEFAULT false;

-- Order modifications table — stores diff history for barista view
-- order_items are updated in-place (so analytics always reflect final state),
-- while this table records what changed (so barista can see the diff).
CREATE TABLE order_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  modification_type text NOT NULL DEFAULT 'change' CHECK (modification_type IN ('change', 'add')),
  field_name text,          -- e.g. 'sweetness', 'syrups' (for 'change' type)
  old_value text,           -- JSON-stringified old value (for 'change' type)
  new_value text,           -- JSON-stringified new value (for 'change' type)
  item_description text,    -- e.g. 'Small Hot Latte' (for 'add' type)
  modified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_modifications_order_id ON order_modifications(order_id);
ALTER PUBLICATION supabase_realtime ADD TABLE order_modifications;
