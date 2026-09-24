import { NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const store = await queryOne('SELECT * FROM stores WHERE id = ?', [params.storeId]);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const tiers = await query('SELECT * FROM buffet_tiers WHERE store_id = ? ORDER BY sort_order ASC', [params.storeId]);
    const staff = await query('SELECT id, name, pin, role, is_active FROM store_staff WHERE store_id = ?', [params.storeId]);

    return NextResponse.json({
      ...store,
      buffet_tiers: tiers,
      staff: staff,
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
    const body = await req.json();

    const existing = await queryOne('SELECT * FROM stores WHERE id = ?', [params.storeId]);
    if (!existing) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    await execute(`
      UPDATE stores
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          promptpay_number = COALESCE(?, promptpay_number),
          promptpay_name = COALESCE(?, promptpay_name),
          promptpay_qr_url = COALESCE(?, promptpay_qr_url),
          service_charge_percent = COALESCE(?, service_charge_percent),
          vat_percent = COALESCE(?, vat_percent),
          buffet_duration_mins = COALESCE(?, buffet_duration_mins),
          status = COALESCE(?, status),
          plan_id = COALESCE(?, plan_id),
          plan_billing_type = COALESCE(?, plan_billing_type),
          plan_expires_at = COALESCE(?, plan_expires_at),
          login_username = COALESCE(?, login_username),
          login_password = COALESCE(?, login_password)
      WHERE id = ?
    `, [
      body.name,
      body.type,
      body.phone,
      body.address,
      body.promptpay_number,
      body.promptpay_name,
      body.promptpay_qr_url !== undefined ? body.promptpay_qr_url : null,
      body.service_charge_percent !== undefined ? Number(body.service_charge_percent) : null,
      body.vat_percent !== undefined ? Number(body.vat_percent) : null,
      body.buffet_duration_mins ? Number(body.buffet_duration_mins) : null,
      body.status,
      body.plan_id,
      body.plan_billing_type,
      body.plan_expires_at,
      body.login_username !== undefined ? body.login_username : null,
      body.login_password !== undefined ? body.login_password : null,
      params.storeId
    ]);

    // Update staff PINs if provided
    if (body.owner_pin && body.owner_pin.length === 4) {
      await execute('UPDATE store_staff SET pin = ? WHERE store_id = ? AND role = "owner"', [body.owner_pin, params.storeId]);
    }
    if (body.cashier_pin && body.cashier_pin.length === 4) {
      await execute('UPDATE store_staff SET pin = ? WHERE store_id = ? AND role = "cashier"', [body.cashier_pin, params.storeId]);
    }
    if (body.kitchen_pin && body.kitchen_pin.length === 4) {
      await execute('UPDATE store_staff SET pin = ? WHERE store_id = ? AND role = "kitchen"', [body.kitchen_pin, params.storeId]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update store:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
