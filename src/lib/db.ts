import { createClient, Client } from '@libsql/client';

let _client: Client | null = null;

const TURSO_URL = 'libsql://kaidee789-t-chalit.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAyMTQ1ODEsImlkIjoiMDFhMGQxMTktOWEwMS03M2IzLTk3ZDUtYTQ0YzM5YTU1ZTQ4Iiwia2lkIjoiYVprbDd1c2VKMFdqTldHaXRHN3VOYkJzdGdSNTBzWDBDUUZPRC0wMWw0QSIsInJpZCI6ImY1M2Q0ZTcxLTBlNTYtNGU5Ny1hMDQ4LTkxNDYwYmU5MjlkNyJ9.w-rLfPvMBumlKilNXENjxzErV38UN_kyae1JGmn6gbfX6Ogx_LY6gfmGpA-vJXf1lZVEHfH45HcYksuJ2vkHBQ';

export function getDbClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL || TURSO_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN || TURSO_TOKEN;
    _client = createClient({ url, authToken });
  }
  return _client;
}

export async function query<T = any>(sql: string, args: (string | number | null | undefined | boolean)[] = []): Promise<T[]> {
  const client = getDbClient();
  const res = await client.execute({ sql, args: args.map(a => a === undefined ? null : a) as any });
  return res.rows as unknown as T[];
}

export async function queryOne<T = any>(sql: string, args: (string | number | null | undefined | boolean)[] = []): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] || null;
}

export async function execute(sql: string, args: (string | number | null | undefined | boolean)[] = []): Promise<void> {
  const client = getDbClient();
  await client.execute({ sql, args: args.map(a => a === undefined ? null : a) as any });
}

let _schemaChecked = false;

export async function ensureSchema(): Promise<void> {
  if (_schemaChecked) return;
  _schemaChecked = true;

  try {
    const client = getDbClient();

    // 1. Add login credentials columns to stores table if not already present
    await client.execute("ALTER TABLE stores ADD COLUMN login_username TEXT;").catch(() => {});
    await client.execute("ALTER TABLE stores ADD COLUMN login_password TEXT;").catch(() => {});

    // 2. Add extra columns to members table if not already present
    await client.execute("ALTER TABLE members ADD COLUMN points INTEGER DEFAULT 0;").catch(() => {});
    await client.execute("ALTER TABLE members ADD COLUMN notes TEXT;").catch(() => {});

    // 3. Create subscription_plans table for Super Admin pricing configuration
    await client.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_monthly INTEGER NOT NULL,
        price_yearly INTEGER NOT NULL,
        price_lifetime INTEGER NOT NULL,
        max_tables INTEGER NOT NULL,
        features TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      );
    `).catch(() => {});

    // Seed default subscription plans if empty
    const planRows = await client.execute("SELECT count(*) as count FROM subscription_plans;").catch(() => ({ rows: [] }));
    if (!planRows.rows?.[0] || Number((planRows.rows[0] as any).count) === 0) {
      await client.execute(`
        INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, price_lifetime, max_tables, features) VALUES
        ('free', 'Free Starter', 0, 0, 0, 5, '["สั่งอาหารผ่าน QR Code", "จัดการโต๊ะสูงสุด 5 โต๊ะ", "เมนูอาหารไม่จำกัด"]'),
        ('pro', 'Standard Pro', 590, 5900, 0, -1, '["ระบบ KDS จอห้องครัวสด", "โต๊ะไม่จำกัดจำนวน", "สั่งอาหารแยกคน Multi-Guest", "บุฟเฟ่ต์จับเวลา", "ระบบแคชเชียร์ & รายงานบัญชีกำไร"]'),
        ('enterprise', 'Enterprise Lifetime', 0, 0, 19900, -1, '["ซื้อขาดตลอดชีพ ไม่ต้องจ่ายรายเดือน", "ครบทุกฟังก์ชันระดับองค์กร", "อัปเกรดระบบฟรีตลอดอายุการใช้งาน", "ดูแลและให้คำปรึกษาพิเศษ"]')
      ;
    `).catch(() => {});
    }

    // 4. Create system_heartbeats table for wake-up cron & health checks
    await client.execute(`
      CREATE TABLE IF NOT EXISTS system_heartbeats (
        id TEXT PRIMARY KEY,
        event TEXT NOT NULL,
        latency_ms INTEGER,
        message TEXT,
        created_at TEXT NOT NULL
      );
    `).catch(() => {});
  } catch (err) {
    console.warn('ensureSchema non-fatal error:', err);
  }
}

