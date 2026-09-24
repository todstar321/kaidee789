import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { SubscriptionPayment } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slip_id, action, reviewer_notes } = body; // action: 'approve' | 'reject'

    if (!slip_id || !action) {
      return NextResponse.json({ error: 'Missing slip_id or action' }, { status: 400 });
    }

    const slip = await queryOne<SubscriptionPayment>('SELECT * FROM subscription_payments WHERE id = ?', [slip_id]);
    if (!slip) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลสลิปนี้' }, { status: 404 });
    }

    if (action === 'approve') {
      await execute(`
        UPDATE subscription_payments
        SET status = 'approved', reviewer_notes = ?
        WHERE id = ?
      `, [reviewer_notes || 'อนุมัติเรียบร้อย', slip_id]);

      // Extend store plan
      const store = await queryOne<{ plan_expires_at: string }>('SELECT plan_expires_at FROM stores WHERE id = ?', [slip.store_id]);
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

      await execute(`
        UPDATE stores
        SET plan_id = ?, plan_billing_type = ?, plan_expires_at = ?, status = 'active'
        WHERE id = ?
      `, [slip.plan_id, slip.billing_cycle, baseDate.toISOString(), slip.store_id]);

      return NextResponse.json({
        success: true,
        message: `อนุมัติสลิปและขยายอายุการใช้งานร้านค้าจนถึง ${baseDate.toLocaleDateString('th-TH')} สำเร็จ!`,
      });
    } else {
      await execute(`
        UPDATE subscription_payments
        SET status = 'rejected', reviewer_notes = ?
        WHERE id = ?
      `, [reviewer_notes || 'สลิปไม่ถูกต้อง หรือยอดเงินไม่ตรง', slip_id]);

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
