export type FeePayment = {
  id: number;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
};

export type RegistrationRecord = {
  id: number;
  reg_no: string | null;
  name: string;
  whatsapp_number: string;
  email_id: string;
  course_selected: string | null;
  qualification: string;
  current_status: string | null;
  last_institution_attended: string | null;
  place: string;
  date_of_birth: string;
  review_status: "approved" | "under_review";
  created_at: string;
  fee_plan: "monthly_3x" | "one_time";
  total_fee: number;
  total_paid: number;
  pending_fee: number;
  last_payment_date: string | null;
  payment_count: number;
  payment_history: FeePayment[];
};

export type FeeTransaction = {
  id: number;
  registration_id: number;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  reg_no: string | null;
  name: string;
  whatsapp_number: string;
};

export type AllowlistRecord = {
  id: number;
  name: string;
  whatsapp_number: string;
  created_at: string;
};

export type AdminTab =
  | "overview"
  | "brochure_requests"
  | "allowlist"
  | "registrations"
  | "fees";

export type BrochureRequestRecord = {
  id: number;
  name: string;
  phone_number: string;
  offer_type: "HR" | "DIGITAL_MARKETING";
  created_at: string;
};

export type NotificationRequestRecord = {
  id: number;
  email: string;
  created_at: string;
  sent_count: number;
  last_sent_at: string | null;
};

export type SmtpSettings = {
  host: string;
  port: string;
  user: string;
  source: "custom" | "env" | "unset";
  password_set: boolean;
};
