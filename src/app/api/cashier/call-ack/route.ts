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

    await execute(`
      UPDATE tables 
      SET service_call = NULL,
          status = CASE WHEN status = 'billing_requested' THEN 'occupied' ELSE status END
      WHERE id = ?
    `, [table_id]);

    return NextResponse.json({ success: true, message: 'รับทราบการเรียกเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to acknowledge call:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
