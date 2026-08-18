export const TRAINERS = [
  'Karthick (Owner)',
  'Arun',
  'Bala Ganesh',
  'Adhitya',
  'Poorani',
] as const;

export type Trainer = (typeof TRAINERS)[number];

export const PACKAGE_TYPES = [
  'Monthly',
  'Quarterly',
  'Half-Yearly',
  'Annual',
] as const;

export type PackageType = (typeof PACKAGE_TYPES)[number];

export type Client = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  trainer_assigned: string | null;
  join_date: string;
  gym_package_type: string | null;
  gym_package_start_date: string;
  gym_package_duration_days: number;
  gym_package_expiry_date: string;
  gym_package_price: number | null;
  has_personal_training: boolean;
  pt_trainer: string | null;
  pt_package_name: string | null;
  pt_package_start_date: string | null;
  pt_package_duration_days: number | null;
  pt_package_expiry_date: string | null;
  pt_package_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientInput = Omit<Client, 'id' | 'created_at' | 'updated_at' | 'gym_package_expiry_date' | 'pt_package_expiry_date'>;

export type Renewal = {
  id: string;
  client_id: string;
  renewed_on: string;
  package_kind: 'gym' | 'personal_training';
  previous_expiry_date: string | null;
  new_expiry_date: string;
  amount_paid: number | null;
  renewed_by: string | null;
  created_at: string;
};

export type PackageStatus = {
  status: 'active' | 'expiring' | 'expired' | 'none';
  daysRemaining: number | null;
  expiryDate: string | null;
  label: string;
};
