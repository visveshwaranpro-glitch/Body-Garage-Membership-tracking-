CREATE OR REPLACE FUNCTION set_gym_expiry()
RETURNS trigger AS $$
BEGIN
  NEW.gym_package_expiry_date = CASE NEW.gym_package_type
    WHEN 'Monthly' THEN (NEW.gym_package_start_date + INTERVAL '1 month')::date
    WHEN 'Quarterly' THEN (NEW.gym_package_start_date + INTERVAL '3 months')::date
    WHEN 'Half-Yearly' THEN (NEW.gym_package_start_date + INTERVAL '6 months')::date
    WHEN 'Annual' THEN (NEW.gym_package_start_date + INTERVAL '12 months')::date
    ELSE (NEW.gym_package_start_date + (NEW.gym_package_duration_days || ' days')::interval)::date
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_gym_expiry ON clients;
CREATE TRIGGER trg_clients_gym_expiry
BEFORE INSERT OR UPDATE OF gym_package_type, gym_package_start_date, gym_package_duration_days ON clients
FOR EACH ROW EXECUTE FUNCTION set_gym_expiry();

UPDATE clients
SET
  gym_package_expiry_date = CASE gym_package_type
    WHEN 'Monthly' THEN (gym_package_start_date + INTERVAL '1 month')::date
    WHEN 'Quarterly' THEN (gym_package_start_date + INTERVAL '3 months')::date
    WHEN 'Half-Yearly' THEN (gym_package_start_date + INTERVAL '6 months')::date
    WHEN 'Annual' THEN (gym_package_start_date + INTERVAL '12 months')::date
    ELSE gym_package_expiry_date
  END,
  gym_package_duration_days = CASE gym_package_type
    WHEN 'Monthly' THEN ((gym_package_start_date + INTERVAL '1 month')::date - gym_package_start_date)
    WHEN 'Quarterly' THEN ((gym_package_start_date + INTERVAL '3 months')::date - gym_package_start_date)
    WHEN 'Half-Yearly' THEN ((gym_package_start_date + INTERVAL '6 months')::date - gym_package_start_date)
    WHEN 'Annual' THEN ((gym_package_start_date + INTERVAL '12 months')::date - gym_package_start_date)
    ELSE gym_package_duration_days
  END
WHERE gym_package_type IN ('Monthly', 'Quarterly', 'Half-Yearly', 'Annual');

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS has_class_package boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS class_type text,
  ADD COLUMN IF NOT EXISTS class_start_date date,
  ADD COLUMN IF NOT EXISTS class_duration_days integer,
  ADD COLUMN IF NOT EXISTS class_expiry_date date,
  ADD COLUMN IF NOT EXISTS class_price numeric;

CREATE OR REPLACE FUNCTION set_class_expiry()
RETURNS trigger AS $$
BEGIN
  IF NEW.has_class_package AND NEW.class_start_date IS NOT NULL AND NEW.class_duration_days IS NOT NULL THEN
    NEW.class_expiry_date = (NEW.class_start_date + (NEW.class_duration_days || ' days')::interval)::date;
  ELSE
    NEW.class_expiry_date = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_class_expiry ON clients;
CREATE TRIGGER trg_clients_class_expiry
BEFORE INSERT OR UPDATE OF has_class_package, class_start_date, class_duration_days ON clients
FOR EACH ROW EXECUTE FUNCTION set_class_expiry();