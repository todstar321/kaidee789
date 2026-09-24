import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'restaurant_saas.db');

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA journal_mode = WAL;');
    initSchema(_db);
    seedData(_db);
  }
  return _db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT,
      permissions TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS stores (
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
    );

    CREATE TABLE IF NOT EXISTS buffet_tiers (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      price REAL,
      description TEXT,
      color TEXT,
      sort_order INTEGER,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS store_staff (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      pin TEXT,
      role TEXT,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      table_number TEXT,
      zone TEXT,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'available',
      current_session_id TEXT,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS table_sessions (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      table_id TEXT,
      opened_at TEXT,
      closed_at TEXT,
      guest_count INTEGER DEFAULT 1,
      buffet_tier_id TEXT,
      buffet_end_time TEXT,
      status TEXT DEFAULT 'active',
      qr_code_token TEXT,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      guest_code TEXT,
      guest_label TEXT,
      nickname TEXT,
      joined_at TEXT,
      FOREIGN KEY (session_id) REFERENCES table_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_items (
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
      options_json TEXT,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      session_id TEXT,
      table_id TEXT,
      order_number TEXT,
      status TEXT DEFAULT 'pending',
      total_amount REAL DEFAULT 0,
      created_at TEXT,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
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
      created_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscription_payments (
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
    );

    CREATE TABLE IF NOT EXISTS invoices (
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
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      date TEXT,
      category TEXT,
      title TEXT,
      amount REAL,
      receipt_url TEXT,
      notes TEXT,
      created_at TEXT
    );
  `);
}

function seedData(db: DatabaseSync) {
  // Check if already seeded
  const storeCount = db.prepare('SELECT COUNT(*) as count FROM stores').get() as { count: number };
  if (storeCount && storeCount.count > 0) return;

  const now = new Date().toISOString();

  // 1. Super Admins
  db.prepare(`
    INSERT INTO super_admins (id, username, password, name, role, permissions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'sa_1',
    'admin',
    'admin888',
    'คุณธนภัทร (เจ้าของแพลตฟอร์ม)',
    'owner',
    JSON.stringify(['manage_stores', 'manage_plans', 'verify_slips', 'impersonate', 'manage_assistants']),
    now
  );

  db.prepare(`
    INSERT INTO super_admins (id, username, password, name, role, permissions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'sa_2',
    'assistant',
    'assistant123',
    'น้องแนน (ผู้ช่วยแอดมิน)',
    'assistant',
    JSON.stringify(['manage_stores', 'verify_slips', 'impersonate']),
    now
  );

  // 2. Demo Store 1: ร้านอาหารตามสั่ง & อาหารจานด่วน (A La Carte)
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 45); // 45 days remaining

  db.prepare(`
    INSERT INTO stores (
      id, name, slug, type, logo_url, cover_url, phone, address, promptpay_number, promptpay_name,
      buffet_duration_mins, plan_id, plan_billing_type, plan_expires_at, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'demo-alacarte',
    'ร้านกินดี อยู่ดี (ตามสั่ง & อาหารไทย)',
    'kindee-alacarte',
    'alacarte',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop',
    '089-123-4567',
    '88/1 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110',
    '0891234567',
    'นายสมเกียรติ มั่งมี',
    0,
    'pro',
    'monthly',
    expireDate.toISOString(),
    'active',
    now
  );

  // Staff for Demo 1
  const staff1 = [
    { id: 'stf_1', name: 'คุณสมเกียรติ (เจ้าของร้าน)', pin: '1111', role: 'owner' },
    { id: 'stf_2', name: 'พี่มานพ (ผู้จัดการ)', pin: '2222', role: 'manager' },
    { id: 'stf_3', name: 'น้องจอย (แคชเชียร์)', pin: '3333', role: 'cashier' },
    { id: 'stf_4', name: 'เชฟเอก (หัวหน้าครัว)', pin: '4444', role: 'kitchen' },
    { id: 'stf_5', name: 'บอย (พนักงานบริการ)', pin: '5555', role: 'waiter' },
  ];
  for (const s of staff1) {
    db.prepare('INSERT INTO store_staff (id, store_id, name, pin, role, is_active) VALUES (?, ?, ?, ?, ?, 1)').run(
      s.id, 'demo-alacarte', s.name, s.pin, s.role
    );
  }

  // Categories for Demo 1
  const cats1 = [
    { id: 'cat_alc_1', name: '🔥 เมนูจานด่วนยอดฮิต', icon: 'Flame', sort: 1 },
    { id: 'cat_alc_2', name: '🍲 เมนูต้ม/แกง/ซุป', icon: 'Soup', sort: 2 },
    { id: 'cat_alc_3', name: '🍗 ของทานเล่น/ทอด', icon: 'Utensils', sort: 3 },
    { id: 'cat_alc_4', name: '🧋 เครื่องดื่ม & ของหวาน', icon: 'CupSoda', sort: 4 },
  ];
  for (const c of cats1) {
    db.prepare('INSERT INTO categories (id, store_id, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)').run(
      c.id, 'demo-alacarte', c.name, c.icon, c.sort
    );
  }

  // Menu items for Demo 1 (with selling price and cost price!)
  const menu1 = [
    { id: 'm1', cat: 'cat_alc_1', name: 'ข้าวกะเพราหมูกรอบ + ไข่ดาวกรอบ', desc: 'หมูกรอบทำเองหนังกรอบฟู ผัดกะเพราพริกแห้งเข้มข้นจัดจ้าน', price: 89, cost: 38, img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&h=400&fit=crop' },
    { id: 'm2', cat: 'cat_alc_1', name: 'ข้าวผัดปูก้อนกรรเชียง', desc: 'เนื้อกรรเชียงปูแน่นๆ ผัดข้าวหอมมะลิเม็ดร่วนหอมกลิ่นกระทะ', price: 149, cost: 65, img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&h=400&fit=crop' },
    { id: 'm3', cat: 'cat_alc_1', name: 'ข้าวคะน้าหมูกรอบ', desc: 'คะน้าฮ่องกงยอดอ่อนผัดน้ำมันหอยใส่หมูกรอบ', price: 85, cost: 36, img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&h=400&fit=crop' },
    { id: 'm4', cat: 'cat_alc_1', name: 'ผัดซีอิ๊วเส้นใหญ่หมูนุ่ม', desc: 'เส้นใหญ่เหนียวนุ่มผัดซีอิ๊วดำหอมกระทะ หมูหมักนุ่มละมุน', price: 79, cost: 32, img: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=500&h=400&fit=crop' },

    { id: 'm5', cat: 'cat_alc_2', name: 'ต้มยำกุ้งแม่น้ำน้ำข้น', desc: 'กุ้งแม่น้ำตัวโต มันกุ้งเยิ้ม รสแซ่บครบรสกลมกล่อม', price: 189, cost: 85, img: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=500&h=400&fit=crop' },
    { id: 'm6', cat: 'cat_alc_2', name: 'แกงส้มชะอมกุ้งสด', desc: 'น้ำแกงส้มเข้มข้น ไข่ชะอมทอดใหม่ร้อนๆ พร้อมกุ้งสดเด้ง', price: 159, cost: 68, img: 'https://images.unsplash.com/photo-1547928576-a4a33237cbc3?w=500&h=400&fit=crop' },
    { id: 'm7', cat: 'cat_alc_2', name: 'ต้มข่าไก่บ้านกะทิสด', desc: 'ไก่บ้านเนื้อหนึบ ต้มกะทิหอมกลิ่นข่าอ่อนและใบมะกรูด', price: 139, cost: 55, img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&h=400&fit=crop' },

    { id: 'm8', cat: 'cat_alc_3', name: 'ปีกไก่ทอดน้ำปลาหอม', desc: 'ปีกไก่หมักน้ำปลาแท้สูตรโบราณ ทอดกรอบนอกนุ่มใน', price: 99, cost: 42, img: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&h=400&fit=crop' },
    { id: 'm9', cat: 'cat_alc_3', name: 'หมูสามชั้นคั่วพริกเกลือ', desc: 'สามชั้นทอดกรอบคั่วพริกกระเทียมต้นหอม กรุบกรอบเคี้ยวเพลิน', price: 119, cost: 48, img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&h=400&fit=crop' },
    { id: 'm10', cat: 'cat_alc_3', name: 'ทอดมันกุ้งเนื้อเด้ง (4 ชิ้น)', desc: 'ทอดมันกุ้งแท้ 100% เนื้อแน่นเด้ง เสิร์ฟพร้อมน้ำจิ้มบ๊วย', price: 129, cost: 58, img: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=500&h=400&fit=crop' },

    { id: 'm11', cat: 'cat_alc_4', name: 'ชาไทยโบราณสูตรปักษ์ใต้เย็น', desc: 'ชาไทยแท้สกัดเข้มข้น หอมมัน หวานกำลังดี', price: 45, cost: 14, img: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&h=400&fit=crop' },
    { id: 'm12', cat: 'cat_alc_4', name: 'น้ำมะนาวน้ำผึ้งแท้โซดา', desc: 'สดชื่น ซ่าหวานอมเปรี้ยว ดับร้อนได้ดีเยี่ยม', price: 50, cost: 16, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&h=400&fit=crop' },
    { id: 'm13', cat: 'cat_alc_4', name: 'บัวลอยกะทิสดไข่หวานมะพร้าวอ่อน', desc: 'แป้งบัวลอยนุ่มหนึบ กะทิคั้นสดอบควันเทียน', price: 55, cost: 18, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&h=400&fit=crop' },
  ];

  for (const m of menu1) {
    db.prepare(`
      INSERT INTO menu_items (id, store_id, category_id, name, description, price, cost_price, image_url, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(m.id, 'demo-alacarte', m.cat, m.name, m.desc, m.price, m.cost, m.img);
  }

  // Tables for Demo 1
  const tables1 = [
    { id: 'tbl_1', num: 'โต๊ะ 1', zone: 'ห้องแอร์', cap: 4, status: 'occupied' },
    { id: 'tbl_2', num: 'โต๊ะ 2', zone: 'ห้องแอร์', cap: 4, status: 'available' },
    { id: 'tbl_3', num: 'โต๊ะ 3', zone: 'ห้องแอร์', cap: 2, status: 'available' },
    { id: 'tbl_4', num: 'โต๊ะ 4', zone: 'ห้องแอร์', cap: 6, status: 'billing_requested' },
    { id: 'tbl_5', num: 'โต๊ะ 5 (ระเบียง)', zone: 'หน้าร้านระเบียง', cap: 4, status: 'available' },
    { id: 'tbl_6', num: 'โต๊ะ 6 (ระเบียง)', zone: 'หน้าร้านระเบียง', cap: 4, status: 'available' },
    { id: 'tbl_7', num: 'VIP 1', zone: 'ห้องส่วนตัว', cap: 8, status: 'available' },
  ];
  for (const t of tables1) {
    db.prepare('INSERT INTO tables (id, store_id, table_number, zone, capacity, status) VALUES (?, ?, ?, ?, ?, ?)').run(
      t.id, 'demo-alacarte', t.num, t.zone, t.cap, t.status
    );
  }

  // Sample Table Session on Table 1 (Active seated for 35 mins)
  const session1Time = new Date(Date.now() - 35 * 60000).toISOString();
  db.prepare(`
    INSERT INTO table_sessions (id, store_id, table_id, opened_at, guest_count, status, qr_code_token)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('sess_alc_1', 'demo-alacarte', 'tbl_1', session1Time, 2, 'active', 'sess_alc_1');

  db.prepare("UPDATE tables SET current_session_id = 'sess_alc_1' WHERE id = 'tbl_1'").run();

  // Guests in Table 1: โต๊ะ 1-A (คุณสมชาย) and โต๊ะ 1-B (คุณนิด)
  db.prepare(`
    INSERT INTO guests (id, session_id, guest_code, guest_label, nickname, joined_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('g_1_a', 'sess_alc_1', 'A', 'โต๊ะ 1-A', 'คุณสมชาย', session1Time);

  db.prepare(`
    INSERT INTO guests (id, session_id, guest_code, guest_label, nickname, joined_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('g_1_b', 'sess_alc_1', 'B', 'โต๊ะ 1-B', 'คุณนิด', session1Time);

  // Active orders in Table 1
  db.prepare(`
    INSERT INTO orders (id, store_id, session_id, table_id, order_number, status, total_amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('ord_alc_1', 'demo-alacarte', 'sess_alc_1', 'tbl_1', '#01', 'cooking', 377, session1Time);

  db.prepare(`
    INSERT INTO order_items (id, order_id, session_id, guest_id, guest_label, guest_nickname, menu_item_id, item_name, quantity, price, cost_price, notes, status, customer_received, created_at)
    VALUES
      ('oi_1', 'ord_alc_1', 'sess_alc_1', 'g_1_a', 'โต๊ะ 1-A', 'คุณสมชาย', 'm1', 'ข้าวกะเพราหมูกรอบ + ไข่ดาวกรอบ', 1, 89, 38, 'เผ็ดกลาง ไข่ดาวกรอบๆ', 'ready', 1, ?),
      ('oi_2', 'ord_alc_1', 'sess_alc_1', 'g_1_a', 'โต๊ะ 1-A', 'คุณสมชาย', 'm11', 'ชาไทยโบราณสูตรปักษ์ใต้เย็น', 1, 45, 14, 'หวาน 50%', 'served', 1, ?),
      ('oi_3', 'ord_alc_1', 'sess_alc_1', 'g_1_b', 'โต๊ะ 1-B', 'คุณนิด', 'm5', 'ต้มยำกุ้งแม่น้ำน้ำข้น', 1, 189, 85, 'ไม่ใส่ผักชี', 'cooking', 0, ?),
      ('oi_4', 'ord_alc_1', 'sess_alc_1', 'g_1_b', 'โต๊ะ 1-B', 'คุณนิด', 'm13', 'บัวลอยกะทิสดไข่หวานมะพร้าวอ่อน', 1, 55, 18, 'เสิร์ฟหลังอาหาร', 'pending', 0, ?)
  `).run(session1Time, session1Time, session1Time, session1Time);

  // Sample Table 4 (Billing Requested)
  const session4Time = new Date(Date.now() - 55 * 60000).toISOString();
  db.prepare(`
    INSERT INTO table_sessions (id, store_id, table_id, opened_at, guest_count, status, qr_code_token)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('sess_alc_4', 'demo-alacarte', 'tbl_4', session4Time, 3, 'active', 'sess_alc_4');
  db.prepare("UPDATE tables SET current_session_id = 'sess_alc_4' WHERE id = 'tbl_4'").run();

  db.prepare(`
    INSERT INTO guests (id, session_id, guest_code, guest_label, nickname, joined_at)
    VALUES ('g_4_a', 'sess_alc_4', 'A', 'โต๊ะ 4-A', 'หมวดต้น', ?)
  `).run(session4Time);

  db.prepare(`
    INSERT INTO orders (id, store_id, session_id, table_id, order_number, status, total_amount, created_at)
    VALUES ('ord_alc_4', 'demo-alacarte', 'sess_alc_4', 'tbl_4', '#02', 'served', 545, ?)
  `).run(session4Time);

  db.prepare(`
    INSERT INTO order_items (id, order_id, session_id, guest_id, guest_label, guest_nickname, menu_item_id, item_name, quantity, price, cost_price, status, customer_received, created_at)
    VALUES
      ('oi_41', 'ord_alc_4', 'sess_alc_4', 'g_4_a', 'โต๊ะ 4-A', 'หมวดต้น', 'm2', 'ข้าวผัดปูก้อนกรรเชียง', 2, 149, 65, 'served', 1, ?),
      ('oi_42', 'ord_alc_4', 'sess_alc_4', 'g_4_a', 'โต๊ะ 4-A', 'หมวดต้น', 'm8', 'ปีกไก่ทอดน้ำปลาหอม', 1, 99, 42, 'served', 1, ?),
      ('oi_43', 'ord_alc_4', 'sess_alc_4', 'g_4_a', 'โต๊ะ 4-A', 'หมวดต้น', 'm12', 'น้ำมะนาวน้ำผึ้งแท้โซดา', 3, 50, 16, 'served', 1, ?)
  `).run(session4Time, session4Time, session4Time);

  // Sample Daily Expenses for Demo 1
  const todayStr = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO expenses (id, store_id, date, category, title, amount, notes, created_at)
    VALUES
      ('exp_1', 'demo-alacarte', ?, 'วัตถุดิบ/ของสด', 'ซื้อกุ้งแม่น้ำและผักสดตลาดไท', 1450, 'กุ้งแม่น้ำ 2 กก. ผักสด มะนาว', ?),
      ('exp_2', 'demo-alacarte', ?, 'ค่าน้ำแข็ง/แก๊ส', 'น้ำแข็งหลอด 3 กระสอบ + แก๊สหุงต้ม', 520, 'ส่งเช้า', ?),
      ('exp_3', 'demo-alacarte', ?, 'ค่าแรงรายวัน', 'ค่าจ้างพนักงานพาร์ทไทม์ 2 คน', 800, 'กะเช้า', ?)
  `).run(todayStr, now, todayStr, now, todayStr, now);

  // -------------------------------------------------------------
  // 3. Demo Store 2: โอชิ ชาบู & บุฟเฟ่ต์ยากินิกุ (Buffet Tier Model)
  // -------------------------------------------------------------
  db.prepare(`
    INSERT INTO stores (
      id, name, slug, type, logo_url, cover_url, phone, address, promptpay_number, promptpay_name,
      buffet_duration_mins, plan_id, plan_billing_type, plan_expires_at, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'demo-buffet',
    'โอชิ ชาบู & บุฟเฟ่ต์ยากินิกุ',
    'oshi-buffet',
    'buffet',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=400&fit=crop',
    '092-888-9999',
    '123 ศูนย์การค้าเจปาร์ค ถ.พระราม 9 ห้วยขวาง กทม. 10310',
    '0928889999',
    'บจก. โอชิ ฟู้ดส์ แอนด์ เรสเตอรองต์',
    120, // 2 hours
    'enterprise',
    'yearly',
    expireDate.toISOString(),
    'active',
    now
  );

  // Staff for Demo 2
  const staff2 = [
    { id: 'stf_b1', name: 'คุณวิชัย (เจ้าของร้าน)', pin: '1111', role: 'owner' },
    { id: 'stf_b2', name: 'คุณเบนซ์ (ผู้จัดการ)', pin: '2222', role: 'manager' },
    { id: 'stf_b3', name: 'นก (แคชเชียร์)', pin: '3333', role: 'cashier' },
    { id: 'stf_b4', name: 'เชฟคิม (หัวหน้าครัวชาบู)', pin: '4444', role: 'kitchen' },
  ];
  for (const s of staff2) {
    db.prepare('INSERT INTO store_staff (id, store_id, name, pin, role, is_active) VALUES (?, ?, ?, ?, ?, 1)').run(
      s.id, 'demo-buffet', s.name, s.pin, s.role
    );
  }

  // Buffet Tiers
  db.prepare(`
    INSERT INTO buffet_tiers (id, store_id, name, price, description, color, sort_order)
    VALUES
      ('tier_std', 'demo-buffet', 'Standard Buffet (หมู & ไก่)', 399, 'อิ่มอร่อยกับหมูสไลด์ คุโรบูตะ ผักสด ลูกชิ้น และเครื่องดื่มรีฟิลไม่อั้น', '#3b82f6', 1),
      ('tier_prm', 'demo-buffet', 'Premium Buffet (เนื้อริบอาย & ซีฟู้ด)', 499, 'เพิ่มเนื้อวากิวออสเตรเลีย กุ้งแม่น้ำ แซลมอนซาชิมิ ซูชิ และไอศกรีมพรีเมียม', '#eab308', 2)
  `).run();

  // Categories for Buffet
  const cats2 = [
    { id: 'cat_buf_1', name: '🥩 เนื้อวัว & หมูพรีเมียม', icon: 'Flame', sort: 1 },
    { id: 'cat_buf_2', name: '🦐 ซีฟู้ด & ซาชิมิ', icon: 'Fish', sort: 2 },
    { id: 'cat_buf_3', name: '🥬 ผักสด & ลูกชิ้น', icon: 'Salad', sort: 3 },
    { id: 'cat_buf_4', name: '🍨 ของหวาน & ซอฟต์เสิร์ฟ', icon: 'IceCream', sort: 4 },
  ];
  for (const c of cats2) {
    db.prepare('INSERT INTO categories (id, store_id, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)').run(
      c.id, 'demo-buffet', c.name, c.icon, c.sort
    );
  }

  // Menu items for Buffet (linked to min_buffet_tier_id!)
  const menu2 = [
    // Standard available
    { id: 'bm1', cat: 'cat_buf_1', name: 'หมูสันคอสไลด์ คุโรบูตะ', desc: 'หมูคุโรบูตะสไลด์บางเฉียบ ลวกสุกนุ่มละลายในปาก', price: 0, cost: 25, tier: 'tier_std', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&h=400&fit=crop' },
    { id: 'bm2', cat: 'cat_buf_1', name: 'หมูสามชั้นสไลด์ชาบู', desc: 'แทรกชั้นไขมันนุ่ม หวานมัน ลวกกับซุปน้ำดำ', price: 0, cost: 22, tier: 'tier_std', img: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&h=400&fit=crop' },
    { id: 'bm3', cat: 'cat_buf_1', name: 'อกไก่หมักงาหอม', desc: 'อกไก่นุ่มหมักน้ำมันงาและพริกไทยดำ', price: 0, cost: 15, tier: 'tier_std', img: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=500&h=400&fit=crop' },

    // Premium Only (tier_prm)
    { id: 'bm4', cat: 'cat_buf_1', name: 'เนื้อริบอาย ออสเตรเลีย แองกัส (Premium)', desc: 'ลายหินอ่อนสวย นุ่มฉ่ำ ลวกสะดุ้งเพียง 5 วินาที', price: 0, cost: 45, tier: 'tier_prm', img: 'https://images.unsplash.com/photo-1558030006-450675393462?w=500&h=400&fit=crop' },
    { id: 'bm5', cat: 'cat_buf_1', name: 'ลิ้นวัวพรีเมียมสไลด์บาง (Premium)', desc: 'สัมผัสกรุบกรอบ ทานคู่น้ำจิ้มพอนสึต้นหอมญี่ปุ่น', price: 0, cost: 40, tier: 'tier_prm', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&h=400&fit=crop' },

    // Seafood Standard vs Premium
    { id: 'bm6', cat: 'cat_buf_2', name: 'ปลาดอลลี่สด & หมึกบั้ง', desc: 'เนื้อปลาขาวและปลาหมึกสดลวกเด้ง', price: 0, cost: 18, tier: 'tier_std', img: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=500&h=400&fit=crop' },
    { id: 'bm7', cat: 'cat_buf_2', name: 'กุ้งแม่น้ำสดไซส์จัมโบ้ (Premium)', desc: 'กุ้งแม่น้ำตัวแน่น มันกุ้งเยิ้ม สดใหม่วันต่อวัน', price: 0, cost: 50, tier: 'tier_prm', img: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=500&h=400&fit=crop' },
    { id: 'bm8', cat: 'cat_buf_2', name: 'แซลมอนซาชิมิ นอร์เวย์ (Premium)', desc: 'แซลมอนสดนำเข้า ลายไขมันสวย เสิร์ฟพร้อมวาซาบิสด', price: 0, cost: 55, tier: 'tier_prm', img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=400&fit=crop' },

    // Veggies & Dessert
    { id: 'bm9', cat: 'cat_buf_3', name: 'เซ็ตผักรวมชาบู & เห็ดเข็มทอง', desc: 'ผักกาดขาว กวางตุ้ง ข้าวโพดหวาน เห็ดออรินจิ เห็ดเข็มทอง', price: 0, cost: 12, tier: 'tier_std', img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&h=400&fit=crop' },
    { id: 'bm10', cat: 'cat_buf_4', name: 'ไอศกรีมมัทฉะอุจิแท้ & ถั่วแดง', desc: 'มัทฉะแท้เข้มข้น หวานน้อย ตัดเลี่ยนได้อย่างดี', price: 0, cost: 15, tier: 'tier_std', img: 'https://images.unsplash.com/photo-1560008581-09826d1de69e?w=500&h=400&fit=crop' },
    { id: 'bm11', cat: 'cat_buf_4', name: 'ฮาเก้นดาส พรีเมียมพาร์เฟต์ (Premium)', desc: 'ไอศกรีมฮาเก้นดาสแท้ ราดซอสสตรอว์เบอร์รี', price: 0, cost: 35, tier: 'tier_prm', img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&h=400&fit=crop' },
  ];

  for (const m of menu2) {
    db.prepare(`
      INSERT INTO menu_items (id, store_id, category_id, name, description, price, cost_price, image_url, min_buffet_tier_id, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(m.id, 'demo-buffet', m.cat, m.name, m.desc, m.price, m.cost, m.img, m.tier);
  }

  // Tables for Buffet
  const tables2 = [
    { id: 'tbl_b1', num: 'โต๊ะ B1', zone: 'ชาบูโซน A', cap: 4, status: 'available' },
    { id: 'tbl_b2', num: 'โต๊ะ B2', zone: 'ชาบูโซน A', cap: 4, status: 'occupied' },
    { id: 'tbl_b3', num: 'โต๊ะ B3', zone: 'ชาบูโซน A', cap: 4, status: 'available' },
    { id: 'tbl_b4', num: 'โต๊ะ B4', zone: 'ยากินิกุเตาถ่าน', cap: 6, status: 'available' },
    { id: 'tbl_b5', num: 'โต๊ะ B5', zone: 'ยากินิกุเตาถ่าน', cap: 6, status: 'available' },
  ];
  for (const t of tables2) {
    db.prepare('INSERT INTO tables (id, store_id, table_number, zone, capacity, status) VALUES (?, ?, ?, ?, ?, ?)').run(
      t.id, 'demo-buffet', t.num, t.zone, t.cap, t.status
    );
  }

  // Active Buffet Session on Table B2 (2 hours buffet, 48 minutes remaining)
  const buffetStartTime = new Date(Date.now() - 72 * 60000).toISOString();
  const buffetEndTime = new Date(Date.now() + 48 * 60000).toISOString();
  db.prepare(`
    INSERT INTO table_sessions (id, store_id, table_id, opened_at, guest_count, buffet_tier_id, buffet_end_time, status, qr_code_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('sess_buf_2', 'demo-buffet', 'tbl_b2', buffetStartTime, 2, 'tier_prm', buffetEndTime, 'active', 'sess_buf_2');
  db.prepare("UPDATE tables SET current_session_id = 'sess_buf_2' WHERE id = 'tbl_b2'").run();

  db.prepare(`
    INSERT INTO guests (id, session_id, guest_code, guest_label, nickname, joined_at)
    VALUES
      ('g_b2_a', 'sess_buf_2', 'A', 'โต๊ะ B2-A', 'คุณบิ๊ก', ?),
      ('g_b2_b', 'sess_buf_2', 'B', 'โต๊ะ B2-B', 'คุณแอน', ?)
  `).run(buffetStartTime, buffetStartTime);

  // Active Buffet Order
  db.prepare(`
    INSERT INTO orders (id, store_id, session_id, table_id, order_number, status, total_amount, created_at)
    VALUES ('ord_buf_1', 'demo-buffet', 'sess_buf_2', 'tbl_b2', '#B01', 'cooking', 0, ?)
  `).run(buffetStartTime);

  db.prepare(`
    INSERT INTO order_items (id, order_id, session_id, guest_id, guest_label, guest_nickname, menu_item_id, item_name, quantity, price, cost_price, status, customer_received, created_at)
    VALUES
      ('boi_1', 'ord_buf_1', 'sess_buf_2', 'g_b2_a', 'โต๊ะ B2-A', 'คุณบิ๊ก', 'bm4', 'เนื้อริบอาย ออสเตรเลีย แองกัส (Premium)', 3, 0, 45, 'ready', 1, ?),
      ('boi_2', 'ord_buf_1', 'sess_buf_2', 'g_b2_a', 'โต๊ะ B2-A', 'คุณบิ๊ก', 'bm7', 'กุ้งแม่น้ำสดไซส์จัมโบ้ (Premium)', 2, 0, 50, 'cooking', 0, ?),
      ('boi_3', 'ord_buf_1', 'sess_buf_2', 'g_b2_b', 'โต๊ะ B2-B', 'คุณแอน', 'bm8', 'แซลมอนซาชิมิ นอร์เวย์ (Premium)', 2, 0, 55, 'served', 1, ?),
      ('boi_4', 'ord_buf_1', 'sess_buf_2', 'g_b2_b', 'โต๊ะ B2-B', 'คุณแอน', 'bm9', 'เซ็ตผักรวมชาบู & เห็ดเข็มทอง', 1, 0, 12, 'served', 1, ?)
  `).run(buffetStartTime, buffetStartTime, buffetStartTime, buffetStartTime);

  // -------------------------------------------------------------
  // 4. Sample Pending Subscription Payment (Slip attached for Super Admin)
  // -------------------------------------------------------------
  db.prepare(`
    INSERT INTO subscription_payments (
      id, store_id, store_name, plan_id, billing_cycle, amount, slip_url, slip_time, status, reviewer_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'slip_001',
    'demo-alacarte',
    'ร้านกินดี อยู่ดี (ตามสั่ง & อาหารไทย)',
    'pro',
    'monthly',
    590,
    'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&h=800&fit=crop', // Realistic bank slip preview
    now,
    'pending',
    '',
    now
  );
}
