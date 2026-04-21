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
  learning_mode: string | null;
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
  | "admin_management"
  | "brochure_requests"
  | "webinar_registrations"
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

export type WebinarRegistrationRecord = {
  id: number;
  name: string;
  phone_number: string;
  email_id: string;
  qualification: "12" | "Degree" | "PG" | "Other";
  webinar_id: number | null;
  webinar_title: string | null;
  webinar_date: string | null;
  webinar_time: string | null;
  created_at: string;
};

export type WebinarRecord = {
  id: number;
  slug: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  banner_image_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SmtpSettings = {
  host: string;
  port: string;
  user: string;
  source: "custom" | "env" | "unset";
  password_set: boolean;
};

export type AdminPermission =
  | "overview:view"
  | "overview:manage"
  | "registrations:view"
  | "registrations:manage"
  | "webinar_management:view"
  | "webinar_management:manage"
  | "allowed_students:view"
  | "allowed_students:manage"
  | "brochure_requests:view"
  | "brochure_requests:manage"
  | "fees:view"
  | "fees:manage"
  | "admin_management:view"
  | "admin_management:manage";

export type AdminAuthContext = {
  username: string;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
};

export type ManagedAdminUser = {
  id: number;
  username: string;
  permissions: AdminPermission[];
  is_active: boolean;
  created_at: string;
};
