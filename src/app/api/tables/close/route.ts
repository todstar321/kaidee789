import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { table_id } = body;

    if (!table_id) {
      return NextResponse.json({ error: 'Missing table_id' }, { status: 400 });
    }

    const table = await queryOne<{ current_session_id?: string }>('SELECT current_session_id FROM tables WHERE id = ?', [table_id]);
    if (table && table.current_session_id) {
      const now = new Date().toISOString();
      await execute(`
        UPDATE table_sessions
        SET status = 'cancelled', closed_at = ?
        WHERE id = ?
      `, [now, table.current_session_id]);
    }

    await execute(`
      UPDATE tables
      SET status = 'available', current_session_id = NULL, service_call = NULL
      WHERE id = ?
    `, [table_id]);

    return NextResponse.json({ success: true, message: 'ปิดโต๊ะและยกเลิก Session QR Code เรียบร้อย' });
  } catch (error) {
    console.error('Failed to close table:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
