/*
# Body Garage Fitness Club - Membership Tracker schema

## Summary
Creates the core tables for an internal staff-only gym membership tracker:
- `clients`: every member of the gym, with gym-package and optional personal-training
  package details. Expiry dates are stored (computed from start + duration) so they can
  be queried efficiently, while "days remaining" is computed live in the app.
- `renewals_log`: an audit trail of every package renewal, recording the previous and
  new expiry dates, the amount paid, and which trainer processed the renewal.

## Tables

### clients
- id              uuid primary key, default gen_random_uuid()
- full_name       text, not null
- phone           text, not null
- email           text, nullable
- join_date       date, not null
- gym_package_type        text (e.g. Monthly, Quarterly, Half-Yearly, Annual)
- gym_package_start_date  date, not null
- gym_package_duration_days integer, not null
- gym_package_expiry_date date, not null (stored = start_date + duration_days)
- gym_package_price       numeric, nullable
- has_personal_training   boolean, default false
- pt_trainer              text, nullable (one of the fixed trainer list)
- pt_package_name         text, nullable
- pt_package_start_date   date, nullable
- pt_package_duration_days integer, nullable
- pt_package_expiry_date  date, nullable (stored = pt start + duration)
- pt_package_price        numeric, nullable
- notes                   text, nullable
- created_at              timestamptz, default now()
- updated_at              timestamptz, default now()

### renewals_log
- id                 uuid primary key, default gen_random_uuid()
- client_id          uuid, foreign key -> clients(id) on delete cascade
- renewed_on         date, not null
- package_kind       text, not null ('gym' or 'personal_training')
- previous_expiry_date date, nullable
- new_expiry_date    date, not null
- amount_paid        numeric, nullable
- renewed_by         text (trainer name)
- created_at         timestamptz, default now()

## Triggers
- `set_clients_updated_at`: bumps clients.updated_at on every UPDATE.
- `set_clients_gym_expiry`: on INSERT/UPDATE of gym start or duration, recomputes
  gym_package_expiry_date = start_date + duration_days.
- `set_clients_pt_expiry`: on INSERT/UPDATE of pt start or duration, recomputes
  pt_package_expiry_date = pt_start_date + pt_duration_days (null if either null).

## Security
- RLS enabled on both tables.
- Policies scoped TO authenticated (this app has a single shared login; no anon access).
- clients: authenticated can select/insert/update/delete all rows (shared staff tool).
- renewals_log: authenticated can select/insert; updates/deletes not needed.
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  trainer_assigned text,
  join_date date NOT NULL,
  gym_package_type text,
  gym_package_start_date date NOT NULL,
  gym_package_duration_days integer NOT NULL,
  gym_package_expiry_date date NOT NULL,
  gym_package_price numeric,
  has_personal_training boolean NOT NULL DEFAULT false,
  pt_trainer text,
  pt_package_name text,
  pt_package_start_date date,
  pt_package_duration_days integer,
  pt_package_expiry_date date,
  pt_package_price numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_clients" ON clients;
CREATE POLICY "auth_select_clients" ON clients FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_clients" ON clients;
CREATE POLICY "auth_insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_clients" ON clients;
CREATE POLICY "auth_update_clients" ON clients FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_clients" ON clients;
CREATE POLICY "auth_delete_clients" ON clients FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS renewals_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  renewed_on date NOT NULL,
  package_kind text NOT NULL CHECK (package_kind IN ('gym', 'personal_training')),
  previous_expiry_date date,
  new_expiry_date date NOT NULL,
  amount_paid numeric,
  renewed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE renewals_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_renewals" ON renewals_log;
CREATE POLICY "auth_select_renewals" ON renewals_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_renewals" ON renewals_log;
CREATE POLICY "auth_insert_renewals" ON renewals_log FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS clients_gym_expiry_idx ON clients(gym_package_expiry_date);
CREATE INDEX IF NOT EXISTS clients_pt_expiry_idx ON clients(pt_package_expiry_date);
CREATE INDEX IF NOT EXISTS renewals_log_client_idx ON renewals_log(client_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- gym expiry trigger
CREATE OR REPLACE FUNCTION set_gym_expiry()
RETURNS trigger AS $$
BEGIN
  NEW.gym_package_expiry_date = (NEW.gym_package_start_date + (NEW.gym_package_duration_days || ' days')::interval)::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_gym_expiry ON clients;
CREATE TRIGGER trg_clients_gym_expiry
BEFORE INSERT OR UPDATE OF gym_package_start_date, gym_package_duration_days ON clients
FOR EACH ROW EXECUTE FUNCTION set_gym_expiry();

-- pt expiry trigger
CREATE OR REPLACE FUNCTION set_pt_expiry()
RETURNS trigger AS $$
BEGIN
  IF NEW.has_personal_training AND NEW.pt_package_start_date IS NOT NULL AND NEW.pt_package_duration_days IS NOT NULL THEN
    NEW.pt_package_expiry_date = (NEW.pt_package_start_date + (NEW.pt_package_duration_days || ' days')::interval)::date;
  ELSE
    NEW.pt_package_expiry_date = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_pt_expiry ON clients;
CREATE TRIGGER trg_clients_pt_expiry
BEFORE INSERT OR UPDATE OF pt_package_start_date, pt_package_duration_days, has_personal_training ON clients
FOR EACH ROW EXECUTE FUNCTION set_pt_expiry();
