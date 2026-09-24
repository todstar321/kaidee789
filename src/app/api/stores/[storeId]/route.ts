import { NextResponse } from 'next/server';
import { query, queryOne, execute, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    await ensureSchema();
    const store = await queryOne<any>('SELECT * FROM stores WHERE id = ?', [params.storeId]);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const tiers = await query('SELECT * FROM buffet_tiers WHERE store_id = ? ORDER BY sort_order ASC', [params.storeId]);
    const staff = await query('SELECT id, name, pin, role, is_active FROM store_staff WHERE store_id = ?', [params.storeId]);

    // Check system admin_phone fallback
    let systemAdminPhone = '081-234-5678';
    try {
      const row = await queryOne<{ value: string }>('SELECT value FROM admin_settings WHERE key = ?', ['admin_phone']);
      if (row?.value) systemAdminPhone = row.value;
    } catch {}

    return NextResponse.json({
      ...store,
      admin_phone: store.admin_phone || systemAdminPhone,
      buffet_tiers: tiers,
      staff: staff,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Failed to get store details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    await ensureSchema();
    const body = await req.json();

    const existing = await queryOne('SELECT * FROM stores WHERE id = ?', [params.storeId]);
    if (!existing) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const updatable: Record<string, any> = {};

    if (body.name !== undefined) updatable.name = String(body.name).trim();
    if (body.type !== undefined) updatable.type = body.type;
    if (body.logo_url !== undefined) updatable.logo_url = String(body.logo_url).trim();
    if (body.cover_url !== undefined) updatable.cover_url = String(body.cover_url).trim();
    if (body.phone !== undefined) updatable.phone = String(body.phone).trim();
    if (body.address !== undefined) updatable.address = String(body.address).trim();
    if (body.promptpay_number !== undefined) updatable.promptpay_number = String(body.promptpay_number).trim();
    if (body.promptpay_name !== undefined) updatable.promptpay_name = String(body.promptpay_name).trim();
    if (body.promptpay_qr_url !== undefined) updatable.promptpay_qr_url = body.promptpay_qr_url;
    if (body.service_charge_percent !== undefined) updatable.service_charge_percent = Number(body.service_charge_percent);
    if (body.vat_percent !== undefined) updatable.vat_percent = Number(body.vat_percent);
    if (body.buffet_duration_mins !== undefined) updatable.buffet_duration_mins = Number(body.buffet_duration_mins);
    if (body.status !== undefined) updatable.status = body.status;
    if (body.plan_id !== undefined) updatable.plan_id = body.plan_id;
    if (body.plan_billing_type !== undefined) updatable.plan_billing_type = body.plan_billing_type;
    if (body.plan_expires_at !== undefined) updatable.plan_expires_at = body.plan_expires_at;
    if (body.login_username !== undefined) updatable.login_username = String(body.login_username).trim();
    if (body.login_password !== undefined) updatable.login_password = String(body.login_password).trim();
    if (body.custom_price_yearly !== undefined) updatable.custom_price_yearly = body.custom_price_yearly !== null ? Number(body.custom_price_yearly) : null;
    if (body.custom_price_monthly !== undefined) updatable.custom_price_monthly = body.custom_price_monthly !== null ? Number(body.custom_price_monthly) : null;
    if (body.discount_percent !== undefined) updatable.discount_percent = Number(body.discount_percent);
    if (body.trial_months !== undefined) updatable.trial_months = Number(body.trial_months);
    if (body.admin_phone !== undefined) updatable.admin_phone = String(body.admin_phone).trim();

    const keys = Object.keys(updatable);
    if (keys.length > 0) {
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => updatable[k]);
      await execute(`UPDATE stores SET ${setClause} WHERE id = ?`, [...values, params.storeId]);
    }

    // Helper to safely upsert staff PINs so updating PIN never fails even if staff record is missing
    const upsertStaffPin = async (role: string, pin: string, defaultName: string) => {
      const cleanPin = String(pin).trim();
      if (cleanPin.length < 4) return;
      const staffRow = await queryOne<{ id: string }>('SELECT id FROM store_staff WHERE store_id = ? AND role = ?', [params.storeId, role]);
      if (staffRow) {
        await execute('UPDATE store_staff SET pin = ? WHERE id = ?', [cleanPin, staffRow.id]);
      } else {
        const id = 'stf_' + Math.random().toString(36).substring(2, 9);
        await execute('INSERT INTO store_staff (id, store_id, name, pin, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
          [id, params.storeId, defaultName, cleanPin, role]
        );
      }
    };

    if (body.owner_pin) {
      await upsertStaffPin('owner', body.owner_pin, 'เจ้าของร้าน');
    }
    if (body.cashier_pin) {
      await upsertStaffPin('cashier', body.cashier_pin, 'แคชเชียร์');
    }
    if (body.kitchen_pin) {
      await upsertStaffPin('kitchen', body.kitchen_pin, 'ห้องครัว KDS');
    }

    const updated = await queryOne('SELECT * FROM stores WHERE id = ?', [params.storeId]);
    return NextResponse.json({ success: true, store: updated });
  } catch (error: any) {
    console.error('Failed to update store:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    await execute('DELETE FROM stores WHERE id = ?', [params.storeId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete store:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
