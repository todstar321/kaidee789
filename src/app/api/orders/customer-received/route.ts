import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { item_id, received } = body;

    if (!item_id) {
      return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });
    }

    await execute('UPDATE order_items SET customer_received = ? WHERE id = ?', [received ? 1 : 0, item_id]);

    return NextResponse.json({
      success: true,
      received: received ? 1 : 0,
    });
  } catch (error) {
    console.error('Failed to update customer received state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
