import { NextResponse } from 'next/server';
import { query, queryOne, execute, ensureSchema } from '@/lib/db';
import { Category, MenuItem, Table, BuffetTier } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    await ensureSchema();
    const body = await req.json();
    const newStoreName = body.new_name;

    if (!newStoreName) {
      return NextResponse.json({ error: 'ชื่อร้านใหม่จำเป็นต้องระบุ' }, { status: 400 });
    }

    const sourceStore = await queryOne('SELECT * FROM stores WHERE id = ?', [params.storeId]);
    if (!sourceStore) {
      return NextResponse.json({ error: 'ไม่พบร้านค้าต้นแบบ' }, { status: 404 });
    }

    const newId = 'store_' + Math.random().toString(36).substring(2, 9);
    const newSlug = newStoreName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30);

    const clonedUsername = 'user_' + Math.random().toString(36).substring(2, 8);
    const clonedPassword = Math.random().toString(36).substring(2, 8);

    // 1. Insert cloned store
    await execute(`
      INSERT INTO stores (
        id, name, slug, type, logo_url, cover_url, phone, address, promptpay_number, promptpay_name,
        buffet_duration_mins, plan_id, plan_billing_type, plan_expires_at, status, created_at,
        login_username, login_password, service_charge_percent, vat_percent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      newStoreName,
      newSlug,
      sourceStore.type as string,
      (sourceStore.logo_url as string) || '',
      (sourceStore.cover_url as string) || '',
      (sourceStore.phone as string) || '',
      (sourceStore.address as string) || '',
      (sourceStore.promptpay_number as string) || '',
      newStoreName,
      Number(sourceStore.buffet_duration_mins || 120),
      body.plan_id || (sourceStore.plan_id as string) || 'pro',
      body.plan_billing_type || 'monthly',
      expireDate.toISOString(),
      'active',
      now,
      clonedUsername,
      clonedPassword,
      Number(sourceStore.service_charge_percent || 0),
      Number(sourceStore.vat_percent || 7)
    ]);

    // 2. Clone Buffet Tiers (if buffet)
    const tierIdMap: Record<string, string> = {};
    if (sourceStore.type === 'buffet') {
      const sourceTiers = await query<BuffetTier>('SELECT * FROM buffet_tiers WHERE store_id = ?', [params.storeId]);
      for (const t of sourceTiers) {
        const newTierId = 'tier_' + Math.random().toString(36).substring(2, 9);
        tierIdMap[t.id] = newTierId;
        await execute(`
          INSERT INTO buffet_tiers (id, store_id, name, price, description, color, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [newTierId, newId, t.name, t.price, t.description, t.color, t.sort_order]);
      }
    }

    // 3. Clone Categories and Menu Items
    const sourceCats = await query<Category>('SELECT * FROM categories WHERE store_id = ?', [params.storeId]);
    const catIdMap: Record<string, string> = {};

    for (const c of sourceCats) {
      const newCatId = 'cat_' + Math.random().toString(36).substring(2, 9);
      catIdMap[c.id] = newCatId;
      await execute(`
        INSERT INTO categories (id, store_id, name, icon, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `, [newCatId, newId, c.name, c.icon || '', c.sort_order]);
    }

    const sourceItems = await query<MenuItem>('SELECT * FROM menu_items WHERE store_id = ?', [params.storeId]);
    for (const item of sourceItems) {
      const newMenuId = 'm_' + Math.random().toString(36).substring(2, 9);
      const newCatId = catIdMap[item.category_id] || '';
      const newTierId = item.min_buffet_tier_id ? (tierIdMap[item.min_buffet_tier_id] || null) : null;

      await execute(`
        INSERT INTO menu_items (
          id, store_id, category_id, name, description, price, cost_price, image_url, is_available, min_buffet_tier_id, options_json, cooking_time_mins
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newMenuId,
        newId,
        newCatId,
        item.name,
        item.description,
        item.price,
        item.cost_price,
        item.image_url,
        1,
        newTierId,
        item.options_json || '',
        Number(item.cooking_time_mins || 10)
      ]);
    }

    // 4. Clone Tables (freshly available)
    const sourceTables = await query<Table>('SELECT * FROM tables WHERE store_id = ?', [params.storeId]);
    for (const t of sourceTables) {
      const newTableId = 'tbl_' + Math.random().toString(36).substring(2, 9);
      await execute(`
        INSERT INTO tables (id, store_id, table_number, zone, capacity, status)
        VALUES (?, ?, ?, ?, ?, 'available')
      `, [newTableId, newId, t.table_number, t.zone, t.capacity]);
    }

    // 5. Create default Staff for new store
    await execute(`
      INSERT INTO store_staff (id, store_id, name, pin, role, is_active)
      VALUES (?, ?, 'เจ้าของร้าน (ใหม่)', '1111', 'owner', 1)
    `, ['stf_' + Math.random().toString(36).substring(2, 7), newId]);

    await execute(`
      INSERT INTO store_staff (id, store_id, name, pin, role, is_active)
      VALUES (?, ?, 'แคชเชียร์', '3333', 'cashier', 1)
    `, ['stf_' + Math.random().toString(36).substring(2, 7), newId]);

    return NextResponse.json({
      success: true,
      new_store_id: newId,
      message: `โคลนร้านค้า "${newStoreName}" สำเร็จเรียบร้อย พร้อมโครงสร้างเมนูและผังโต๊ะครบถ้วน!`,
    });
  } catch (error) {
    console.error('Failed to clone store:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
