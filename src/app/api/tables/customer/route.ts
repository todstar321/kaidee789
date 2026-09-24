import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { Table, TableSession } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return handleUpdateCustomer(req);
}

export async function PUT(req: Request) {
  return handleUpdateCustomer(req);
}

async function handleUpdateCustomer(req: Request) {
  try {
    const body = await req.json();
    const { store_id, table_id, session_id, member_id, member_name, member_nickname, member_phone } = body;

    if (!store_id || !table_id) {
      return NextResponse.json({ error: 'store_id and table_id are required' }, { status: 400 });
    }

    const table = await queryOne<Table>('SELECT * FROM tables WHERE id = ? AND store_id = ?', [table_id, store_id]);
    if (!table) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลโต๊ะนี้' }, { status: 404 });
    }

    const activeSessionId = session_id || table.current_session_id;
    if (!activeSessionId) {
      return NextResponse.json({ error: 'โต๊ะนี้ยังไม่ได้เปิดใช้งาน หรือถูกปิดไปแล้ว' }, { status: 400 });
    }

    const session = await queryOne<TableSession>('SELECT * FROM table_sessions WHERE id = ? AND store_id = ? AND status = "active"', [activeSessionId, store_id]);
    if (!session) {
      return NextResponse.json({ error: 'ไม่พบเซสชันโต๊ะที่กำลังเปิดใช้งาน' }, { status: 404 });
    }

    // Clean values
    let finalMemberId = member_id ? String(member_id).trim() : null;
    const finalMemberName = member_name ? String(member_name).trim() : null;
    const finalMemberNickname = member_nickname ? String(member_nickname).trim() : null;
    const finalMemberPhone = member_phone ? String(member_phone).trim() : null;

    if (!finalMemberId && finalMemberPhone) {
      const existingMem = await queryOne<{ id: string }>('SELECT id FROM members WHERE store_id = ? AND phone = ?', [store_id, finalMemberPhone]);
      if (existingMem) {
        finalMemberId = existingMem.id;
      } else if (finalMemberName) {
        finalMemberId = 'mem_' + Math.random().toString(36).substring(2, 9);
        await execute(`
          INSERT INTO members (id, store_id, name, nickname, phone, points, notes, created_at)
          VALUES (?, ?, ?, ?, ?, 0, '', ?)
        `, [finalMemberId, store_id, finalMemberName, finalMemberNickname, finalMemberPhone, new Date().toISOString()]).catch(() => {});
      }
    }

    // Update table_sessions
    await execute(`
      UPDATE table_sessions
      SET member_id = ?,
          member_name = ?,
          member_nickname = ?,
          member_phone = ?
      WHERE id = ? AND store_id = ?
    `, [
      finalMemberId,
      finalMemberName,
      finalMemberNickname,
      finalMemberPhone,
      activeSessionId,
      store_id,
    ]);

    // Also update guest A's nickname if customer name is set
    const guestDisplayName = finalMemberNickname
      ? `${finalMemberName || 'ลูกค้า'} (${finalMemberNickname})`
      : (finalMemberName || 'ลูกค้า A');

    await execute(`
      UPDATE guests
      SET nickname = ?
      WHERE session_id = ? AND guest_code = 'A'
    `, [guestDisplayName, activeSessionId]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `อัปเดตข้อมูลลูกค้าประจำโต๊ะ ${table.table_number} เรียบร้อยแล้ว`,
      data: {
        table_id,
        table_number: table.table_number,
        session_id: activeSessionId,
        member_id: finalMemberId,
        member_name: finalMemberName,
        member_nickname: finalMemberNickname,
        member_phone: finalMemberPhone,
      }
    });
  } catch (error) {
    console.error('Failed to update table customer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
