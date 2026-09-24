import { NextResponse } from 'next/server';
import { query, execute, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureSchema();
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM admin_settings');
    const settingsMap: Record<string, string> = {};
    for (const r of rows) {
      settingsMap[r.key] = r.value;
    }

    const admin_phone = settingsMap['admin_phone'] || '081-234-5678';
    const base_yearly_price = Number(settingsMap['base_yearly_price'] || 3000);
    const monthly_surcharge_percent = Number(settingsMap['monthly_surcharge_percent'] || 30);
    const calculated_monthly_price = Math.round((base_yearly_price / 12) * (1 + monthly_surcharge_percent / 100));

    return NextResponse.json({
      admin_phone,
      base_yearly_price,
      monthly_surcharge_percent,
      calculated_monthly_price,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (error: any) {
    console.error('Failed to get admin settings:', error);
    return NextResponse.json({
      admin_phone: '081-234-5678',
      base_yearly_price: 3000,
      monthly_surcharge_percent: 30,
      calculated_monthly_price: 325,
    });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { admin_phone, base_yearly_price, monthly_surcharge_percent } = body;

    if (admin_phone !== undefined) {
      await execute('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)', ['admin_phone', String(admin_phone).trim()]);
    }
    if (base_yearly_price !== undefined) {
      await execute('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)', ['base_yearly_price', String(Number(base_yearly_price) || 3000)]);
    }
    if (monthly_surcharge_percent !== undefined) {
      await execute('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)', ['monthly_surcharge_percent', String(Number(monthly_surcharge_percent) || 0)]);
    }

    // Return updated settings
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM admin_settings');
    const settingsMap: Record<string, string> = {};
    for (const r of rows) {
      settingsMap[r.key] = r.value;
    }

    const updatedPhone = settingsMap['admin_phone'] || '081-234-5678';
    const updatedYearly = Number(settingsMap['base_yearly_price'] || 3000);
    const updatedSurcharge = Number(settingsMap['monthly_surcharge_percent'] || 30);
    const updatedMonthly = Math.round((updatedYearly / 12) * (1 + updatedSurcharge / 100));

    return NextResponse.json({
      success: true,
      settings: {
        admin_phone: updatedPhone,
        base_yearly_price: updatedYearly,
        monthly_surcharge_percent: updatedSurcharge,
        calculated_monthly_price: updatedMonthly,
      }
    });
  } catch (error: any) {
    console.error('Failed to update admin settings:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update settings' }, { status: 500 });
  }
}
