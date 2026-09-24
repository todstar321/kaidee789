export type StoreType = 'alacarte' | 'buffet' | 'hybrid';
export type PlanType = 'free' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly' | 'lifetime';
export type TableStatus = 'available' | 'occupied' | 'billing_requested';
export type ServiceCallType = 'call_waiter' | 'call_bill' | null;
export type OrderItemStatus = 'pending' | 'cooking' | 'ready' | 'served' | 'cancelled';
export type StaffRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'waiter';

export interface BuffetTier {
  id: string;
  store_id: string;
  name: string; // e.g. "Standard 399", "Premium 499"
  price: number;
  description: string;
  color: string;
  sort_order: number;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  type: StoreType;
  logo_url: string;
  cover_url?: string;
  phone: string;
  address: string;
  promptpay_number: string;
  promptpay_name: string;
  promptpay_qr_url?: string;
  service_charge_percent?: number;
  vat_percent?: number;
  buffet_duration_mins: number; // e.g. 120
  plan_id: PlanType;
  plan_billing_type: BillingCycle;
  plan_expires_at: string;
  login_username?: string;
  login_password?: string;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface SubscriptionPlanConfig {
  id: PlanType;
  name: string;
  price_monthly: number;
  price_yearly: number;
  price_lifetime: number;
  max_tables: number;
  features: string[] | string;
  is_active: number;
}

export interface StoreStaff {
  id: string;
  store_id: string;
  name: string;
  pin: string;
  role: StaffRole;
  is_active: number;
}

export interface Table {
  id: string;
  store_id: string;
  table_number: string;
  zone: string;
  capacity: number;
  status: TableStatus;
  current_session_id?: string | null;
  service_call?: ServiceCallType;
  assigned_staff?: string | null;
}

export interface Member {
  id: string;
  store_id: string;
  name: string;
  nickname?: string | null;
  phone: string;
  points: number;
  notes?: string;
  created_at: string;
}

export interface StoreDiscount {
  id: string;
  store_id: string;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  is_active: number;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  store_id: string;
  name: string;
  code: string;
  is_system: number;
  is_active: number;
  sort_order: number;
}

export interface TableSession {
  id: string;
  store_id: string;
  table_id: string;
  opened_at: string;
  closed_at?: string | null;
  guest_count: number;
  buffet_tier_id?: string | null;
  buffet_end_time?: string | null;
  status: 'active' | 'completed' | 'cancelled';
  qr_code_token: string;
  member_id?: string | null;
  member_name?: string | null;
  member_nickname?: string | null;
  member_phone?: string | null;
}

export interface Guest {
  id: string;
  session_id: string;
  guest_code: string; // "A", "B", "C"
  guest_label: string; // "โต๊ะ 1-A", "โต๊ะ 1-B"
  nickname: string; // e.g. "ต้น"
  joined_at: string;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  icon?: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  cost_price: number; // ต้นทุน สำหรับคำนวณกำไร
  cooking_time_mins?: number; // ระยะเวลาทำอาหาร (นาที)
  image_url: string;
  is_available: number;
  min_buffet_tier_id?: string | null; // e.g. require tier_premium or above
  options_json?: string; // JSON array of options
}

export interface OrderItem {
  id: string;
  order_id: string;
  session_id: string;
  guest_id: string;
  guest_label?: string;
  guest_nickname?: string;
  menu_item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  cost_price: number;
  cooking_time_mins?: number;
  selected_options?: string;
  notes?: string;
  status: OrderItemStatus;
  customer_received: number; // 0 or 1 checklist
  created_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  session_id: string;
  table_id: string;
  order_number: string;
  status: 'pending' | 'cooking' | 'ready' | 'served' | 'cancelled';
  total_amount: number;
  created_at: string;
  items?: OrderItem[];
}

export interface SubscriptionPayment {
  id: string;
  store_id: string;
  store_name?: string;
  plan_id: PlanType;
  billing_cycle: BillingCycle;
  amount: number;
  slip_url: string;
  slip_time: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_notes?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  store_id: string;
  session_id: string;
  table_id: string;
  table_number?: string;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  service_charge: number;
  grand_total: number;
  payment_method: string;
  cash_received: number;
  change_given: number;
  paid_at: string;
  staff_name?: string;
  member_id?: string | null;
  member_name?: string | null;
  discount_details?: string;
}

export interface Expense {
  id: string;
  store_id: string;
  date: string; // YYYY-MM-DD
  category: string; // e.g. "วัตถุดิบ/ของสด", "ค่าน้ำแข็ง/แก๊ส", "ค่าแรงรายวัน", "อื่นๆ"
  title: string;
  amount: number;
  receipt_url?: string;
  notes?: string;
  created_at: string;
}

export interface SuperAdmin {
  id: string;
  username: string;
  name: string;
  role: 'owner' | 'assistant';
  permissions: string[];
}
