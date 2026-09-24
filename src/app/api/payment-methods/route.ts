import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { PaymentMethod } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    const methods = await query<PaymentMethod>(`
      SELECT * FROM payment_methods 
      WHERE store_id = ? AND is_active = 1
      ORDER BY sort_order ASC, is_system DESC
    `, [storeId]);

    return NextResponse.json(methods);
  } catch (error) {
    console.error('Failed to get payment methods:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { store_id, name, code } = body;

    if (!store_id || !name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อวิธีรับชำระเงิน' }, { status: 400 });
    }

    const id = 'pm_' + Math.random().toString(36).substring(2, 9);
    const methodCode = code || 'custom_' + Math.random().toString(36).substring(2, 7);

    await execute(`
      INSERT INTO payment_methods (id, store_id, name, code, is_system, is_active, sort_order)
      VALUES (?, ?, ?, ?, 0, 1, 10)
    `, [id, store_id, name, methodCode]);

    return NextResponse.json({ success: true, id, message: 'เพิ่มวิธีรับชำระเงินเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to create payment method:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await execute('DELETE FROM payment_methods WHERE id = ? AND is_system = 0', [id]);
    return NextResponse.json({ success: true, message: 'ลบวิธีชำระเงินเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to delete payment method:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
