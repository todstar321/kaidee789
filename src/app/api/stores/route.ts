import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const storeId = url.searchParams.get('id');

    if (storeId) {
      const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(storeId);
      if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      }
      return NextResponse.json(store);
    }

    const stores = db.prepare('SELECT * FROM stores ORDER BY created_at DESC').all();
    return NextResponse.json(stores);
  } catch (error) {
    console.error('Failed to get stores:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, phone, address, promptpay_number, promptpay_name, buffet_duration_mins, plan_id, plan_billing_type } = body;

    if (!name) {
      return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
    }

    const db = getDb();
    const id = 'store_' + Math.random().toString(36).substring(2, 9);
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    const expireDate = new Date();
    if (plan_billing_type === 'yearly') {
      expireDate.setFullYear(expireDate.getFullYear() + 1);
    } else if (plan_billing_type === 'lifetime') {
      expireDate.setFullYear(expireDate.getFullYear() + 50);
    } else {
      expireDate.setDate(expireDate.getDate() + 30);
    }

    db.prepare(`
      INSERT INTO stores (
        id, name, slug, type, logo_url, cover_url, phone, address, promptpay_number, promptpay_name,
        buffet_duration_mins, plan_id, plan_billing_type, plan_expires_at, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      slug,
      type || 'alacarte',
      body.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop',
      body.cover_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop',
      phone || '',
      address || '',
      promptpay_number || '',
      promptpay_name || name,
      buffet_duration_mins ? Number(buffet_duration_mins) : 120,
      plan_id || 'free',
      plan_billing_type || 'monthly',
      expireDate.toISOString(),
      'active',
      now
    );

    // Create default staff
    db.prepare(`
      INSERT INTO store_staff (id, store_id, name, pin, role, is_active)
      VALUES
        (?, ?, 'เจ้าของร้าน', '1111', 'owner', 1),
        (?, ?, 'แคชเชียร์', '3333', 'cashier', 1),
        (?, ?, 'ห้องครัว', '4444', 'kitchen', 1)
    `).run(
      'stf_' + Math.random().toString(36).substring(2, 7), id,
      'stf_' + Math.random().toString(36).substring(2, 7), id,
      'stf_' + Math.random().toString(36).substring(2, 7), id
    );

    // Create 4 initial tables
    for (let i = 1; i <= 4; i++) {
      db.prepare(`
        INSERT INTO tables (id, store_id, table_number, zone, capacity, status)
        VALUES (?, ?, ?, 'โซนหลัก', 4, 'available')
      `).run('tbl_' + id + '_' + i, id, 'โต๊ะ ' + i);
    }

    // If buffet, create default tiers
    if (type === 'buffet') {
      db.prepare(`
        INSERT INTO buffet_tiers (id, store_id, name, price, description, color, sort_order)
        VALUES
          (?, ?, 'Standard Buffet', 399, 'เมนูมาตรฐาน', '#3b82f6', 1),
          (?, ?, 'Premium Buffet', 499, 'เมนูพรีเมียม ซีฟู้ด และเนื้อพิเศษ', '#eab308', 2)
      `).run('tier_' + id + '_std', id, 'tier_' + id + '_prm', id);
    }

    return NextResponse.json({ success: true, store_id: id });
  } catch (error) {
    console.error('Failed to create store:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
