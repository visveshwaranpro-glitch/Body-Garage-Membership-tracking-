ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS has_class_package boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS class_type text,
  ADD COLUMN IF NOT EXISTS class_start_date date,
  ADD COLUMN IF NOT EXISTS class_duration_days integer,
  ADD COLUMN IF NOT EXISTS class_expiry_date date,
  ADD COLUMN IF NOT EXISTS class_price numeric;

CREATE TABLE IF NOT EXISTS client_class_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  class_type text NOT NULL CHECK (class_type IN ('Zumba', 'Cross Fit', 'Stretch')),
  start_date date NOT NULL,
  duration_days integer NOT NULL,
  expiry_date date NOT NULL,
  price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, class_type)
);

ALTER TABLE client_class_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_client_class_packages" ON client_class_packages;
CREATE POLICY "auth_select_client_class_packages" ON client_class_packages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_client_class_packages" ON client_class_packages;
CREATE POLICY "auth_insert_client_class_packages" ON client_class_packages FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_client_class_packages" ON client_class_packages;
CREATE POLICY "auth_update_client_class_packages" ON client_class_packages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_client_class_packages" ON client_class_packages;
CREATE POLICY "auth_delete_client_class_packages" ON client_class_packages FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION set_class_package_expiry()
RETURNS trigger AS $$
BEGIN
  NEW.expiry_date = (NEW.start_date + (NEW.duration_days || ' days')::interval)::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_class_package_expiry ON client_class_packages;
CREATE TRIGGER trg_client_class_package_expiry
BEFORE INSERT OR UPDATE OF start_date, duration_days ON client_class_packages
FOR EACH ROW EXECUTE FUNCTION set_class_package_expiry();

INSERT INTO client_class_packages (client_id, class_type, start_date, duration_days, expiry_date, price)
SELECT c.id, c.class_type, c.class_start_date, c.class_duration_days, c.class_expiry_date, c.class_price
FROM clients AS c
WHERE c.has_class_package
  AND c.class_type IS NOT NULL
  AND c.class_start_date IS NOT NULL
  AND c.class_duration_days IS NOT NULL
ON CONFLICT (client_id, class_type) DO NOTHING;
