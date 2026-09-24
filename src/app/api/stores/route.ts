import { NextResponse } from 'next/server';
import { query, queryOne, execute, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const storeId = url.searchParams.get('id');

    if (storeId) {
      const store = await queryOne('SELECT * FROM stores WHERE id = ?', [storeId]);
      if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      }
      return NextResponse.json(store);
    }

    const stores = await query('SELECT * FROM stores ORDER BY created_at DESC');
    return NextResponse.json(stores);
  } catch (error) {
    console.error('Failed to get stores:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const {
      name,
      type,
      phone,
      address,
      promptpay_number,
      promptpay_name,
      buffet_duration_mins,
      plan_id,
      plan_billing_type,
      login_username,
      login_password,
      owner_pin,
      cashier_pin,
      kitchen_pin,
      custom_price_yearly,
      custom_price_monthly,
      discount_percent,
      trial_months,
      admin_phone,
      service_charge_percent,
      vat_percent,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
    }

    const id = 'store_' + Math.random().toString(36).substring(2, 9);
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    // Default username / password if not specified
    const finalUsername = login_username?.trim() || ('user_' + Math.random().toString(36).substring(2, 8));
    const finalPassword = login_password?.trim() || Math.random().toString(36).substring(2, 8);
    const finalOwnerPin = (owner_pin?.trim() && owner_pin.length === 4) ? owner_pin.trim() : '1111';
    const finalCashierPin = (cashier_pin?.trim() && cashier_pin.length === 4) ? cashier_pin.trim() : '3333';
    const finalKitchenPin = (kitchen_pin?.trim() && kitchen_pin.length === 4) ? kitchen_pin.trim() : '4444';

    const expireDate = new Date();
    if (plan_billing_type === 'yearly') {
      expireDate.setFullYear(expireDate.getFullYear() + 1);
    } else if (plan_billing_type === 'lifetime') {
      expireDate.setFullYear(expireDate.getFullYear() + 50);
    } else {
      expireDate.setDate(expireDate.getDate() + 30);
    }

    await execute(`
      INSERT INTO stores (
        id, name, slug, type, logo_url, cover_url, phone, address, promptpay_number, promptpay_name,
        buffet_duration_mins, plan_id, plan_billing_type, plan_expires_at, status, created_at,
        login_username, login_password, custom_price_yearly, custom_price_monthly, discount_percent, trial_months, admin_phone,
        service_charge_percent, vat_percent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
      now,
      finalUsername,
      finalPassword,
      custom_price_yearly !== undefined && custom_price_yearly !== null ? Number(custom_price_yearly) : null,
      custom_price_monthly !== undefined && custom_price_monthly !== null ? Number(custom_price_monthly) : null,
      discount_percent ? Number(discount_percent) : 0,
      trial_months ? Number(trial_months) : 0,
      admin_phone ? String(admin_phone).trim() : null,
      service_charge_percent !== undefined ? Number(service_charge_percent) : 10,
      vat_percent !== undefined ? Number(vat_percent) : 7,
    ]);

    // Create default staff with custom PINs
    const stf1 = 'stf_' + Math.random().toString(36).substring(2, 7);
    const stf2 = 'stf_' + Math.random().toString(36).substring(2, 7);
    const stf3 = 'stf_' + Math.random().toString(36).substring(2, 7);

    await execute('INSERT INTO store_staff (id, store_id, name, pin, role, is_active) VALUES (?, ?, ?, ?, ?, 1)', [stf1, id, 'เจ้าของร้าน', finalOwnerPin, 'owner']);
    await execute('INSERT INTO store_staff (id, store_id, name, pin, role, is_active) VALUES (?, ?, ?, ?, ?, 1)', [stf2, id, 'แคชเชียร์', finalCashierPin, 'cashier']);
    await execute('INSERT INTO store_staff (id, store_id, name, pin, role, is_active) VALUES (?, ?, ?, ?, ?, 1)', [stf3, id, 'ห้องครัว', finalKitchenPin, 'kitchen']);

    // Create 4 initial tables
    for (let i = 1; i <= 4; i++) {
      await execute(`
        INSERT INTO tables (id, store_id, table_number, zone, capacity, status)
        VALUES (?, ?, ?, 'โซนหลัก', 4, 'available')
      `, ['tbl_' + id + '_' + i, id, 'โต๊ะ ' + i]);
    }

    // Create initial categories
    const initialCats = [
      { id: 'cat_' + id + '_1', name: '🔥 เมนูแนะนำยอดฮิต', icon: 'Flame', sort_order: 1 },
      { id: 'cat_' + id + '_2', name: '🍲 ต้ม / แกง / ซุป', icon: 'Soup', sort_order: 2 },
      { id: 'cat_' + id + '_3', name: '🍳 ผัด / ทอด / จานเดียว', icon: 'Utensils', sort_order: 3 },
      { id: 'cat_' + id + '_4', name: '🥤 เครื่องดื่ม & ของหวาน', icon: 'Coffee', sort_order: 4 },
    ];
    for (const c of initialCats) {
      await execute('INSERT INTO categories (id, store_id, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)', [c.id, id, c.name, c.icon, c.sort_order]);
    }

    // If buffet, create default tiers
    if (type === 'buffet') {
      await execute(`
        INSERT INTO buffet_tiers (id, store_id, name, price, description, color, sort_order)
        VALUES (?, ?, 'Standard Buffet', 399, 'เมนูมาตรฐาน', '#3b82f6', 1)
      `, ['tier_' + id + '_std', id]);
      await execute(`
        INSERT INTO buffet_tiers (id, store_id, name, price, description, color, sort_order)
        VALUES (?, ?, 'Premium Buffet', 499, 'เมนูพรีเมียม ซีฟู้ด และเนื้อพิเศษ', '#eab308', 2)
      `, ['tier_' + id + '_prm', id]);
    }

    return NextResponse.json({
      success: true,
      store_id: id,
      store: {
        id,
        name,
        slug,
        login_username: finalUsername,
        login_password: finalPassword,
        owner_pin: finalOwnerPin,
        cashier_pin: finalCashierPin,
        kitchen_pin: finalKitchenPin,
      }
    });
  } catch (error) {
    console.error('Failed to create store:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
