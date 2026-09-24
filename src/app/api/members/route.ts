import { NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { Member } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');
    const q = url.searchParams.get('q')?.trim() || '';

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    let members: Member[] = [];
    if (q) {
      const searchPattern = `%${q}%`;
      members = await query<Member>(`
        SELECT * FROM members 
        WHERE store_id = ? AND (name LIKE ? OR nickname LIKE ? OR phone LIKE ?)
        ORDER BY created_at DESC LIMIT 20
      `, [storeId, searchPattern, searchPattern, searchPattern]);
    } else {
      members = await query<Member>(`
        SELECT * FROM members 
        WHERE store_id = ?
        ORDER BY created_at DESC LIMIT 30
      `, [storeId]);
    }

    return NextResponse.json(members, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to get members:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { store_id, name, nickname, phone, points, notes } = body;

    if (!store_id || !name || !phone) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและเบอร์โทรศัพท์' }, { status: 400 });
    }

    // Check if member with this phone exists in this store
    const existing = await queryOne<Member>(`
      SELECT * FROM members WHERE store_id = ? AND phone = ?
    `, [store_id, phone]);

    if (existing) {
      // Update name/nickname/notes/points if provided
      await execute(`
        UPDATE members 
        SET name = COALESCE(?, name),
            nickname = COALESCE(?, nickname),
            points = points + ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `, [name, nickname || null, Number(points || 0), notes || null, existing.id]);

      const updated = await queryOne<Member>('SELECT * FROM members WHERE id = ?', [existing.id]);
      return NextResponse.json({ success: true, member: updated, message: 'อัปเดตข้อมูลสมาชิกเรียบร้อยแล้ว' });
    }

    const id = 'mem_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO members (id, store_id, name, nickname, phone, points, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, store_id, name, nickname || null, phone, Number(points || 0), notes || '', now]);

    const created = await queryOne<Member>('SELECT * FROM members WHERE id = ?', [id]);
    return NextResponse.json({ success: true, member: created, message: 'ลงทะเบียนสมาชิกใหม่เรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to save member:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
