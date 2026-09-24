export type StoreType = 'alacarte' | 'buffet' | 'hybrid';
export type PlanType = 'free' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly' | 'lifetime';
export type TableStatus = 'available' | 'occupied' | 'billing_requested';
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
  buffet_duration_mins: number; // e.g. 120
  plan_id: PlanType;
  plan_billing_type: BillingCycle;
  plan_expires_at: string;
  status: 'active' | 'suspended';
  created_at: string;
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
  payment_method: 'cash' | 'promptpay' | 'card';
  cash_received: number;
  change_given: number;
  paid_at: string;
  staff_name?: string;
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
