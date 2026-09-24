import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { item_id, status } = body; // 'pending' | 'cooking' | 'ready' | 'served' | 'cancelled'

    if (!item_id || !status) {
      return NextResponse.json({ error: 'Missing item_id or status' }, { status: 400 });
    }

    db.prepare('UPDATE order_items SET status = ? WHERE id = ?').run(status, item_id);

    return NextResponse.json({
      success: true,
      status,
      message: status === 'ready'
        ? 'อาหารปรุงเสร็จแล้ว กำลังนำไปเสิร์ฟ'
        : status === 'served'
        ? 'เสิร์ฟอาหารเรียบร้อยแล้ว'
        : 'อัปเดตสถานะสำเร็จ',
    });
  } catch (error) {
    console.error('Failed to update item status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
