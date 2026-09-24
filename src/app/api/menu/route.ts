import { NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { MenuItem, Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    const categories = await query<Category>('SELECT * FROM categories WHERE store_id = ? ORDER BY sort_order ASC', [storeId]);
    const items = await query<MenuItem>('SELECT * FROM menu_items WHERE store_id = ? ORDER BY created_at DESC, name ASC', [storeId]);
    const tiers = await query('SELECT * FROM buffet_tiers WHERE store_id = ? ORDER BY sort_order ASC', [storeId]);

    return NextResponse.json({
      categories,
      items,
      buffet_tiers: tiers,
    });
  } catch (error) {
    console.error('Failed to get menu:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, store_id } = body;

    if (!store_id) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    if (action === 'category') {
      const { name, icon, sort_order } = body;
      const id = 'cat_' + Math.random().toString(36).substring(2, 9);
      await execute(`
        INSERT INTO categories (id, store_id, name, icon, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `, [id, store_id, name, icon || 'Utensils', Number(sort_order || 0)]);
      return NextResponse.json({ success: true, id });
    }

    // Add Menu Item
    const { name, category_id, description, price, cost_price, image_url, min_buffet_tier_id, options_json } = body;
    if (!name || !category_id) {
      return NextResponse.json({ error: 'ชื่อเมนูและหมวดหมู่จำเป็นต้องระบุ' }, { status: 400 });
    }

    const id = 'm_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO menu_items (
        id, store_id, category_id, name, description, price, cost_price, image_url, is_available, min_buffet_tier_id, options_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      id,
      store_id,
      category_id,
      name,
      description || '',
      Number(price || 0),
      Number(cost_price || 0),
      image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=400&fit=crop',
      min_buffet_tier_id || null,
      options_json || ''
    ]);

    return NextResponse.json({ success: true, id, message: 'เพิ่มเมนูอาหารเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to create menu item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, category_id, description, price, cost_price, image_url, is_available, min_buffet_tier_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item id is required' }, { status: 400 });
    }

    await execute(`
      UPDATE menu_items
      SET name = COALESCE(?, name),
          category_id = COALESCE(?, category_id),
          description = COALESCE(?, description),
          price = COALESCE(?, price),
          cost_price = COALESCE(?, cost_price),
          image_url = COALESCE(?, image_url),
          is_available = COALESCE(?, is_available),
          min_buffet_tier_id = ?
      WHERE id = ?
    `, [
      name,
      category_id,
      description,
      price !== undefined ? Number(price) : null,
      cost_price !== undefined ? Number(cost_price) : null,
      image_url,
      is_available !== undefined ? Number(is_available) : null,
      min_buffet_tier_id !== undefined ? min_buffet_tier_id : null,
      id
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update menu item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await execute('DELETE FROM menu_items WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete menu item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
