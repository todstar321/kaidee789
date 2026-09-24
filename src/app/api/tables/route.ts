import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getElapsedMinutes, getBuffetRemainingMinutes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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
        session: tbl.session_id
          ? {
              id: tbl.session_id,
              opened_at: tbl.opened_at,
              elapsed_minutes: elapsedMinutes,
              guest_count: guestCount,
              member_id: tbl.member_id || null,
              member_name: tbl.member_name || null,
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get tables:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
