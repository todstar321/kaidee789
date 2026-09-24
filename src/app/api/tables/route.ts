import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getElapsedMinutes, getBuffetRemainingMinutes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    const tables = db.prepare(`
      SELECT t.*,
             ts.id as session_id,
             ts.opened_at,
             ts.guest_count,
             ts.buffet_tier_id,
             ts.buffet_end_time,
             ts.qr_code_token,
             bt.name as buffet_tier_name,
             bt.price as buffet_tier_price,
             bt.color as buffet_tier_color
      FROM tables t
      LEFT JOIN table_sessions ts ON t.current_session_id = ts.id AND ts.status = 'active'
      LEFT JOIN buffet_tiers bt ON ts.buffet_tier_id = bt.id
      WHERE t.store_id = ?
      ORDER BY t.zone ASC, t.table_number ASC
    `).all(storeId) as Record<string, unknown>[];

    const result = tables.map((tbl) => {
      let activeOrderCount = 0;
      let totalSpend = 0;
      let orderItems: unknown[] = [];
      let guestCount = Number(tbl.guest_count || 0);

      if (tbl.session_id) {
        // Calculate total spend and items
        const items = db.prepare(`
          SELECT oi.*, m.image_url
          FROM order_items oi
          LEFT JOIN menu_items m ON oi.menu_item_id = m.id
          WHERE oi.session_id = ?
          ORDER BY oi.created_at DESC
        `).all(tbl.session_id as string) as Record<string, unknown>[];

        orderItems = items;
        activeOrderCount = items.length;

        // If buffet, calculate guest_count * buffet price + any extra items
        if (tbl.buffet_tier_price) {
          totalSpend = guestCount * Number(tbl.buffet_tier_price);
          // add any non-buffet paid items if any
          for (const itm of items) {
            totalSpend += Number(itm.price || 0) * Number(itm.quantity || 1);
          }
        } else {
          // A la carte: sum of order item price * quantity
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
        session: tbl.session_id
          ? {
              id: tbl.session_id,
              opened_at: tbl.opened_at,
              elapsed_minutes: elapsedMinutes,
              guest_count: guestCount,
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
              items: orderItems,
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
