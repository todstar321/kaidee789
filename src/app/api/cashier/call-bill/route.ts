import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { table_id } = body;

    if (!table_id) {
      return NextResponse.json({ error: 'Missing table_id' }, { status: 400 });
    }

    await execute("UPDATE tables SET status = 'billing_requested' WHERE id = ?", [table_id]);

    return NextResponse.json({
      success: true,
      message: 'แจ้งพนักงานเช็กบิลเรียบร้อยแล้ว พนักงานกำลังมาที่โต๊ะของท่านครับ',
    });
  } catch (error) {
    console.error('Failed to call bill:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
