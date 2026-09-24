import { NextResponse } from 'next/server';
import { query, queryOne, execute, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    await ensureSchema();

    // Health check query
    const storeCountRow = await queryOne<{ count: number }>('SELECT count(*) as count FROM stores;');
    const latencyMs = Date.now() - startTime;
    const now = new Date().toISOString();
    const id = 'hb_' + Math.random().toString(36).substring(2, 9);

    // Record heartbeat
    await execute(`
      INSERT INTO system_heartbeats (id, event, latency_ms, message, created_at)
      VALUES (?, 'daily_wakeup', ?, 'ฐานข้อมูลและแอปพลิเคชันตื่นตัว 100% พร้อมใช้งาน', ?)
    `, [id, latencyMs, now]);

    // Keep only last 50 heartbeats
    await execute(`
      DELETE FROM system_heartbeats WHERE id NOT IN (
        SELECT id FROM system_heartbeats ORDER BY created_at DESC LIMIT 50
      )
    `).catch(() => {});

    const recentHeartbeats = await query(`
      SELECT id, event, latency_ms, message, created_at
      FROM system_heartbeats
      ORDER BY created_at DESC
      LIMIT 10
    `).catch(() => []);

    return NextResponse.json({
      status: 'awake',
      message: 'ระบบและฐานข้อมูลตื่นตัว 100% พร้อมใช้งานตลอดเวลา ไม่หลับแน่นอน',
      database: 'Turso Cloud (AWS Tokyo)',
      latency_ms: latencyMs,
      stores_count: storeCountRow?.count || 0,
      timestamp: now,
      recent_heartbeats: recentHeartbeats,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (error: any) {
    console.error('Keepalive cron failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'เกิดข้อผิดพลาดในการปลุกระบบ: ' + (error?.message || 'Unknown error'),
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
