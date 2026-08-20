ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS gym_paused_at date,
  ADD COLUMN IF NOT EXISTS pt_paused_at date;
