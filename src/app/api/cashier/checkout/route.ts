import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Table, TableSession, BuffetTier, OrderItem } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const {
      store_id,
      table_id,
      session_id,
      payment_method, // 'cash' | 'promptpay' | 'card'
      cash_received,
      discount_amount,
      vat_amount,
      service_charge,
      staff_name,
    } = body;

    if (!store_id || !table_id || !session_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(table_id) as unknown as Table | undefined;
    const session = db.prepare('SELECT * FROM table_sessions WHERE id = ?').get(session_id) as unknown as TableSession | undefined;

    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'เซสชันนี้ไม่อยู่ในสถานะเปิดใช้งาน หรือถูกปิดไปแล้ว' }, { status: 400 });
    }

    // Fetch all items for this session
    const items = db.prepare(`
      SELECT oi.*, g.guest_label, g.nickname as guest_nickname
      FROM order_items oi
      JOIN guests g ON oi.guest_id = g.id
      WHERE oi.session_id = ? AND oi.status != 'cancelled'
    `).all(session_id) as unknown as OrderItem[];

    let subtotal = 0;
    let buffetDetails: { name: string; price: number; count: number; total: number } | null = null;

    if (session.buffet_tier_id) {
      const tier = db.prepare('SELECT * FROM buffet_tiers WHERE id = ?').get(session.buffet_tier_id) as unknown as BuffetTier | undefined;
      if (tier) {
        const guestCount = session.guest_count || 1;
        const buffetSum = guestCount * Number(tier.price);
        buffetDetails = {
          name: tier.name,
          price: Number(tier.price),
          count: guestCount,
          total: buffetSum,
        };
        subtotal += buffetSum;
      }
      // Add any extra paid items
      for (const itm of items) {
        if (Number(itm.price) > 0) {
          subtotal += Number(itm.price) * Number(itm.quantity || 1);
        }
      }
    } else {
      // A la carte
      for (const itm of items) {
        subtotal += Number(itm.price || 0) * Number(itm.quantity || 1);
      }
    }

    const discount = Number(discount_amount || 0);
    const vat = Number(vat_amount || 0);
    const sc = Number(service_charge || 0);
    const grandTotal = Math.max(0, subtotal - discount + vat + sc);

    const cashRec = Number(cash_received || 0);
    const changeGiven = payment_method === 'cash' ? Math.max(0, cashRec - grandTotal) : 0;

    const invoiceId = 'inv_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    // 1. Insert Invoice
    db.prepare(`
      INSERT INTO invoices (
        id, store_id, session_id, table_id, table_number,
        subtotal, discount_amount, vat_amount, service_charge, grand_total,
        payment_method, cash_received, change_given, paid_at, staff_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      store_id,
      session_id,
      table_id,
      table?.table_number || 'โต๊ะ',
      subtotal,
      discount,
      vat,
      sc,
      grandTotal,
      payment_method || 'cash',
      cashRec,
      changeGiven,
      now,
      staff_name || 'แคชเชียร์'
    );

    // 2. Mark session completed
    db.prepare(`
      UPDATE table_sessions
      SET status = 'completed', closed_at = ?
      WHERE id = ?
    `).run(now, session_id);

    // 3. Mark all order items served if still cooking
    db.prepare(`
      UPDATE order_items
      SET status = 'served'
      WHERE session_id = ? AND status != 'cancelled'
    `).run(session_id);

    // 4. Free the table & clear session token
    db.prepare(`
      UPDATE tables
      SET status = 'available', current_session_id = NULL
      WHERE id = ?
    `).run(table_id);

    return NextResponse.json({
      success: true,
      invoice_id: invoiceId,
      subtotal,
      discount_amount: discount,
      vat_amount: vat,
      service_charge: sc,
      grand_total: grandTotal,
      cash_received: cashRec,
      change_given: changeGiven,
      payment_method,
      paid_at: now,
      table_number: table?.table_number,
      buffet_details: buffetDetails,
      items,
      message: 'ชำระเงินและปิดโต๊ะเรียบร้อยแล้ว QR Code เดิมหมดอายุทันที',
    });
  } catch (error) {
    console.error('Failed to checkout:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
