'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Tag,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Percent,
  Layers,
  Sparkles
} from 'lucide-react';
import { MenuItem, Category, BuffetTier, Store } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

export default function MenuManagementPage({ params }: { params: { storeId: string } }) {
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [buffetTiers, setBuffetTiers] = useState<BuffetTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    category_id: '',
    description: '',
    price: 89,
    cost_price: 35,
    cooking_time_mins: 10,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=400&fit=crop',
    min_buffet_tier_id: '',
  });

  const [catName, setCatName] = useState('');

  const fetchMenuData = async () => {
    try {
      const [resStore, resMenu] = await Promise.all([
        fetch(`/api/stores/${params.storeId}`).then(r => r.json()),
        fetch(`/api/menu?store_id=${params.storeId}`).then(r => r.json()),
      ]);

      if (resStore.id) setStore(resStore);
      if (Array.isArray(resMenu.categories)) {
        setCategories(resMenu.categories);
        if (resMenu.categories.length > 0 && !itemForm.category_id) {
          setItemForm(prev => ({ ...prev, category_id: resMenu.categories[0].id }));
        }
      }
      if (Array.isArray(resMenu.items)) setMenuItems(resMenu.items);
      if (Array.isArray(resMenu.buffet_tiers)) setBuffetTiers(resMenu.buffet_tiers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, [params.storeId]);

  // Handle Add Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.category_id) return;

    try {
      if (editingItem) {
        // Update
        await fetch('/api/menu', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            ...itemForm,
          }),
        });
      } else {
        // Create
        await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: params.storeId,
            ...itemForm,
          }),
        });
      }

      setShowAddModal(false);
      setEditingItem(null);
      fetchMenuData();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle item availability
  const handleToggleAvailable = async (item: MenuItem) => {
    const newVal = item.is_available === 1 ? 0 : 1;
    setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newVal } : i));

    try {
      await fetch('/api/menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_available: newVal }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบเมนู "${name}" ใช่หรือไม่?`)) return;
    try {
      await fetch(`/api/menu?id=${id}`, { method: 'DELETE' });
      fetchMenuData();
    } catch (err) {
      console.error(err);
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    try {
      await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'category',
          store_id: params.storeId,
          name: catName,
          sort_order: categories.length + 1,
        }),
      });
      setShowCatModal(false);
      setCatName('');
      fetchMenuData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <span>จัดการเมนูอาหาร & ราคาต้นทุน (Menu & Cost Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดราคาขาย ราคาต้นทุนหลังบ้านสำหรับคิดกำไร และผูกเมนูกับระดับราคาบุฟเฟ่ต์
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCatModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Tag className="w-4 h-4" />
            <span>เพิ่มหมวดหมู่</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setItemForm({
                name: '',
                category_id: categories[0]?.id || '',
                description: '',
                price: 89,
                cost_price: 35,
                cooking_time_mins: 10,
                image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=400&fit=crop',
                min_buffet_tier_id: '',
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มเมนูใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อเมนู..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-sm"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            ทุกหมวด ({menuItems.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Table / Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const profit = item.price - item.cost_price;
          const margin = item.price > 0 ? Math.round((profit / item.price) * 100) : 0;
          const cat = categories.find(c => c.id === item.category_id);
          const tier = buffetTiers.find(t => t.id === item.min_buffet_tier_id);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition ${
                item.is_available === 0 ? 'opacity-60 bg-slate-50' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex gap-3 mb-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{item.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-500">{cat?.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 font-bold flex items-center gap-0.5">
                        ⏱️ {item.cooking_time_mins || 10} นาที
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                  </div>
                </div>

                {/* Financial Cost vs Price Breakdown */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">ราคาขายหน้าร้าน:</span>
                    <span className="font-extrabold text-slate-900 text-sm">{formatMoney(item.price)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">ราคาต้นทุน (Cost):</span>
                    <span className="font-bold text-rose-600">{formatMoney(item.cost_price)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-semibold">
                    <span className="text-slate-600 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      <span>กำไรขั้นต้น:</span>
                    </span>
                    <span className="text-emerald-600 font-extrabold">
                      +{formatMoney(profit)} ({margin}%)
                    </span>
                  </div>

                  {store?.type === 'buffet' && (
                    <div className="pt-1 border-t border-slate-200/60 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">สิทธิ์ในบุฟเฟ่ต์:</span>
                      <span className="font-bold text-amber-700">
                        {tier ? tier.name : 'มีในทุก Tier'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleToggleAvailable(item)}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                    item.is_available === 1
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {item.is_available === 1 ? '✓ มีสินค้า' : '✕ สินค้าหมด'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setItemForm({
                        name: item.name,
                        category_id: item.category_id,
                        description: item.description,
                        price: item.price,
                        cost_price: item.cost_price,
                        cooking_time_mins: item.cooking_time_mins || 10,
                        image_url: item.image_url,
                        min_buffet_tier_id: item.min_buffet_tier_id || '',
                      });
                      setShowAddModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    title="แก้ไข"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EDIT MENU ITEM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingItem ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหารใหม่'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อเมนูอาหาร *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ข้าวผัดต้มยำกุ้งแม่น้ำ"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมวดหมู่อาหาร *</label>
                <select
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ราคาขายหน้าร้าน (บาท) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ราคาต้นทุน (Cost) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={itemForm.cost_price}
                    onChange={(e) => setItemForm({ ...itemForm, cost_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400">สำหรับคำนวณกำไรสุทธิ</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">⏱️ เวลาทำอาหาร (นาที) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={180}
                    value={itemForm.cooking_time_mins}
                    onChange={(e) => setItemForm({ ...itemForm, cooking_time_mins: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400">เมื่อเกินเวลานี้ ระบบจะแจ้งเตือนสีแดง</span>
                </div>
              </div>

              {store?.type === 'buffet' && buffetTiers.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำกัดสิทธิ์ในบุฟเฟ่ต์ Tier</label>
                  <select
                    value={itemForm.min_buffet_tier_id}
                    onChange={(e) => setItemForm({ ...itemForm, min_buffet_tier_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">สั่งได้ทุกแพ็กเกจ (Standard & Premium)</option>
                    {buffetTiers.map((t) => (
                      <option key={t.id} value={t.id}>เฉพาะลูกค้าที่เลือกแพ็กเกจ {t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL รูปภาพอาหาร</label>
                <input
                  type="text"
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">คำอธิบายเมนู</label>
                <textarea
                  rows={2}
                  placeholder="รสชาติ ส่วนผสม วัตถุดิบ..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/30"
                >
                  บันทึกเมนู
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-sm mb-1">เพิ่มหมวดหมู่อาหารใหม่</h3>
            <p className="text-[11px] text-slate-400 mb-3">เช่น อาหารจานเดียว, ยำ/ส้มตำ, เครื่องดื่ม</p>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="ชื่อหมวดหมู่"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 text-white font-bold"
                >
                  เพิ่มหมวด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
