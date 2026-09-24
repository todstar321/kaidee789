import { NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { MenuItem, Category } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    let categories = await query<Category>('SELECT * FROM categories WHERE store_id = ? ORDER BY sort_order ASC', [storeId]);

    // If store has 0 categories, auto-seed default categories
    if (categories.length === 0) {
      const defaultCats = [
        { id: 'cat_' + Math.random().toString(36).substring(2, 9), name: '🔥 เมนูแนะนำยอดฮิต', icon: 'Flame', sort_order: 1 },
        { id: 'cat_' + Math.random().toString(36).substring(2, 9), name: '🍲 ต้ม / แกง / ซุป', icon: 'Soup', sort_order: 2 },
        { id: 'cat_' + Math.random().toString(36).substring(2, 9), name: '🍳 ผัด / ทอด / จานเดียว', icon: 'Utensils', sort_order: 3 },
        { id: 'cat_' + Math.random().toString(36).substring(2, 9), name: '🥤 เครื่องดื่ม & ของหวาน', icon: 'Coffee', sort_order: 4 },
      ];
      for (const dc of defaultCats) {
        await execute(
          'INSERT INTO categories (id, store_id, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
          [dc.id, storeId, dc.name, dc.icon, dc.sort_order]
        ).catch(() => {});
      }
      categories = await query<Category>('SELECT * FROM categories WHERE store_id = ? ORDER BY sort_order ASC', [storeId]);
    }

    const items = await query<MenuItem>('SELECT * FROM menu_items WHERE store_id = ? ORDER BY created_at DESC, name ASC', [storeId]);
    const tiers = await query('SELECT * FROM buffet_tiers WHERE store_id = ? ORDER BY sort_order ASC', [storeId]);

    return NextResponse.json({
      categories,
      items,
      buffet_tiers: tiers,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      }
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

    // Add or Create Category
    if (action === 'category') {
      const { name, icon, sort_order } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'กรุณาระบุชื่อหมวดหมู่อาหาร' }, { status: 400 });
      }

      const id = 'cat_' + Math.random().toString(36).substring(2, 9);
      const catIcon = icon || 'Utensils';
      const catOrder = Number(sort_order || 0);

      await execute(`
        INSERT INTO categories (id, store_id, name, icon, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `, [id, store_id, name.trim(), catIcon, catOrder]);

      const newCategory = {
        id,
        store_id,
        name: name.trim(),
        icon: catIcon,
        sort_order: catOrder,
      };

      return NextResponse.json({
        success: true,
        id,
        category: newCategory,
        message: 'เพิ่มหมวดหมู่อาหารเรียบร้อยแล้ว'
      });
    }

    // Add Menu Item
    const { name, category_id, description, price, cost_price, cooking_time_mins, image_url, min_buffet_tier_id, options_json } = body;
    if (!name || !category_id) {
      return NextResponse.json({ error: 'ชื่อเมนูและหมวดหมู่จำเป็นต้องระบุ' }, { status: 400 });
    }

    const id = 'm_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO menu_items (
        id, store_id, category_id, name, description, price, cost_price, cooking_time_mins, image_url, is_available, min_buffet_tier_id, options_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      id,
      store_id,
      category_id,
      name,
      description || '',
      Number(price || 0),
      Number(cost_price || 0),
      Number(cooking_time_mins || 10),
      image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=400&fit=crop',
      min_buffet_tier_id || null,
      options_json || ''
    ]);

    return NextResponse.json({ success: true, id, message: 'เพิ่มเมนูอาหารเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to create menu item or category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // Update Category
    if (action === 'category') {
      const { id, store_id, name, icon, sort_order } = body;
      if (!id || !name || !name.trim()) {
        return NextResponse.json({ error: 'ID และชื่อหมวดหมู่จำเป็นต้องระบุ' }, { status: 400 });
      }

      await execute(`
        UPDATE categories
        SET name = ?,
            icon = COALESCE(?, icon),
            sort_order = COALESCE(?, sort_order)
        WHERE id = ? AND store_id = ?
      `, [name.trim(), icon || null, sort_order !== undefined ? Number(sort_order) : null, id, store_id]);

      return NextResponse.json({ success: true, message: 'แก้ไขหมวดหมู่สำเร็จ' });
    }

    // Update Menu Item
    const { id, name, category_id, description, price, cost_price, cooking_time_mins, image_url, is_available, min_buffet_tier_id } = body;

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
          cooking_time_mins = COALESCE(?, cooking_time_mins),
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
      cooking_time_mins !== undefined ? Number(cooking_time_mins) : null,
      image_url,
      is_available !== undefined ? Number(is_available) : null,
      min_buffet_tier_id !== undefined ? min_buffet_tier_id : null,
      id
    ]);

    return NextResponse.json({ success: true, message: 'อัปเดตเมนูอาหารสำเร็จ' });
  } catch (error) {
    console.error('Failed to update menu item or category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('category_id');
    const storeId = url.searchParams.get('store_id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Delete Category
    if (action === 'category') {
      if (!storeId) {
        return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
      }
      await execute('DELETE FROM categories WHERE id = ? AND store_id = ?', [id, storeId]);
      return NextResponse.json({ success: true, message: 'ลบหมวดหมู่เรียบร้อยแล้ว' });
    }

    // Delete Menu Item
    await execute('DELETE FROM menu_items WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'ลบเมนูเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Failed to delete menu item or category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
