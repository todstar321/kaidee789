import { NextResponse } from 'next/server';
import { query, queryOne, execute, ensureSchema } from '@/lib/db';
import { Invoice, Expense } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');
    const mode = url.searchParams.get('mode') || (url.searchParams.get('month') ? 'monthly' : (url.searchParams.get('start_date') ? 'range' : 'daily'));
    const dateStr = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const monthStr = url.searchParams.get('month') || dateStr.substring(0, 7); // e.g. "2026-09"
    const startDateParam = url.searchParams.get('start_date') || dateStr;
    const endDateParam = url.searchParams.get('end_date') || dateStr;

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // Determine query date range
    let startDate: string;
    let endDate: string;
    let reportTitle: string;

    if (mode === 'monthly') {
      // First and last day of selected month
      const [year, month] = monthStr.split('-').map(Number);
      startDate = `${monthStr}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
      reportTitle = `รายงานประจำเดือน ${monthStr}`;
    } else if (mode === 'range') {
      startDate = startDateParam;
      endDate = endDateParam;
      reportTitle = `รายงานยอดขายช่วง ${startDate} ถึง ${endDate}`;
    } else {
      // Single day
      startDate = dateStr;
      endDate = dateStr;
      reportTitle = `สรุปยอดขายประจำวัน ${dateStr}`;
    }

    // 1. Fetch Invoices in the range
    const invoices = await query<Invoice>(`
      SELECT * FROM invoices
      WHERE store_id = ? AND date(paid_at) >= date(?) AND date(paid_at) <= date(?)
      ORDER BY paid_at DESC
    `, [storeId, startDate, endDate]);

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalVat = 0;
    let totalServiceCharge = 0;
    for (const inv of invoices) {
      totalRevenue += Number(inv.grand_total || 0);
      totalDiscount += Number(inv.discount_amount || 0);
      totalVat += Number(inv.vat_amount || 0);
      totalServiceCharge += Number(inv.service_charge || 0);
    }

    // 2. Fetch Cost of Goods Sold (COGS) from order_items
    const costRow = await queryOne<{ total_cogs: number | null }>(`
      SELECT SUM(oi.cost_price * oi.quantity) as total_cogs
      FROM order_items oi
      JOIN invoices inv ON oi.session_id = inv.session_id
      WHERE inv.store_id = ? AND date(inv.paid_at) >= date(?) AND date(inv.paid_at) <= date(?)
    `, [storeId, startDate, endDate]);

    const totalCogs = Number(costRow?.total_cogs || 0);
    const grossProfit = totalRevenue - totalCogs;

    // 3. Fetch Expenses in the range
    const expenses = await query<Expense>(`
      SELECT * FROM expenses
      WHERE store_id = ? AND date(date) >= date(?) AND date(date) <= date(?)
      ORDER BY date DESC, created_at DESC
    `, [storeId, startDate, endDate]);

    let totalExpenses = 0;
    for (const exp of expenses) {
      totalExpenses += Number(exp.amount || 0);
    }

    // 4. Net Profit
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const avgTicket = invoices.length > 0 ? totalRevenue / invoices.length : 0;

    // 5. Payment method breakdown
    const cashTotal = invoices.filter(i => i.payment_method === 'cash').reduce((sum, i) => sum + Number(i.grand_total), 0);
    const promptpayTotal = invoices.filter(i => i.payment_method === 'promptpay' || i.payment_method === 'transfer').reduce((sum, i) => sum + Number(i.grand_total), 0);
    const cardTotal = invoices.filter(i => i.payment_method === 'card' || i.payment_method === 'credit_card').reduce((sum, i) => sum + Number(i.grand_total), 0);
    const otherPaymentTotal = totalRevenue - (cashTotal + promptpayTotal + cardTotal);

    // 6. Day-by-Day Breakdown (Grouped by date) for monthly and range views
    let dailyBreakdown: Array<{
      date: string;
      invoice_count: number;
      revenue: number;
      discount: number;
      vat: number;
      cogs: number;
      expenses: number;
      net_profit: number;
    }> = [];

    if (mode === 'monthly' || mode === 'range') {
      // Invoices grouped by date
      const invByDate = await query<{
        d: string;
        cnt: number;
        rev: number;
        disc: number;
        vat: number;
      }>(`
        SELECT 
          date(paid_at) as d,
          COUNT(id) as cnt,
          COALESCE(SUM(grand_total), 0) as rev,
          COALESCE(SUM(discount_amount), 0) as disc,
          COALESCE(SUM(vat_amount), 0) as vat
        FROM invoices
        WHERE store_id = ? AND date(paid_at) >= date(?) AND date(paid_at) <= date(?)
        GROUP BY date(paid_at)
        ORDER BY date(paid_at) ASC
      `, [storeId, startDate, endDate]);

      // Expenses grouped by date
      const expByDate = await query<{
        d: string;
        exp: number;
      }>(`
        SELECT 
          date(date) as d,
          COALESCE(SUM(amount), 0) as exp
        FROM expenses
        WHERE store_id = ? AND date(date) >= date(?) AND date(date) <= date(?)
        GROUP BY date(date)
      `, [storeId, startDate, endDate]);

      // COGS grouped by date
      const cogsByDate = await query<{
        d: string;
        cogs: number;
      }>(`
        SELECT 
          date(inv.paid_at) as d,
          COALESCE(SUM(oi.cost_price * oi.quantity), 0) as cogs
        FROM order_items oi
        JOIN invoices inv ON oi.session_id = inv.session_id
        WHERE inv.store_id = ? AND date(inv.paid_at) >= date(?) AND date(inv.paid_at) <= date(?)
        GROUP BY date(inv.paid_at)
      `, [storeId, startDate, endDate]);

      const expMap = new Map(expByDate.map(e => [e.d, Number(e.exp || 0)]));
      const cogsMap = new Map(cogsByDate.map(c => [c.d, Number(c.cogs || 0)]));
      const invMap = new Map(invByDate.map(i => [i.d, i]));

      // Collect all distinct dates in range with activity
      const allDates = new Set<string>();
      invByDate.forEach(i => allDates.add(i.d));
      expByDate.forEach(e => allDates.add(e.d));
      cogsByDate.forEach(c => allDates.add(c.d));

      const sortedDates = Array.from(allDates).sort();
      dailyBreakdown = sortedDates.map(d => {
        const invRow = invMap.get(d);
        const dayRev = Number(invRow?.rev || 0);
        const dayCogs = cogsMap.get(d) || 0;
        const dayExp = expMap.get(d) || 0;
        const dayNet = dayRev - dayCogs - dayExp;
        return {
          date: d,
          invoice_count: Number(invRow?.cnt || 0),
          revenue: dayRev,
          discount: Number(invRow?.disc || 0),
          vat: Number(invRow?.vat || 0),
          cogs: dayCogs,
          expenses: dayExp,
          net_profit: dayNet,
        };
      });
    }

    return NextResponse.json({
      mode,
      title: reportTitle,
      date: dateStr,
      month: monthStr,
      start_date: startDate,
      end_date: endDate,
      summary: {
        total_revenue: totalRevenue,
        total_discount: totalDiscount,
        total_vat: totalVat,
        total_service_charge: totalServiceCharge,
        total_cogs: totalCogs,
        gross_profit: grossProfit,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        profit_margin: profitMargin,
        invoice_count: invoices.length,
        avg_ticket: avgTicket,
        payment_breakdown: {
          cash: cashTotal,
          promptpay: promptpayTotal,
          card: cardTotal,
          other: Math.max(0, otherPaymentTotal),
        },
      },
      daily_breakdown: dailyBreakdown,
      invoices,
      expenses,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Failed to get accounting data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Add new expense
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { store_id, date, category, title, amount, notes, receipt_url } = body;

    if (!store_id || !title || !amount) {
      return NextResponse.json({ error: 'กรุณากรอกรายการและจำนวนเงินให้ครบถ้วน' }, { status: 400 });
    }

    const id = 'exp_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const expenseDate = date || now.split('T')[0];

    await execute(`
      INSERT INTO expenses (id, store_id, date, category, title, amount, receipt_url, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      store_id,
      expenseDate,
      category || 'วัตถุดิบ/ของสด',
      title,
      Number(amount),
      receipt_url || '',
      notes || '',
      now
    ]);

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
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await execute('DELETE FROM expenses WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
