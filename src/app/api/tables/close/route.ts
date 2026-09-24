import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { table_id } = body;

    if (!table_id) {
      return NextResponse.json({ error: 'Missing table_id' }, { status: 400 });
    }

    const table = db.prepare('SELECT current_session_id FROM tables WHERE id = ?').get(table_id) as { current_session_id?: string } | undefined;
    if (table && table.current_session_id) {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE table_sessions
        SET status = 'cancelled', closed_at = ?
        WHERE id = ?
      `).run(now, table.current_session_id);
    }

    db.prepare(`
      UPDATE tables
      SET status = 'available', current_session_id = NULL
      WHERE id = ?
    `).run(table_id);

    return NextResponse.json({ success: true, message: 'ปิดโต๊ะและยกเลิก Session QR Code เรียบร้อย' });
  } catch (error) {
    console.error('Failed to close table:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
