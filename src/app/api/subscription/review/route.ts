import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { SubscriptionPayment } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { slip_id, action, reviewer_notes } = body; // action: 'approve' | 'reject'

    if (!slip_id || !action) {
      return NextResponse.json({ error: 'Missing slip_id or action' }, { status: 400 });
    }

    const slip = db.prepare('SELECT * FROM subscription_payments WHERE id = ?').get(slip_id) as SubscriptionPayment | undefined;
    if (!slip) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลสลิปนี้' }, { status: 404 });
    }

    if (action === 'approve') {
      db.prepare(`
        UPDATE subscription_payments
        SET status = 'approved', reviewer_notes = ?
        WHERE id = ?
      `).run(reviewer_notes || 'อนุมัติเรียบร้อย', slip_id);

      // Extend store plan
      const store = db.prepare('SELECT plan_expires_at FROM stores WHERE id = ?').get(slip.store_id) as { plan_expires_at: string } | undefined;
      let baseDate = new Date();
      if (store && store.plan_expires_at) {
        const currentExp = new Date(store.plan_expires_at);
        if (currentExp > baseDate) {
          baseDate = currentExp;
        }
      }

      if (slip.billing_cycle === 'yearly') {
        baseDate.setFullYear(baseDate.getFullYear() + 1);
      } else if (slip.billing_cycle === 'lifetime') {
        baseDate.setFullYear(baseDate.getFullYear() + 50);
      } else {
        baseDate.setDate(baseDate.getDate() + 30);
      }

      db.prepare(`
        UPDATE stores
        SET plan_id = ?, plan_billing_type = ?, plan_expires_at = ?, status = 'active'
        WHERE id = ?
      `).run(slip.plan_id, slip.billing_cycle, baseDate.toISOString(), slip.store_id);

      return NextResponse.json({
        success: true,
        message: `อนุมัติสลิปและขยายอายุการใช้งานร้านค้าจนถึง ${baseDate.toLocaleDateString('th-TH')} สำเร็จ!`,
      });
    } else {
      db.prepare(`
        UPDATE subscription_payments
        SET status = 'rejected', reviewer_notes = ?
        WHERE id = ?
      `).run(reviewer_notes || 'สลิปไม่ถูกต้อง หรือยอดเงินไม่ตรง', slip_id);

      return NextResponse.json({
        success: true,
        message: 'ปฏิเสธสลิปการโอนเงินเรียบร้อยแล้ว',
      });
    }
  } catch (error) {
    console.error('Failed to review slip:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
