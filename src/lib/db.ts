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
