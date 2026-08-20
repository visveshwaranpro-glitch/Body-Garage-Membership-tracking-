ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS gym_paused_at date,
  ADD COLUMN IF NOT EXISTS pt_paused_at date;

ALTER TABLE client_class_packages
  ADD COLUMN IF NOT EXISTS paused_at date;

ALTER TABLE client_class_packages
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE client_class_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_client_class_packages" ON client_class_packages;
CREATE POLICY "auth_select_client_class_packages" ON client_class_packages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_client_class_packages" ON client_class_packages;
CREATE POLICY "auth_insert_client_class_packages" ON client_class_packages
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_client_class_packages" ON client_class_packages;
CREATE POLICY "auth_update_client_class_packages" ON client_class_packages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_client_class_packages" ON client_class_packages;
CREATE POLICY "auth_delete_client_class_packages" ON client_class_packages
  FOR DELETE TO authenticated USING (true);
