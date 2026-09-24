import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { item_id, status } = body;

    if (!item_id || !status) {
      return NextResponse.json({ error: 'Missing item_id or status' }, { status: 400 });
    }

    await execute('UPDATE order_items SET status = ? WHERE id = ?', [status, item_id]);

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
