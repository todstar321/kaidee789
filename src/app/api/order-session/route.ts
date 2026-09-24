import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Store, Table, TableSession, BuffetTier, Category, MenuItem, OrderItem } from '@/lib/types';
import { getBuffetRemainingMinutes, getElapsedMinutes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');
    const tableId = url.searchParams.get('table_id');
    const token = url.searchParams.get('token');
    const existingGuestId = url.searchParams.get('guest_id');

    if (!storeId || !tableId || !token) {
      return NextResponse.json({ valid: false, error: 'ข้อมูลโต๊ะหรือ QR Code ไม่ถูกต้อง' }, { status: 400 });
    }

    // 1. Verify session
    const session = db.prepare(`
      SELECT * FROM table_sessions
      WHERE id = ? AND store_id = ? AND table_id = ? AND status = 'active' AND qr_code_token = ?
    `).get(token, storeId, tableId, token) as unknown as TableSession | undefined;

    if (!session) {
      return NextResponse.json({
        valid: false,
        error: 'เซสชัน QR Code นี้หมดอายุแล้ว หรือโต๊ะนี้ได้ทำการเช็กบิลปิดโต๊ะไปแล้ว กรุณาสแกน QR Code ใหม่ หรือติดต่อพนักงาน',
      }, { status: 403 });
    }

    // 2. Fetch Store & Table
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(storeId) as unknown as Store;
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId) as unknown as Table;

    // 3. Resolve Guest Identity (1-A, 1-B, etc.)
    let currentGuest: Record<string, unknown> | null = null;
    if (existingGuestId) {
      const found = db.prepare('SELECT * FROM guests WHERE id = ? AND session_id = ?').get(existingGuestId, session.id);
      if (found) {
        currentGuest = found as Record<string, unknown>;
      }
    }

    if (!currentGuest) {
      // Create next guest code: A, B, C, D...
      const currentGuests = db.prepare('SELECT * FROM guests WHERE session_id = ? ORDER BY joined_at ASC').all(session.id) as Record<string, unknown>[];
      const guestLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const nextIndex = currentGuests.length;
      const nextLetter = guestLetters[nextIndex % guestLetters.length] || `G${nextIndex + 1}`;
      const newGuestId = 'g_' + Math.random().toString(36).substring(2, 9);
      const guestLabel = `${table.table_number}-${nextLetter}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO guests (id, session_id, guest_code, guest_label, nickname, joined_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newGuestId, session.id, nextLetter, guestLabel, `ผู้ร่วมโต๊ะ ${nextLetter}`, now);

      currentGuest = {
        id: newGuestId,
        session_id: session.id,
        guest_code: nextLetter,
        guest_label: guestLabel,
        nickname: `ผู้ร่วมโต๊ะ ${nextLetter}`,
        joined_at: now,
      };
    }

    // 4. All guests in this table
    const allGuests = db.prepare('SELECT * FROM guests WHERE session_id = ? ORDER BY joined_at ASC').all(session.id);

    // 5. Buffet Tier info (if buffet)
    let buffetTier: BuffetTier | null = null;
    let buffetRemaining = null;
    if (session.buffet_tier_id) {
      buffetTier = db.prepare('SELECT * FROM buffet_tiers WHERE id = ?').get(session.buffet_tier_id) as unknown as BuffetTier;
      buffetRemaining = getBuffetRemainingMinutes(session.buffet_end_time);
    }

    // 6. Categories & Menu Items
    const categories = db.prepare('SELECT * FROM categories WHERE store_id = ? ORDER BY sort_order ASC').all(storeId) as unknown as Category[];
    let menuItems = db.prepare('SELECT * FROM menu_items WHERE store_id = ? AND is_available = 1').all(storeId) as unknown as MenuItem[];

    // If buffet, mark items whether they are included in customer's tier
    if (store.type === 'buffet' && buffetTier) {
      menuItems = menuItems.map(item => {
        const isIncluded = !item.min_buffet_tier_id || item.min_buffet_tier_id === buffetTier?.id;
        return {
          ...item,
          is_included_in_tier: isIncluded,
        };
      });
    }

    // 7. Active Table Orders and Order Items
    const orderItems = db.prepare(`
      SELECT oi.*, m.image_url, g.guest_label, g.nickname as guest_nickname
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      LEFT JOIN guests g ON oi.guest_id = g.id
      WHERE oi.session_id = ?
      ORDER BY oi.created_at DESC
    `).all(session.id) as unknown as (OrderItem & { image_url?: string })[];

    // 8. Individual totals breakdown
    const guestSpendMap: Record<string, { guest_label: string; nickname: string; total: number; count: number }> = {};
    for (const g of allGuests as { id: string; guest_label: string; nickname: string }[]) {
      guestSpendMap[g.id] = {
        guest_label: g.guest_label,
        nickname: g.nickname,
        total: 0,
        count: 0,
      };
    }

    let grandTotal = 0;
    if (store.type === 'buffet' && buffetTier) {
      grandTotal = (session.guest_count || 1) * Number(buffetTier.price);
    }

    for (const item of orderItems) {
      const itemSubtotal = Number(item.price || 0) * Number(item.quantity || 1);
      grandTotal += itemSubtotal;
      if (guestSpendMap[item.guest_id]) {
        guestSpendMap[item.guest_id].total += itemSubtotal;
        guestSpendMap[item.guest_id].count += Number(item.quantity || 1);
      }
    }

    return NextResponse.json({
      valid: true,
      store,
      table,
      session: {
        id: session.id,
        opened_at: session.opened_at,
        elapsed_minutes: getElapsedMinutes(session.opened_at),
        guest_count: session.guest_count,
        buffet_tier: buffetTier,
        buffet_remaining: buffetRemaining,
      },
      current_guest: currentGuest,
      all_guests: allGuests,
      guest_spend_map: guestSpendMap,
      grand_total: grandTotal,
      categories,
      menu_items: menuItems,
      order_items: orderItems,
    });
  } catch (error) {
    console.error('Failed to get order session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Update guest nickname (e.g. customer changes "โต๊ะ 1-A" nickname to "พี่ต้น")
export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { guest_id, nickname } = body;

    if (!guest_id || !nickname) {
      return NextResponse.json({ error: 'Missing guest_id or nickname' }, { status: 400 });
    }

    db.prepare('UPDATE guests SET nickname = ? WHERE id = ?').run(nickname, guest_id);
    return NextResponse.json({ success: true, nickname });
  } catch (error) {
    console.error('Failed to update nickname:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
