import { NextResponse } from 'next/server';
import { query, execute, ensureSchema } from '@/lib/db';
import { SubscriptionPlanConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureSchema();
    const plans = await query<SubscriptionPlanConfig>(`
      SELECT id, name, price_monthly, price_yearly, price_lifetime, max_tables, features, updated_at
      FROM subscription_plans
      ORDER BY 
        CASE id 
          WHEN 'free' THEN 1 
          WHEN 'pro' THEN 2 
          WHEN 'enterprise' THEN 3 
          ELSE 4 
        END ASC
    `);

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Failed to get subscription plans:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const plansToUpdate = Array.isArray(body) ? body : [body];
    const now = new Date().toISOString();

    for (const plan of plansToUpdate) {
      if (!plan.id) continue;

      await execute(`
        UPDATE subscription_plans
        SET name = COALESCE(?, name),
            price_monthly = COALESCE(?, price_monthly),
            price_yearly = COALESCE(?, price_yearly),
            price_lifetime = COALESCE(?, price_lifetime),
            max_tables = COALESCE(?, max_tables),
            features = COALESCE(?, features),
            updated_at = ?
        WHERE id = ?
      `, [
        plan.name,
        plan.price_monthly !== undefined ? Number(plan.price_monthly) : null,
        plan.price_yearly !== undefined ? Number(plan.price_yearly) : null,
        plan.price_lifetime !== undefined ? Number(plan.price_lifetime) : null,
        plan.max_tables !== undefined ? Number(plan.max_tables) : null,
        typeof plan.features === 'object' ? JSON.stringify(plan.features) : plan.features,
        now,
        plan.id
      ]);
    }

    const updatedPlans = await query(`
      SELECT id, name, price_monthly, price_yearly, price_lifetime, max_tables, features, updated_at
      FROM subscription_plans
      ORDER BY CASE id WHEN 'free' THEN 1 WHEN 'pro' THEN 2 WHEN 'enterprise' THEN 3 ELSE 4 END ASC
    `);

    return NextResponse.json({ success: true, plans: updatedPlans });
  } catch (error) {
    console.error('Failed to update subscription plans:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
