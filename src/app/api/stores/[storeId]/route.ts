import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const db = getDb();
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(params.storeId);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const tiers = db.prepare('SELECT * FROM buffet_tiers WHERE store_id = ? ORDER BY sort_order ASC').all(params.storeId);
    const staff = db.prepare('SELECT id, name, pin, role, is_active FROM store_staff WHERE store_id = ?').all(params.storeId);

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
    const db = getDb();
    const body = await req.json();

    const existing = db.prepare('SELECT * FROM stores WHERE id = ?').get(params.storeId);
    if (!existing) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE stores
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          promptpay_number = COALESCE(?, promptpay_number),
          promptpay_name = COALESCE(?, promptpay_name),
          buffet_duration_mins = COALESCE(?, buffet_duration_mins),
          status = COALESCE(?, status),
          plan_id = COALESCE(?, plan_id),
          plan_billing_type = COALESCE(?, plan_billing_type),
          plan_expires_at = COALESCE(?, plan_expires_at)
      WHERE id = ?
    `).run(
      body.name,
      body.type,
      body.phone,
      body.address,
      body.promptpay_number,
      body.promptpay_name,
      body.buffet_duration_mins ? Number(body.buffet_duration_mins) : null,
      body.status,
      body.plan_id,
      body.plan_billing_type,
      body.plan_expires_at,
      params.storeId
    );

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
    const db = getDb();
    db.prepare('DELETE FROM stores WHERE id = ?').run(params.storeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete store:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
