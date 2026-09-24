import { NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');

    if (storeId) {
      const slips = await query('SELECT * FROM subscription_payments WHERE store_id = ? ORDER BY created_at DESC', [storeId]);
      return NextResponse.json(slips);
    }

    // Super Admin view: all slips
    const slips = await query('SELECT * FROM subscription_payments ORDER BY created_at DESC');
    return NextResponse.json(slips);
  } catch (error) {
    console.error('Failed to get subscription payments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Store uploads/attaches payment slip
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { store_id, plan_id, billing_cycle, amount, slip_url } = body;

    if (!store_id || !slip_url) {
      return NextResponse.json({ error: 'กรุณาแนบรูปสลิปการโอนเงิน' }, { status: 400 });
    }

    const store = await queryOne<{ name: string }>('SELECT name FROM stores WHERE id = ?', [store_id]);
    const storeName = store ? store.name : 'ร้านค้า';

    const id = 'slip_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO subscription_payments (
        id, store_id, store_name, plan_id, billing_cycle, amount, slip_url, slip_time, status, reviewer_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?)
    `, [
      id,
      store_id,
      storeName,
      plan_id || 'pro',
      billing_cycle || 'monthly',
      Number(amount || 590),
      slip_url,
      now,
      now
    ]);

    return NextResponse.json({
      success: true,
      message: 'แนบสลิปเรียบร้อยแล้ว แอดมินจะทำการตรวจสอบและอนุมัติภายในเวลาอันรวดเร็ว',
    });
  } catch (error) {
    console.error('Failed to submit slip:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
