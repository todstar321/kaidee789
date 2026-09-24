import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// Read .env.local if exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v && !process.env[k.trim()]) {
      process.env[k.trim()] = v.trim();
    }
  });
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('❌ กรุณากำหนด TURSO_DATABASE_URL และ TURSO_AUTH_TOKEN ใน .env.local หรือ environment');
  process.exit(1);
}

console.log('🔄 กำลังเชื่อมต่อไปยัง Turso Cloud Database:', url);
const client = createClient({ url, authToken });

async function main() {
  console.log('📦 1. กำลังสร้างตารางฐานข้อมูลบน Turso...');

  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS super_admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT,
      permissions TEXT,
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT,
      slug TEXT UNIQUE,
      type TEXT,
      logo_url TEXT,
      cover_url TEXT,
      phone TEXT,
      address TEXT,
      promptpay_number TEXT,
      promptpay_name TEXT,
      buffet_duration_mins INTEGER DEFAULT 120,
      plan_id TEXT,
      plan_billing_type TEXT,
      plan_expires_at TEXT,
      status TEXT,
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS buffet_tiers (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      price REAL,
      description TEXT,
      color TEXT,
      sort_order INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS store_staff (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      pin TEXT,
      role TEXT,
      is_active INTEGER DEFAULT 1
    );`,
    `CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      table_number TEXT,
      zone TEXT,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'available',
      current_session_id TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS table_sessions (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      table_id TEXT,
      opened_at TEXT,
      closed_at TEXT,
      guest_count INTEGER DEFAULT 1,
      buffet_tier_id TEXT,
      buffet_end_time TEXT,
      status TEXT DEFAULT 'active',
      qr_code_token TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      guest_code TEXT,
      guest_label TEXT,
      nickname TEXT,
      joined_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      category_id TEXT,
      name TEXT,
      description TEXT,
      price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      min_buffet_tier_id TEXT,
      options_json TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      session_id TEXT,
      table_id TEXT,
      order_number TEXT,
      status TEXT DEFAULT 'pending',
      total_amount REAL DEFAULT 0,
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      session_id TEXT,
      guest_id TEXT,
      guest_label TEXT,
      guest_nickname TEXT,
      menu_item_id TEXT,
      item_name TEXT,
      quantity INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      selected_options TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      customer_received INTEGER DEFAULT 0,
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS subscription_payments (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      store_name TEXT,
      plan_id TEXT,
      billing_cycle TEXT,
      amount REAL,
      slip_url TEXT,
      slip_time TEXT,
      status TEXT DEFAULT 'pending',
      reviewer_notes TEXT,
      created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      session_id TEXT,
      table_id TEXT,
      table_number TEXT,
      subtotal REAL,
      discount_amount REAL DEFAULT 0,
      vat_amount REAL DEFAULT 0,
      service_charge REAL DEFAULT 0,
      grand_total REAL,
      payment_method TEXT,
      cash_received REAL DEFAULT 0,
      change_given REAL DEFAULT 0,
      paid_at TEXT,
      staff_name TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      date TEXT,
      category TEXT,
      title TEXT,
      amount REAL,
      receipt_url TEXT,
      notes TEXT,
      created_at TEXT
    );`
  ];

  for (const stmt of schemaStatements) {
    await client.execute(stmt);
  }
  console.log('✅ ตารางทั้งหมดถูกสร้างเรียบร้อยแล้ว');

  // Check if stores exist
  const existingStores = await client.execute('SELECT COUNT(*) as c FROM stores');
  if (Number(existingStores.rows[0].c) > 0) {
    console.log('ℹ️ ฐานข้อมูลมีข้อมูลร้านค้าอยู่แล้ว ข้ามขั้นตอนการ Seed');
    return;
  }

  console.log('🌱 2. กำลัง Seed ข้อมูลร้านค้าตัวอย่าง เมนู โต๊ะ และบัญชีแอดมิน...');
  const now = new Date().toISOString();

  // Super Admin
  await client.execute({
    sql: `INSERT INTO super_admins (id, username, password, name, role, permissions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['sa_1', 'admin', 'admin888', 'คุณธนภัทร (เจ้าของแพลตฟอร์ม)', 'owner', JSON.stringify(['manage_stores', 'manage_plans', 'verify_slips', 'impersonate']), now]
  });

  // Demo Stores
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 45);

  await client.execute({
    sql: `INSERT INTO stores (id, name, slug, type, logo_url, cover_url, phone, address, promptpay_number, promptpay_name, buffet_duration_mins, plan_id, plan_billing_type, plan_expires_at, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'demo-alacarte', 'ร้านกินดี อยู่ดี (ตามสั่ง & อาหารไทย)', 'kindee-alacarte', 'alacarte',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop',
      '089-123-4567', '88/1 ถนนสุขุมวิท กทม.', '0891234567', 'นายสมเกียรติ มั่งมี',
      0, 'pro', 'monthly', expireDate.toISOString(), 'active', now
    ]
  });

  await client.execute({
    sql: `INSERT INTO stores (id, name, slug, type, logo_url, cover_url, phone, address, promptpay_number, promptpay_name, buffet_duration_mins, plan_id, plan_billing_type, plan_expires_at, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'demo-buffet', 'โอชิ ชาบู & บุฟเฟ่ต์ยากินิกุ', 'oshi-buffet', 'buffet',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=400&fit=crop',
      '092-888-9999', '123 ศูนย์การค้าเจปาร์ค พระราม 9 กทม.', '0928889999', 'บจก. โอชิ ฟู้ดส์',
      120, 'enterprise', 'yearly', expireDate.toISOString(), 'active', now
    ]
  });

  // Tiers for buffet
  await client.execute({
    sql: `INSERT INTO buffet_tiers (id, store_id, name, price, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['tier_std', 'demo-buffet', 'Standard Buffet (หมู & ไก่)', 399, 'หมูสไลด์ คุโรบูตะ ผักสด ลูกชิ้น', '#3b82f6', 1]
  });
  await client.execute({
    sql: `INSERT INTO buffet_tiers (id, store_id, name, price, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['tier_prm', 'demo-buffet', 'Premium Buffet (เนื้อริบอาย & ซีฟู้ด)', 499, 'เนื้อวากิวออสเตรเลีย กุ้งแม่น้ำ แซลมอน', '#eab308', 2]
  });

  // Tables
  for (let i = 1; i <= 6; i++) {
    await client.execute({
      sql: `INSERT INTO tables (id, store_id, table_number, zone, capacity, status) VALUES (?, ?, ?, ?, 4, 'available')`,
      args: [`tbl_${i}`, 'demo-alacarte', `โต๊ะ ${i}`, i <= 4 ? 'ห้องแอร์' : 'ระเบียง']
    });
    await client.execute({
      sql: `INSERT INTO tables (id, store_id, table_number, zone, capacity, status) VALUES (?, ?, ?, ?, 4, 'available')`,
      args: [`tbl_b${i}`, 'demo-buffet', `โต๊ะ B${i}`, 'โซนชาบู']
    });
  }

  // Categories
  await client.execute({
    sql: `INSERT INTO categories (id, store_id, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)`,
    args: ['cat_1', 'demo-alacarte', '🔥 เมนูจานด่วนยอดฮิต', 'Flame', 1]
  });
  await client.execute({
    sql: `INSERT INTO categories (id, store_id, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)`,
    args: ['cat_2', 'demo-alacarte', '🍲 เมนูต้ม/แกง/ซุป', 'Soup', 2]
  });

  // Menu Items
  await client.execute({
    sql: `INSERT INTO menu_items (id, store_id, category_id, name, description, price, cost_price, image_url, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    args: ['m1', 'demo-alacarte', 'cat_1', 'ข้าวกะเพราหมูกรอบ + ไข่ดาวกรอบ', 'หมูกรอบทำเอง หนังกรอบฟู พริกแห้งเข้มข้น', 89, 38, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&h=400&fit=crop']
  });
  await client.execute({
    sql: `INSERT INTO menu_items (id, store_id, category_id, name, description, price, cost_price, image_url, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    args: ['m2', 'demo-alacarte', 'cat_1', 'ข้าวผัดปูก้อนกรรเชียง', 'เนื้อกรรเชียงปูแน่นๆ ข้าวหอมมะลิเม็ดร่วน', 149, 65, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&h=400&fit=crop']
  });
  await client.execute({
    sql: `INSERT INTO menu_items (id, store_id, category_id, name, description, price, cost_price, image_url, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    args: ['m5', 'demo-alacarte', 'cat_2', 'ต้มยำกุ้งแม่น้ำน้ำข้น', 'กุ้งแม่น้ำตัวโต มันกุ้งเยิ้ม รสแซ่บครบรส', 189, 85, 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=500&h=400&fit=crop']
  });

  console.log('🎉 ฐานข้อมูล Turso Cloud พร้อมใช้งาน 100% เรียบร้อยแล้ว!');
}

main().catch(err => {
  console.error('❌ เกิดข้อผิดพลาด:', err);
  process.exit(1);
});
