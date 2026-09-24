import { createClient, Client } from '@libsql/client';

let _client: Client | null = null;

export function getDbClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL || 'file:./data/restaurant_saas.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
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
