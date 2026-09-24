import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// Read .env.local
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
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  console.log('🔄 Running V2 database migration on Turso Cloud...');

  // 1. New Tables
  await client.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      phone TEXT,
      points INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT
    );
  `);
  console.log('✅ Created members table');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS store_discounts (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      type TEXT,
      value REAL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    );
  `);
  console.log('✅ Created store_discounts table');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      name TEXT,
      code TEXT,
      is_system INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );
  `);
  console.log('✅ Created payment_methods table');

  // 2. Add columns with safe try-catch
  const alters = [
    `ALTER TABLE menu_items ADD COLUMN cooking_time_mins INTEGER DEFAULT 10`,
    `ALTER TABLE order_items ADD COLUMN cooking_time_mins INTEGER DEFAULT 10`,
    `ALTER TABLE tables ADD COLUMN service_call TEXT`,
    `ALTER TABLE table_sessions ADD COLUMN member_id TEXT`,
    `ALTER TABLE table_sessions ADD COLUMN member_name TEXT`,
    `ALTER TABLE table_sessions ADD COLUMN member_phone TEXT`,
    `ALTER TABLE stores ADD COLUMN promptpay_qr_url TEXT`,
    `ALTER TABLE stores ADD COLUMN service_charge_percent REAL DEFAULT 10`,
    `ALTER TABLE stores ADD COLUMN vat_percent REAL DEFAULT 7`,
    `ALTER TABLE invoices ADD COLUMN member_id TEXT`,
    `ALTER TABLE invoices ADD COLUMN member_name TEXT`,
    `ALTER TABLE invoices ADD COLUMN discount_details TEXT`,
  ];

  for (const alt of alters) {
    try {
      await client.execute(alt);
      console.log('✅ Altered:', alt);
    } catch (e) {
      // Column might already exist, safe to ignore
      console.log('ℹ️ Skipped (already exists or ok):', alt.split('ADD COLUMN')[1] || alt);
    }
  }

  // 3. Seed default discounts and payment methods for demo stores
  const demoStores = ['demo-alacarte', 'demo-buffet'];
  for (const storeId of demoStores) {
    // Discounts
    const existingDiscounts = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM store_discounts WHERE store_id = ?',
      args: [storeId]
    });
    if (Number(existingDiscounts.rows[0].count) === 0) {
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO store_discounts (id, store_id, name, type, value, is_active, created_at) VALUES 
          (?, ?, 'ส่วนลดสมาชิก 5%', 'percent', 5, 1, ?),
          (?, ?, 'ส่วนลดวันแม่ 10%', 'percent', 10, 1, ?),
          (?, ?, 'คูปองลด 50 บาท', 'fixed', 50, 1, ?),
          (?, ?, 'คูปองลด 100 บาท', 'fixed', 100, 1, ?)`,
        args: [
          'disc_1_' + storeId, storeId, now,
          'disc_2_' + storeId, storeId, now,
          'disc_3_' + storeId, storeId, now,
          'disc_4_' + storeId, storeId, now,
        ]
      });
      console.log(`✅ Seeded discounts for ${storeId}`);
    }

    // Payment methods
    const existingMethods = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM payment_methods WHERE store_id = ?',
      args: [storeId]
    });
    if (Number(existingMethods.rows[0].count) === 0) {
      await client.execute({
        sql: `INSERT INTO payment_methods (id, store_id, name, code, is_system, is_active, sort_order) VALUES 
          (?, ?, 'เงินสด (Cash)', 'cash', 1, 1, 1),
          (?, ?, 'สแกน PromptPay QR', 'promptpay', 1, 1, 2),
          (?, ?, 'บัตรเครดิต / เดบิต', 'card', 1, 1, 3),
          (?, ?, 'คนละครึ่ง / เราเที่ยวด้วยกัน', 'custom_konlakrueng', 0, 1, 4),
          (?, ?, 'โอนผ่านบัญชีธนาคาร', 'custom_transfer', 0, 1, 5)`,
        args: [
          'pm_1_' + storeId, storeId,
          'pm_2_' + storeId, storeId,
          'pm_3_' + storeId, storeId,
          'pm_4_' + storeId, storeId,
          'pm_5_' + storeId, storeId,
        ]
      });
      console.log(`✅ Seeded payment methods for ${storeId}`);
    }

    // Seed some demo members
    const existingMembers = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM members WHERE store_id = ?',
      args: [storeId]
    });
    if (Number(existingMembers.rows[0].count) === 0) {
      const now = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO members (id, store_id, name, phone, points, notes, created_at) VALUES 
          (?, ?, 'คุณสมชาย สายกิน', '0812345678', 120, 'ลูกค้าประจำ ชอบนั่งห้องแอร์', ?),
          (?, ?, 'คุณวิภาวรรณ สดใส', '0898765432', 350, 'แพ้กุ้ง ไม่ใส่ชูรส', ?),
          (?, ?, 'คุณชาลิต ดีเลิศ', '0925557788', 50, 'สมาชิก Gold', ?)`,
        args: [
          'mem_1_' + storeId, storeId, now,
          'mem_2_' + storeId, storeId, now,
          'mem_3_' + storeId, storeId, now,
        ]
      });
      console.log(`✅ Seeded members for ${storeId}`);
    }
  }

  // Update menu cooking times for demo items if null or 0
  await client.execute(`UPDATE menu_items SET cooking_time_mins = 10 WHERE cooking_time_mins IS NULL OR cooking_time_mins = 0`);
  await client.execute(`UPDATE order_items SET cooking_time_mins = 10 WHERE cooking_time_mins IS NULL OR cooking_time_mins = 0`);

  console.log('🎉 Migration V2 Completed successfully!');
}

run().catch(console.error);
