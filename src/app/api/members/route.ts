import { NextResponse } from 'next/server';
import { query, queryOne, execute, ensureSchema } from '@/lib/db';
import { Member } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureSchema();
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
    await ensureSchema();
    const body = await req.json();
    const { store_id, name, nickname, phone, points, notes } = body;

    if (!store_id || !name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและเบอร์โทรศัพท์' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanName = name.trim();
    const cleanNickname = nickname?.trim() || null;
    const cleanNotes = notes?.trim() || '';
    const cleanPoints = !isNaN(Number(points)) ? Number(points) : 0;

    // Check if member with this phone exists in this store
    const existing = await queryOne<Member>(`
      SELECT * FROM members WHERE store_id = ? AND phone = ?
    `, [store_id, cleanPhone]);

    if (existing) {
      // Update name/nickname/notes/points if provided
      await execute(`
        UPDATE members 
        SET name = COALESCE(?, name),
            nickname = COALESCE(?, nickname),
            points = points + ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `, [cleanName, cleanNickname, cleanPoints, cleanNotes, existing.id]);

      const updated = await queryOne<Member>('SELECT * FROM members WHERE id = ?', [existing.id]);
      return NextResponse.json({ success: true, member: updated, message: 'อัปเดตข้อมูลสมาชิกเรียบร้อยแล้ว' });
    }

    const id = 'mem_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO members (id, store_id, name, nickname, phone, points, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, store_id, cleanName, cleanNickname, cleanPhone, cleanPoints, cleanNotes, now]);

    const created = await queryOne<Member>('SELECT * FROM members WHERE id = ?', [id]);
    return NextResponse.json({ success: true, member: created, message: 'ลงทะเบียนสมาชิกใหม่เรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Failed to save member:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export const revalidate = 0;

export async function PUT(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { id, store_id, name, nickname, phone, points, notes } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและเบอร์โทรศัพท์' }, { status: 400 });
    }

    const cleanId = id ? String(id).trim() : '';
    const cleanPhone = String(phone).trim();
    const cleanName = String(name).trim();
    const cleanNickname = nickname !== undefined ? (nickname ? String(nickname).trim() : null) : null;
    const cleanNotes = notes !== undefined && notes !== null ? String(notes).trim() : '';
    const cleanPoints = points !== undefined && points !== null && !isNaN(Number(points)) ? Number(points) : 0;

    // Look for existing member by ID first, then by phone + store_id
    let existing: Member | null = null;
    if (cleanId) {
      existing = await queryOne<Member>('SELECT * FROM members WHERE id = ?', [cleanId]);
    }
    if (!existing && store_id && cleanPhone) {
      existing = await queryOne<Member>('SELECT * FROM members WHERE store_id = ? AND phone = ?', [store_id, cleanPhone]);
    }

    if (existing) {
      // Update existing record
      await execute(`
        UPDATE members 
        SET name = ?,
            nickname = ?,
            phone = ?,
            points = ?,
            notes = ?
        WHERE id = ?
      `, [cleanName, cleanNickname, cleanPhone, cleanPoints, cleanNotes, existing.id]);

      const updated = await queryOne<Member>('SELECT * FROM members WHERE id = ?', [existing.id]);
      return NextResponse.json({ 
        success: true, 
        member: updated, 
        message: 'บันทึกการแก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว' 
      }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // If for any reason the record was not found, create/upsert it so user NEVER gets blocked!
    const newId = cleanId || ('mem_' + Math.random().toString(36).substring(2, 9));
    const targetStoreId = store_id || 'demo-alacarte';
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO members (id, store_id, name, nickname, phone, points, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, targetStoreId, cleanName, cleanNickname, cleanPhone, cleanPoints, cleanNotes, now]);

    const created = await queryOne<Member>('SELECT * FROM members WHERE id = ?', [newId]);
    return NextResponse.json({
      success: true,
      member: created,
      message: 'บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว',
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (error: any) {
    console.error('Failed to update member:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const id = url.searchParams.get('id')?.trim();
    const storeId = url.searchParams.get('store_id')?.trim();
    const phone = url.searchParams.get('phone')?.trim();

    if (!id && !phone) {
      return NextResponse.json({ error: 'Member id or phone is required' }, { status: 400 });
    }

    if (id) {
      await execute('DELETE FROM members WHERE id = ?', [id]);
    } else if (storeId && phone) {
      await execute('DELETE FROM members WHERE store_id = ? AND phone = ?', [storeId, phone]);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'ลบข้อมูลลูกค้าเรียบร้อยแล้ว' 
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (error) {
    console.error('Failed to delete member:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

