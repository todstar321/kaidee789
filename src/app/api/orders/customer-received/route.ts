import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { item_id, received } = body; // received: 0 or 1

    if (!item_id) {
      return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });
    }

    db.prepare('UPDATE order_items SET customer_received = ? WHERE id = ?').run(received ? 1 : 0, item_id);

    return NextResponse.json({
      success: true,
      received: received ? 1 : 0,
    });
  } catch (error) {
    console.error('Failed to update customer received state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
