import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { Store, Table } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { store_id, table_id, guest_count, buffet_tier_id, member_id, member_name, member_nickname, member_phone } = body;

    if (!store_id || !table_id) {
      return NextResponse.json({ error: 'Missing store_id or table_id' }, { status: 400 });
    }

    const table = await queryOne<Table>('SELECT * FROM tables WHERE id = ? AND store_id = ?', [table_id, store_id]);
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const store = await queryOne<Store>('SELECT * FROM stores WHERE id = ?', [store_id]);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
    const token = sessionId;
    const now = new Date();
    const openedAt = now.toISOString();

    let buffetEndTime: string | null = null;
    if (store.type === 'buffet' || buffet_tier_id) {
      const duration = store.buffet_duration_mins || 120;
      const end = new Date(now.getTime() + duration * 60000);
      buffetEndTime = end.toISOString();
    }

    let finalMemberId = member_id ? String(member_id).trim() : null;
    if (!finalMemberId && member_phone?.trim()) {
      const cleanPhone = String(member_phone).trim();
      const existingMem = await queryOne<{ id: string }>('SELECT id FROM members WHERE store_id = ? AND phone = ?', [store_id, cleanPhone]);
      if (existingMem) {
        finalMemberId = existingMem.id;
      } else if (member_name?.trim()) {
        finalMemberId = 'mem_' + Math.random().toString(36).substring(2, 9);
        await execute(`
          INSERT INTO members (id, store_id, name, nickname, phone, points, notes, created_at)
          VALUES (?, ?, ?, ?, ?, 0, '', ?)
        `, [finalMemberId, store_id, String(member_name).trim(), member_nickname ? String(member_nickname).trim() : null, cleanPhone, openedAt]).catch(() => {});
      }
    }

    // Insert session with optional member info
    await execute(`
      INSERT INTO table_sessions (
        id, store_id, table_id, opened_at, guest_count, buffet_tier_id, buffet_end_time, status, qr_code_token,
        member_id, member_name, member_nickname, member_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
    `, [
      sessionId,
      store_id,
      table_id,
      openedAt,
      guest_count ? Number(guest_count) : 1,
      buffet_tier_id || null,
      buffetEndTime,
      token,
      finalMemberId,
      member_name ? String(member_name).trim() : null,
      member_nickname ? String(member_nickname).trim() : null,
      member_phone ? String(member_phone).trim() : null,
    ]);

    // Update table
    await execute(`
      UPDATE tables
      SET status = 'occupied', current_session_id = ?, service_call = NULL
      WHERE id = ?
    `, [sessionId, table_id]);

    // Auto-create Guest A (e.g. "โต๊ะ 1-A")
    const guestId = 'g_' + Math.random().toString(36).substring(2, 9);
    const guestLabel = `${table.table_number}-A`;
    await execute(`
      INSERT INTO guests (id, session_id, guest_code, guest_label, nickname, joined_at)
      VALUES (?, ?, 'A', ?, 'ลูกค้า A', ?)
    `, [guestId, sessionId, guestLabel, openedAt]);

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
