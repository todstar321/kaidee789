import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { OrderItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');
    const status = url.searchParams.get('status'); // e.g. 'active', 'ready', 'all'

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // Kitchen KDS query: fetch live order tickets
    let query = `
      SELECT oi.*,
             t.table_number,
             t.zone as table_zone,
             g.guest_label,
             g.nickname as guest_nickname,
             m.image_url,
             m.cost_price as default_cost
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN tables t ON o.table_id = t.id
      JOIN guests g ON oi.guest_id = g.id
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE o.store_id = ?
    `;

    const params: string[] = [storeId];
    if (status === 'active') {
      query += ` AND oi.status IN ('pending', 'cooking')`;
    } else if (status === 'ready') {
      query += ` AND oi.status = 'ready'`;
    } else if (status && status !== 'all') {
      query += ` AND oi.status = ?`;
      params.push(status);
    } else {
      query += ` AND oi.status != 'cancelled'`;
    }

    query += ` ORDER BY oi.created_at ASC`;

    const items = db.prepare(query).all(...params) as unknown as (OrderItem & {
      table_number: string;
      table_zone: string;
      image_url: string;
    })[];

    return NextResponse.json(items);
  } catch (error) {
    console.error('Failed to get kitchen orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { store_id, session_id, table_id, guest_id, items } = body;

    if (!store_id || !session_id || !table_id || !guest_id || !items || !items.length) {
      return NextResponse.json({ error: 'ข้อมูลคำสั่งซื้อไม่ครบถ้วน' }, { status: 400 });
    }

    // Verify session is active
    const session = db.prepare("SELECT status FROM table_sessions WHERE id = ?").get(session_id) as unknown as { status: string } | undefined;
    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'เซสชันนี้หมดอายุหรือปิดโต๊ะไปแล้ว ไม่สามารถสั่งอาหารได้' }, { status: 403 });
    }

    // Get guest label
    const guest = db.prepare("SELECT guest_label, nickname FROM guests WHERE id = ?").get(guest_id) as unknown as { guest_label: string; nickname: string } | undefined;
    const guestLabel = guest ? guest.guest_label : 'ลูกค้า';
    const guestNickname = guest ? guest.nickname : '';

    const orderId = 'ord_' + Math.random().toString(36).substring(2, 9);
    const countRow = db.prepare("SELECT COUNT(*) as c FROM orders WHERE store_id = ?").get(store_id) as unknown as { c: number };
    const orderNumber = '#' + String((countRow.c || 0) + 1).padStart(2, '0');
    const now = new Date().toISOString();

    let totalAmount = 0;
    for (const itm of items) {
      totalAmount += Number(itm.price || 0) * Number(itm.quantity || 1);
    }

    // Create Order
    db.prepare(`
      INSERT INTO orders (id, store_id, session_id, table_id, order_number, status, total_amount, created_at)
      VALUES (?, ?, ?, ?, ?, 'cooking', ?, ?)
    `).run(orderId, store_id, session_id, table_id, orderNumber, totalAmount, now);

    // Create Order Items
    for (const itm of items) {
      const orderItemId = 'oi_' + Math.random().toString(36).substring(2, 9);
      db.prepare(`
        INSERT INTO order_items (
          id, order_id, session_id, guest_id, guest_label, guest_nickname,
          menu_item_id, item_name, quantity, price, cost_price,
          selected_options, notes, status, customer_received, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
      `).run(
        orderItemId,
        orderId,
        session_id,
        guest_id,
        guestLabel,
        guestNickname,
        itm.menu_item_id,
        itm.item_name,
        Number(itm.quantity || 1),
        Number(itm.price || 0),
        Number(itm.cost_price || 0),
        itm.selected_options || '',
        itm.notes || '',
        now
      );
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      message: 'ส่งออเดอร์เข้าห้องครัวเรียบร้อยแล้ว!',
    });
  } catch (error) {
    console.error('Failed to submit order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
