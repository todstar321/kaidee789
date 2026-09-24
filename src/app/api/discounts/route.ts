import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { StoreDiscount } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    const discounts = await query<StoreDiscount>(`
      SELECT * FROM store_discounts 
      WHERE store_id = ? AND is_active = 1
      ORDER BY type DESC, value ASC
    `, [storeId]);

    return NextResponse.json(discounts);
  } catch (error) {
    console.error('Failed to get discounts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { store_id, name, type, value } = body;

    if (!store_id || !name || value === undefined) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลส่วนลดให้ครบถ้วน' }, { status: 400 });
    }

    const id = 'disc_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO store_discounts (id, store_id, name, type, value, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `, [id, store_id, name, type || 'percent', Number(value), now]);

    return NextResponse.json({ success: true, id, message: 'เพิ่มรายการส่วนลดเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to create discount:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await execute('DELETE FROM store_discounts WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'ลบส่วนลดเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to delete discount:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
