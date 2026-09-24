import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Store, Table } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { store_id, table_id, guest_count, buffet_tier_id } = body;

    if (!store_id || !table_id) {
      return NextResponse.json({ error: 'Missing store_id or table_id' }, { status: 400 });
    }

    const table = db.prepare('SELECT * FROM tables WHERE id = ? AND store_id = ?').get(table_id, store_id) as unknown as Table | undefined;
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(store_id) as unknown as Store | undefined;
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
    const token = sessionId; // dynamic QR code token
    const now = new Date();
    const openedAt = now.toISOString();

    let buffetEndTime: string | null = null;
    if (store.type === 'buffet' || buffet_tier_id) {
      const duration = store.buffet_duration_mins || 120;
      const end = new Date(now.getTime() + duration * 60000);
      buffetEndTime = end.toISOString();
    }

    // Insert session
    db.prepare(`
      INSERT INTO table_sessions (
        id, store_id, table_id, opened_at, guest_count, buffet_tier_id, buffet_end_time, status, qr_code_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      sessionId,
      store_id,
      table_id,
      openedAt,
      guest_count ? Number(guest_count) : 1,
      buffet_tier_id || null,
      buffetEndTime,
      token
    );

    // Update table
    db.prepare(`
      UPDATE tables
      SET status = 'occupied', current_session_id = ?
      WHERE id = ?
    `).run(sessionId, table_id);

    // Auto-create Guest A (e.g. "โต๊ะ 1-A")
    const guestId = 'g_' + Math.random().toString(36).substring(2, 9);
    const guestLabel = `${table.table_number}-A`;
    db.prepare(`
      INSERT INTO guests (id, session_id, guest_code, guest_label, nickname, joined_at)
      VALUES (?, ?, 'A', ?, 'ลูกค้า A', ?)
    `).run(guestId, sessionId, guestLabel, openedAt);

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      token: token,
      table_number: table.table_number,
      opened_at: openedAt,
      guest_id: guestId,
      guest_label: guestLabel,
    });
  } catch (error) {
    console.error('Failed to open table:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
