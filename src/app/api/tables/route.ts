import { NextResponse } from 'next/server';
import { query, queryOne, execute, ensureSchema } from '@/lib/db';
import { getElapsedMinutes, getBuffetRemainingMinutes } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    const tables = await query<Record<string, unknown>>(`
      SELECT t.*,
             ts.id as session_id,
             ts.opened_at,
             ts.guest_count,
             ts.buffet_tier_id,
             ts.buffet_end_time,
             ts.qr_code_token,
             ts.member_id,
             ts.member_name,
             ts.member_nickname,
             ts.member_phone,
             bt.name as buffet_tier_name,
             bt.price as buffet_tier_price,
             bt.color as buffet_tier_color
      FROM tables t
      LEFT JOIN table_sessions ts ON t.current_session_id = ts.id AND ts.status = 'active'
      LEFT JOIN buffet_tiers bt ON ts.buffet_tier_id = bt.id
      WHERE t.store_id = ?
      ORDER BY t.zone ASC, t.table_number ASC
    `, [storeId]);

    // Collect all active session IDs
    const activeSessionIds = tables
      .map(t => t.session_id as string)
      .filter(Boolean);

    // Batch query order items for all active sessions in ONE query
    let allOrderItems: Record<string, any>[] = [];
    if (activeSessionIds.length > 0) {
      const placeholders = activeSessionIds.map(() => '?').join(',');
      allOrderItems = await query<Record<string, any>>(`
        SELECT oi.*, 
               COALESCE(m.cooking_time_mins, oi.cooking_time_mins, 10) as cooking_time_mins,
               m.image_url
        FROM order_items oi
        LEFT JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.session_id IN (${placeholders})
        ORDER BY oi.created_at DESC
      `, activeSessionIds);
    }

    // Group items by session_id
    const itemsBySession: Record<string, any[]> = {};
    for (const item of allOrderItems) {
      const sid = item.session_id as string;
      if (!itemsBySession[sid]) itemsBySession[sid] = [];
      
      const itemElapsed = getElapsedMinutes(item.created_at as string);
      const cookingLimit = Number(item.cooking_time_mins || 10);
      const isOverdue = (item.status === 'pending' || item.status === 'cooking') && itemElapsed > cookingLimit;

      itemsBySession[sid].push({
        ...item,
        elapsed_minutes: itemElapsed,
        cooking_time_mins: cookingLimit,
        is_overdue: isOverdue,
      });
    }

    const result = tables.map((tbl) => {
      let activeOrderCount = 0;
      let pendingItemsCount = 0;
      let overdueItemsCount = 0;
      let totalSpend = 0;
      let guestCount = Number(tbl.guest_count || 0);
      const items = tbl.session_id ? (itemsBySession[tbl.session_id as string] || []) : [];

      if (tbl.session_id) {
        activeOrderCount = items.length;
        pendingItemsCount = items.filter(i => i.status === 'pending' || i.status === 'cooking').length;
        overdueItemsCount = items.filter(i => i.is_overdue).length;

        // If buffet, calculate guest_count * buffet price + any extra paid items
        if (tbl.buffet_tier_price) {
          totalSpend = guestCount * Number(tbl.buffet_tier_price);
          for (const itm of items) {
            if (Number(itm.price) > 0) {
              totalSpend += Number(itm.price || 0) * Number(itm.quantity || 1);
            }
          }
        } else {
          // A la carte
          for (const itm of items) {
            totalSpend += Number(itm.price || 0) * Number(itm.quantity || 1);
          }
        }
      }

      const elapsedMinutes = tbl.opened_at ? getElapsedMinutes(tbl.opened_at as string) : 0;
      const buffetRemaining = tbl.buffet_end_time ? getBuffetRemainingMinutes(tbl.buffet_end_time as string) : null;

      return {
        id: tbl.id,
        store_id: tbl.store_id,
        table_number: tbl.table_number,
        zone: tbl.zone,
        capacity: tbl.capacity,
        status: tbl.status,
        service_call: tbl.service_call || null,
        assigned_staff: tbl.assigned_staff || null,
        session: tbl.session_id
          ? {
              id: tbl.session_id,
              opened_at: tbl.opened_at,
              elapsed_minutes: elapsedMinutes,
              guest_count: guestCount,
              member_id: tbl.member_id || null,
              member_name: tbl.member_name || null,
              member_nickname: tbl.member_nickname || null,
              member_phone: tbl.member_phone || null,
              buffet_tier_id: tbl.buffet_tier_id,
              buffet_tier_name: tbl.buffet_tier_name,
              buffet_tier_price: tbl.buffet_tier_price,
              buffet_tier_color: tbl.buffet_tier_color,
              buffet_end_time: tbl.buffet_end_time,
              buffet_remaining_minutes: buffetRemaining?.minutes ?? null,
              buffet_is_expired: buffetRemaining?.isExpired ?? false,
              qr_code_token: tbl.qr_code_token,
              total_spend: totalSpend,
              items_count: activeOrderCount,
              pending_items_count: pendingItemsCount,
              overdue_items_count: overdueItemsCount,
              items: items,
            }
          : null,
      };
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Failed to get tables:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Add new table
// Add new table or create entire new zone
export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { store_id, table_number, zone, capacity, mode, zone_name, table_prefix, start_number, table_count, assigned_staff } = body;

    if (!store_id) {
      return NextResponse.json({ error: 'กรุณาระบุ store_id' }, { status: 400 });
    }

    // MODE 1: Create a new Zone with multiple tables or single table
    if (mode === 'create_zone' || (!table_number && zone_name)) {
      const cleanZoneName = String(zone_name || zone || '').trim();
      if (!cleanZoneName) {
        return NextResponse.json({ error: 'กรุณาระบุชื่อโซน' }, { status: 400 });
      }

      const prefix = String(table_prefix || 'โต๊ะ').trim();
      const startNum = Number(start_number) > 0 ? Number(start_number) : 1;
      const count = Number(table_count) > 0 ? Math.min(Number(table_count), 50) : 1;
      const cleanCap = Number(capacity) > 0 ? Number(capacity) : 4;
      const staff = assigned_staff ? String(assigned_staff).trim() : null;

      const createdTables = [];
      for (let i = 0; i < count; i++) {
        const num = startNum + i;
        const tblNumber = prefix ? `${prefix} ${num}` : `${num}`;

        // Check if table already exists in this zone
        const existing = await queryOne<{ id: string }>(
          'SELECT id FROM tables WHERE store_id = ? AND table_number = ? AND zone = ?',
          [store_id, tblNumber, cleanZoneName]
        );

        if (!existing) {
          const id = 'tbl_' + Math.random().toString(36).substring(2, 9);
          await execute(`
            INSERT INTO tables (id, store_id, table_number, zone, capacity, status, assigned_staff)
            VALUES (?, ?, ?, ?, ?, 'available', ?)
          `, [id, store_id, tblNumber, cleanZoneName, cleanCap, staff]);
          createdTables.push({ id, table_number: tblNumber, zone: cleanZoneName });
        }
      }

      return NextResponse.json({
        success: true,
        zone: cleanZoneName,
        created_count: createdTables.length,
        tables: createdTables,
        message: `สร้างโซน "${cleanZoneName}" พร้อมโต๊ะ ${createdTables.length} โต๊ะเรียบร้อยแล้ว`,
      });
    }

    // MODE 2: Add Single Table
    if (!table_number?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุหมายเลขโต๊ะ' }, { status: 400 });
    }

    const cleanNumber = String(table_number).trim();
    const cleanZone = zone ? String(zone).trim() : 'โซนหลัก';
    const cleanCap = Number(capacity) > 0 ? Number(capacity) : 4;
    const staff = assigned_staff ? String(assigned_staff).trim() : null;

    // Check duplicate table number in same zone
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM tables WHERE store_id = ? AND table_number = ? AND zone = ?',
      [store_id, cleanNumber, cleanZone]
    );
    if (existing) {
      return NextResponse.json({ error: `หมายเลขโต๊ะ "${cleanNumber}" มีอยู่ในโซน "${cleanZone}" แล้ว` }, { status: 400 });
    }

    const id = 'tbl_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO tables (id, store_id, table_number, zone, capacity, status, assigned_staff)
      VALUES (?, ?, ?, ?, ?, 'available', ?)
    `, [id, store_id, cleanNumber, cleanZone, cleanCap, staff]);

    return NextResponse.json({
      success: true,
      id,
      table_number: cleanNumber,
      zone: cleanZone,
      capacity: cleanCap,
      message: `เพิ่มโต๊ะ "${cleanNumber}" เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error('Failed to add table or zone:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Update table details OR rename zone
export async function PUT(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { action, id, store_id, table_number, zone, capacity, assigned_staff, old_zone, new_zone } = body;

    if (!store_id) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // ACTION: Rename Zone
    if (action === 'rename_zone') {
      const cleanOld = String(old_zone || '').trim();
      const cleanNew = String(new_zone || '').trim();
      if (!cleanOld || !cleanNew) {
        return NextResponse.json({ error: 'กรุณาระบุชื่อโซนเดิมและชื่อโซนใหม่' }, { status: 400 });
      }

      await execute(`
        UPDATE tables
        SET zone = ?
        WHERE store_id = ? AND zone = ?
      `, [cleanNew, store_id, cleanOld]);

      return NextResponse.json({
        success: true,
        message: `เปลี่ยนชื่อโซนจาก "${cleanOld}" เป็น "${cleanNew}" เรียบร้อยแล้ว`,
      });
    }

    // ACTION: Update Table
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const table = await queryOne<{ id: string }>('SELECT id FROM tables WHERE id = ? AND store_id = ?', [id, store_id]);
    if (!table) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลโต๊ะนี้' }, { status: 404 });
    }

    const cleanNumber = table_number ? String(table_number).trim() : null;
    const cleanZone = zone ? String(zone).trim() : null;
    const cleanCap = capacity !== undefined ? Number(capacity) : null;
    const cleanStaff = assigned_staff !== undefined ? (assigned_staff ? String(assigned_staff).trim() : null) : null;

    await execute(`
      UPDATE tables
      SET table_number = COALESCE(?, table_number),
          zone = COALESCE(?, zone),
          capacity = COALESCE(?, capacity),
          assigned_staff = COALESCE(?, assigned_staff)
      WHERE id = ? AND store_id = ?
    `, [cleanNumber, cleanZone, cleanCap, cleanStaff, id, store_id]);

    return NextResponse.json({
      success: true,
      message: 'อัปเดตข้อมูลโต๊ะสำเร็จ',
    });
  } catch (error: any) {
    console.error('Failed to update table:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Delete table or Delete entire empty zone
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const storeId = url.searchParams.get('store_id');
    const zoneToDelete = url.searchParams.get('zone');

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // Option 1: Delete Zone
    if (zoneToDelete) {
      const activeInZone = await query<{ id: string }>(`
        SELECT id FROM tables 
        WHERE store_id = ? AND zone = ? AND (current_session_id IS NOT NULL OR status = 'occupied')
      `, [storeId, zoneToDelete]);

      if (activeInZone.length > 0) {
        return NextResponse.json({ error: `ไม่สามารถลบโซน "${zoneToDelete}" ได้เนื่องจากมีโต๊ะที่กำลังเปิดให้บริการอยู่` }, { status: 400 });
      }

      await execute('DELETE FROM tables WHERE store_id = ? AND zone = ?', [storeId, zoneToDelete]);
      return NextResponse.json({ success: true, message: `ลบโซน "${zoneToDelete}" เรียบร้อยแล้ว` });
    }

    // Option 2: Delete single table
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const table = await queryOne<{ status: string; current_session_id?: string }>('SELECT status, current_session_id FROM tables WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!table) {
      return NextResponse.json({ error: 'ไม่พบโต๊ะนี้' }, { status: 404 });
    }

    if (table.current_session_id || table.status === 'occupied') {
      return NextResponse.json({ error: 'ไม่สามารถลบโต๊ะที่กำลังเปิดให้บริการอยู่ได้ กรุณาปิดโต๊ะหรือคิดเงินก่อน' }, { status: 400 });
    }

    await execute('DELETE FROM tables WHERE id = ? AND store_id = ?', [id, storeId]);
    return NextResponse.json({ success: true, message: 'ลบโต๊ะเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to delete table:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
