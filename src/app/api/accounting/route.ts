import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Invoice, Expense } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');
    const dateStr = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // 1. Invoices for the date (or store)
    const invoices = db.prepare(`
      SELECT * FROM invoices
      WHERE store_id = ? AND date(paid_at) = date(?)
      ORDER BY paid_at DESC
    `).all(storeId, dateStr) as unknown as Invoice[];

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalVat = 0;
    for (const inv of invoices) {
      totalRevenue += Number(inv.grand_total || 0);
      totalDiscount += Number(inv.discount_amount || 0);
      totalVat += Number(inv.vat_amount || 0);
    }

    // 2. Cost of Goods Sold (COGS) from sold items on that date
    const costRow = db.prepare(`
      SELECT SUM(oi.cost_price * oi.quantity) as total_cogs
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN invoices inv ON oi.session_id = inv.session_id
      WHERE inv.store_id = ? AND date(inv.paid_at) = date(?)
    `).get(storeId, dateStr) as unknown as { total_cogs: number | null };

    const totalCogs = Number(costRow?.total_cogs || 0);
    const grossProfit = totalRevenue - totalCogs;

    // 3. Expenses for the date
    const expenses = db.prepare(`
      SELECT * FROM expenses
      WHERE store_id = ? AND date(date) = date(?)
      ORDER BY created_at DESC
    `).all(storeId, dateStr) as unknown as Expense[];

    let totalExpenses = 0;
    for (const exp of expenses) {
      totalExpenses += Number(exp.amount || 0);
    }

    // 4. Net Profit = Gross Profit - Expenses
    const netProfit = grossProfit - totalExpenses;

    // 5. Payment method breakdown
    const cashTotal = invoices.filter(i => i.payment_method === 'cash').reduce((sum, i) => sum + Number(i.grand_total), 0);
    const promptpayTotal = invoices.filter(i => i.payment_method === 'promptpay').reduce((sum, i) => sum + Number(i.grand_total), 0);
    const cardTotal = invoices.filter(i => i.payment_method === 'card').reduce((sum, i) => sum + Number(i.grand_total), 0);

    return NextResponse.json({
      date: dateStr,
      summary: {
        total_revenue: totalRevenue,
        total_discount: totalDiscount,
        total_vat: totalVat,
        total_cogs: totalCogs,
        gross_profit: grossProfit,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        invoice_count: invoices.length,
        payment_breakdown: {
          cash: cashTotal,
          promptpay: promptpayTotal,
          card: cardTotal,
        },
      },
      invoices,
      expenses,
    });
  } catch (error) {
    console.error('Failed to get accounting data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Add new expense
export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { store_id, date, category, title, amount, notes, receipt_url } = body;

    if (!store_id || !title || !amount) {
      return NextResponse.json({ error: 'กรุณากรอกรายการและจำนวนเงินให้ครบถ้วน' }, { status: 400 });
    }

    const id = 'exp_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const expenseDate = date || now.split('T')[0];

    db.prepare(`
      INSERT INTO expenses (id, store_id, date, category, title, amount, receipt_url, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      store_id,
      expenseDate,
      category || 'วัตถุดิบ/ของสด',
      title,
      Number(amount),
      receipt_url || '',
      notes || '',
      now
    );

    return NextResponse.json({
      success: true,
      id,
      message: 'บันทึกรายจ่ายประจำวันเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('Failed to add expense:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Delete expense
export async function DELETE(req: Request) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
