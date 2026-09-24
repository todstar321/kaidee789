import { NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admins = await query('SELECT id, username, name, role, permissions, created_at FROM super_admins ORDER BY created_at ASC');
    return NextResponse.json(admins);
  } catch (error) {
    console.error('Failed to get super admins:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, name, permissions } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const id = 'sa_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO super_admins (id, username, password, name, role, permissions, created_at)
      VALUES (?, ?, ?, ?, 'assistant', ?, ?)
    `, [
      id,
      username,
      password,
      name,
      JSON.stringify(permissions || ['manage_stores', 'verify_slips', 'impersonate']),
      now
    ]);

    return NextResponse.json({
      success: true,
      id,
      message: 'เพิ่มผู้ช่วยแอดมินเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('Failed to add assistant admin:', error);
    return NextResponse.json({ error: 'ชื่อผู้ใช้นี้อาจมีอยู่ในระบบแล้ว' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const admin = await queryOne<{ role: string }>('SELECT role FROM super_admins WHERE id = ?', [id]);
    if (admin && admin.role === 'owner') {
      return NextResponse.json({ error: 'ไม่สามารถลบแอดมินหลัก (Owner) ได้' }, { status: 400 });
    }

    await execute('DELETE FROM super_admins WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete assistant:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
