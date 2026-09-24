import { NextResponse } from 'next/server';
import { query, queryOne, ensureSchema } from '@/lib/db';
import { Member, Invoice } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');
    const month = url.searchParams.get('month'); // e.g. "2026-09"
    const memberId = url.searchParams.get('member_id'); // If requesting visit history for 1 member

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // If specific member's invoice history requested
    if (memberId) {
      const invoices = await query<Invoice>(`
        SELECT * FROM invoices 
        WHERE store_id = ? AND member_id = ?
        ORDER BY paid_at DESC LIMIT 50
      `, [storeId, memberId]);
      return NextResponse.json({ invoices });
    }

    // 1. Fetch all members of this store
    const members = await query<Member>(`
      SELECT * FROM members 
      WHERE store_id = ?
      ORDER BY created_at DESC
    `, [storeId]);

    // 2. Fetch invoice statistics grouped by member_id
    const lifetimeStats = await query<{
      member_id: string;
      total_visits: number;
      total_spent: number;
      last_visit: string;
    }>(`
      SELECT 
        member_id,
        COUNT(id) as total_visits,
        COALESCE(SUM(grand_total), 0) as total_spent,
        MAX(paid_at) as last_visit
      FROM invoices
      WHERE store_id = ? AND member_id IS NOT NULL AND member_id != ''
      GROUP BY member_id
    `, [storeId]);

    const lifetimeStatsMap = new Map<string, { total_visits: number; total_spent: number; last_visit: string }>();
    lifetimeStats.forEach(s => {
      lifetimeStatsMap.set(s.member_id, {
        total_visits: Number(s.total_visits || 0),
        total_spent: Number(s.total_spent || 0),
        last_visit: s.last_visit,
      });
    });

    // 3. If a specific month is selected (e.g. "2026-09"), query monthly stats
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const monthPattern = `${targetMonth}%`;

    const monthStats = await query<{
      member_id: string;
      month_visits: number;
      month_spent: number;
    }>(`
      SELECT 
        member_id,
        COUNT(id) as month_visits,
        COALESCE(SUM(grand_total), 0) as month_spent
      FROM invoices
      WHERE store_id = ? AND member_id IS NOT NULL AND member_id != '' AND paid_at LIKE ?
      GROUP BY member_id
    `, [storeId, monthPattern]);

    const monthStatsMap = new Map<string, { month_visits: number; month_spent: number }>();
    monthStats.forEach(s => {
      monthStatsMap.set(s.member_id, {
        month_visits: Number(s.month_visits || 0),
        month_spent: Number(s.month_spent || 0),
      });
    });

    // Merge stats with members
    const membersWithStats = members.map(m => {
      const life = lifetimeStatsMap.get(m.id) || { total_visits: 0, total_spent: 0, last_visit: '' };
      const mStat = monthStatsMap.get(m.id) || { month_visits: 0, month_spent: 0 };
      return {
        ...m,
        total_visits: life.total_visits,
        total_spent: life.total_spent,
        last_visit: life.last_visit,
        month_visits: mStat.month_visits,
        month_spent: mStat.month_spent,
      };
    });

    // Calculate Leaderboards
    // Top Most Frequent Visitor of the month
    const topFrequentMonth = [...membersWithStats]
      .filter(m => m.month_visits > 0)
      .sort((a, b) => b.month_visits - a.month_visits)[0] || null;

    // Top Spender of the month
    const topSpenderMonth = [...membersWithStats]
      .filter(m => m.month_spent > 0)
      .sort((a, b) => b.month_spent - a.month_spent)[0] || null;

    // Monthly total member revenue
    const totalMonthRevenue = membersWithStats.reduce((acc, m) => acc + m.month_spent, 0);

    return NextResponse.json({
      members: membersWithStats,
      selected_month: targetMonth,
      summary: {
        total_members: members.length,
        total_month_revenue: totalMonthRevenue,
        top_frequent: topFrequentMonth,
        top_spender: topSpenderMonth,
      }
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });

  } catch (error) {
    console.error('Failed to get member stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
