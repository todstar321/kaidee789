import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { store_id, table_id, zone, assigned_staff } = body;

    if (!store_id) {
      return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
    }

    if (table_id) {
      // Assign staff to a single table
      await execute('UPDATE tables SET assigned_staff = ? WHERE id = ? AND store_id = ?', [
        assigned_staff || null,
        table_id,
        store_id,
      ]);
      return NextResponse.json({
        success: true,
        message: `กำหนดพนักงานดูแลโต๊ะเรียบร้อยแล้ว`,
      });
    }

    if (zone) {
      // Assign staff to all tables in the zone
      await execute('UPDATE tables SET assigned_staff = ? WHERE zone = ? AND store_id = ?', [
        assigned_staff || null,
        zone,
        store_id,
      ]);
      return NextResponse.json({
        success: true,
        message: `กำหนดพนักงานดูแลโซน "${zone}" เรียบร้อยแล้ว`,
      });
    }

    return NextResponse.json({ error: 'กรุณาระบุ table_id หรือ zone' }, { status: 400 });
  } catch (error) {
    console.error('Failed to assign staff:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
