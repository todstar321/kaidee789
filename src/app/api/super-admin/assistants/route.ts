import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const admins = db.prepare('SELECT id, username, name, role, permissions, created_at FROM super_admins ORDER BY created_at ASC').all();
    return NextResponse.json(admins);
  } catch (error) {
    console.error('Failed to get super admins:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { username, password, name, permissions } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const id = 'sa_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO super_admins (id, username, password, name, role, permissions, created_at)
      VALUES (?, ?, ?, ?, 'assistant', ?, ?)
    `).run(
      id,
      username,
      password,
      name,
      JSON.stringify(permissions || ['manage_stores', 'verify_slips', 'impersonate']),
      now
    );

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
    const db = getDb();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const admin = db.prepare('SELECT role FROM super_admins WHERE id = ?').get(id) as { role: string } | undefined;
    if (admin && admin.role === 'owner') {
      return NextResponse.json({ error: 'ไม่สามารถลบแอดมินหลัก (Owner) ได้' }, { status: 400 });
    }

    db.prepare('DELETE FROM super_admins WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete assistant:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
