'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UtensilsCrossed,
  Clock,
  User,
  ShoppingBag,
  CheckCircle2,
  BellRing,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  Flame,
  ChefHat,
  Search,
  Check,
  Edit2,
  DollarSign,
  Info,
  Lock,
  ChevronRight
} from 'lucide-react';
import { MenuItem, Category, OrderItem, BuffetTier } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { playSound } from '@/lib/sound';

interface OrderSessionData {
  valid: boolean;
  error?: string;
  store: {
    id: string;
    name: string;
    type: 'alacarte' | 'buffet' | 'hybrid';
    logo_url: string;
    phone: string;
  };
  table: {
    id: string;
    table_number: string;
    zone: string;
  };
  session: {
    id: string;
    opened_at: string;
    elapsed_minutes: number;
    guest_count: number;
    buffet_tier?: BuffetTier | null;
    buffet_remaining?: { minutes: number; isExpired: boolean } | null;
  };
  current_guest: {
    id: string;
    session_id: string;
    guest_code: string;
    guest_label: string;
    nickname: string;
  };
  all_guests: {
    id: string;
    guest_code: string;
    guest_label: string;
    nickname: string;
  }[];
  guest_spend_map: Record<string, { guest_label: string; nickname: string; total: number; count: number }>;
  grand_total: number;
  categories: Category[];
  menu_items: (MenuItem & { is_included_in_tier?: boolean })[];
  order_items: (OrderItem & {
    image_url?: string;
    guest_label: string;
    guest_nickname?: string;
  })[];
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export default function CustomerOrderPage({
  params,
}: {
  params: { storeId: string; tableId: string; sessionToken: string };
}) {
  const [data, setData] = useState<OrderSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNotes, setModalNotes] = useState('');

  // Nickname editing
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  // Notifications & Alerts
  const [readyAlertDish, setReadyAlertDish] = useState<string | null>(null);
  const [billCalled, setBillCalled] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Track previous ready items to trigger alert chime
  const prevReadyItemsRef = useRef<Set<string>>(new Set());

  const fetchSession = async () => {
    try {
      const storedGuestKey = `guest_${params.tableId}_${params.sessionToken}`;
      const savedGuestId = typeof window !== 'undefined' ? localStorage.getItem(storedGuestKey) : null;

      const url = `/api/order-session?store_id=${params.storeId}&table_id=${params.tableId}&token=${params.sessionToken}${
        savedGuestId ? `&guest_id=${savedGuestId}` : ''
      }`;

      const res = await fetch(url);
      const json = await res.json();

      if (!json.valid) {
        setErrorMsg(json.error || 'เซสชันนี้หมดอายุแล้ว หรือปิดโต๊ะไปแล้ว');
        setLoading(false);
        return;
      }

      // Save guest ID in localStorage
      if (json.current_guest?.id && typeof window !== 'undefined') {
        localStorage.setItem(storedGuestKey, json.current_guest.id);
      }

      // Check if any order item just turned to 'ready'
      if (Array.isArray(json.order_items)) {
        const currentReadyItems = new Set<string>();
        json.order_items.forEach((oi: OrderItem) => {
          if (oi.status === 'ready') {
            currentReadyItems.add(oi.id);
            if (!prevReadyItemsRef.current.has(oi.id)) {
              // Newly ready!
              playSound('ready');
              setReadyAlertDish(oi.item_name);
            }
          }
        });
        prevReadyItemsRef.current = currentReadyItems;
      }

      setData(json);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // Fast polling every 3.5 seconds to see kitchen status & new items from other guests
    const interval = setInterval(fetchSession, 3500);
    return () => clearInterval(interval);
  }, [params.storeId, params.tableId, params.sessionToken]);

  // Add item to cart
  const handleAddToCart = () => {
    if (!selectedItemForModal) return;

    setCart(prev => {
      const existing = prev.find(
        i => i.menuItem.id === selectedItemForModal.id && i.notes === modalNotes
      );
      if (existing) {
        return prev.map(i =>
          i === existing ? { ...i, quantity: i.quantity + modalQuantity } : i
        );
      }
      return [...prev, { menuItem: selectedItemForModal, quantity: modalQuantity, notes: modalNotes }];
    });

    setSelectedItemForModal(null);
    setModalQuantity(1);
    setModalNotes('');
    setShowCartDrawer(true);
  };

  // Submit cart order
  const handleSubmitOrder = async () => {
    if (!data || cart.length === 0 || orderSubmitting) return;
    setOrderSubmitting(true);

    try {
      const payload = {
        store_id: params.storeId,
        session_id: data.session.id,
        table_id: params.tableId,
        guest_id: data.current_guest.id,
        items: cart.map(c => ({
          menu_item_id: c.menuItem.id,
          item_name: c.menuItem.name,
          quantity: c.quantity,
          price: data.store.type === 'buffet' ? 0 : c.menuItem.price,
          cost_price: c.menuItem.cost_price,
          notes: c.notes,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (resJson.success) {
        playSound('order');
        setCart([]);
        setShowCartDrawer(false);
        setActiveTab('orders');
        fetchSession();
      } else {
        alert(resJson.error || 'ไม่สามารถสั่งอาหารได้');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Toggle customer received checklist
  const handleToggleReceived = async (itemId: string, currentVal: number) => {
    const newVal = currentVal ? 0 : 1;
    // Optimistic update
    if (data) {
      setData({
        ...data,
        order_items: data.order_items.map(oi =>
          oi.id === itemId ? { ...oi, customer_received: newVal } : oi
        ),
      });
    }

    try {
      await fetch('/api/orders/customer-received', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, received: newVal }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Call bill
  const handleCallBill = async () => {
    if (!data) return;
    if (!confirm('ต้องการเรียกพนักงานเพื่อชำระเงินใช่หรือไม่?')) return;

    try {
      const res = await fetch('/api/cashier/call-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: params.tableId, session_id: data.session.id }),
      });
      const json = await res.json();
      if (json.success) {
        playSound('bell');
        setBillCalled(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update nickname
  const handleUpdateNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !newNickname) return;

    try {
      await fetch('/api/order-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: data.current_guest.id,
          nickname: newNickname,
        }),
      });
      setShowNicknameModal(false);
      fetchSession();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">กำลังเชื่อมต่อโต๊ะอาหาร...</p>
      </div>
    );
  }

  // Session expired or table closed error screen
  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/30">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">QR Code หมดอายุ หรือโต๊ะนี้ปิดแล้ว</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          {errorMsg || 'การรับประทานอาหารรอบนี้ได้สิ้นสุดลงแล้ว ขอบคุณที่มาใช้บริการครับ'}
        </p>
        <p className="text-xs text-slate-500">หากท่านเพิ่งมาถึงโต๊ะ กรุณาแจ้งพนักงานเพื่อเปิดโต๊ะใหม่</p>
      </div>
    );
  }

  const isBuffet = data.store.type === 'buffet';
  const cartTotalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = isBuffet
    ? 0
    : cart.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);

  // Filter menu items
  const filteredItems = data.menu_items.filter(item => {
    const matchCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-28">
      {/* 1. Mobile App Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {data.store.logo_url && (
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h1 className="text-sm font-bold truncate max-w-[180px] leading-tight">{data.store.name}</h1>
                <div className="flex items-center gap-1.5 text-xs text-orange-400 font-semibold">
                  <span>{data.table.table_number}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{data.table.zone}</span>
                </div>
              </div>
            </div>

            {/* Current Guest Tag (1-A, 1-B, etc.) */}
            <button
              onClick={() => {
                setNewNickname(data.current_guest.nickname || '');
                setShowNicknameModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold transition hover:bg-orange-500/30"
              title="คลิกเพื่อแก้ไขชื่อเล่นของคุณ"
            >
              <User className="w-3.5 h-3.5 text-orange-400" />
              <span>{data.current_guest.guest_label}</span>
              <span className="text-[10px] text-slate-300 font-normal">
                ({data.current_guest.nickname || 'ตั้งชื่อ'})
              </span>
              <Edit2 className="w-2.5 h-2.5 text-orange-400 ml-0.5" />
            </button>
          </div>

          {/* Buffet Countdown Banner (If Buffet) */}
          {isBuffet && data.session.buffet_tier && (
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>{data.session.buffet_tier.name}</span>
              </span>

              <div className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                data.session.buffet_remaining?.isExpired
                  ? 'bg-red-500 text-white animate-pulse'
                  : (data.session.buffet_remaining?.minutes || 0) <= 15
                  ? 'bg-orange-500 text-white animate-pulse'
                  : 'bg-slate-800 text-amber-400 border border-slate-700'
              }`}>
                <Clock className="w-3 h-3" />
                <span>
                  {data.session.buffet_remaining?.isExpired
                    ? 'หมดเวลาแล้ว'
                    : `เหลือ ${data.session.buffet_remaining?.minutes} นาที`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs (Menu vs Active Orders) */}
        <div className="max-w-md mx-auto flex border-t border-slate-800 bg-slate-900/90 text-xs font-bold">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
              activeTab === 'menu'
                ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-800/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>เลือกเมนูอาหาร</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition relative ${
              activeTab === 'orders'
                ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-800/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>รายการที่สั่งแล้ว</span>
            {data.order_items.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-orange-600 text-white text-[10px] font-bold">
                {data.order_items.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Real-time Dish Ready Alert Toast */}
      {readyAlertDish && (
        <div className="fixed top-16 left-4 right-4 z-40 max-w-md mx-auto animate-bounce">
          <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>อาหารจานโปรด: &quot;{readyAlertDish}&quot; ปรุงเสร็จแล้ว! กำลังนำไปเสิร์ฟ</span>
            </div>
            <button onClick={() => setReadyAlertDish(null)} className="text-white hover:text-slate-200">✕</button>
          </div>
        </div>
      )}

      {/* Bill Called Alert Banner */}
      {billCalled && (
        <div className="max-w-md mx-auto px-4 mt-3">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-2xl text-xs flex items-center gap-2">
            <BellRing className="w-4 h-4 text-blue-600 flex-shrink-0 animate-bounce" />
            <span>แจ้งแคชเชียร์เรียบร้อยแล้ว พนักงานกำลังนำบิลมาชำระเงินที่โต๊ะของท่าน</span>
          </div>
        </div>
      )}

      {/* TAB 1: MENU BROWSING */}
      {activeTab === 'menu' && (
        <main className="max-w-md mx-auto px-4 pt-3">
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่ออาหาร เช่น กะเพรา, ซาชิมิ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 shadow-sm"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              ทั้งหมด ({data.menu_items.length})
            </button>
            {data.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === c.id
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Menu Items List */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isLocked = isBuffet && item.is_included_in_tier === false;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex gap-3 transition ${
                    isLocked ? 'opacity-60 bg-slate-50' : 'hover:border-orange-300'
                  }`}
                >
                  {/* Photo */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    {isLocked && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 text-center">
                        <Lock className="w-4 h-4 mb-0.5 text-amber-400" />
                        <span>เฉพาะ Tier สูงกว่า</span>
                      </div>
                    )}
                  </div>

                  {/* Info & Add button */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{item.name}</h3>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                      <span className="font-extrabold text-orange-600 text-sm">
                        {isBuffet ? (isLocked ? 'ไม่อยู่ใน Tier' : 'ฟรีในแพ็กเกจ') : formatMoney(item.price)}
                      </span>

                      {isLocked ? (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          อัปเกรดแพ็กเกจ
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedItemForModal(item);
                            setModalQuantity(1);
                            setModalNotes('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>เลือก</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* TAB 2: ACTIVE TABLE ORDERS & LIVE TRACKER */}
      {activeTab === 'orders' && (
        <main className="max-w-md mx-auto px-4 pt-3 space-y-4">
          {/* Summary Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">ยอดรวมทั้งโต๊ะ ({data.table.table_number})</span>
              <span className="text-xl font-black text-slate-900">{formatMoney(data.grand_total)}</span>
            </div>

            {/* Per-Guest Subtotal Breakdown */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 block">สรุปยอดแยกตามผู้สั่ง:</span>
              {data.all_guests.map((g) => {
                const guestSpend = data.guest_spend_map[g.id]?.total || 0;
                const isMe = g.id === data.current_guest.id;
                return (
                  <div key={g.id} className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${isMe ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
                      <strong className={isMe ? 'text-orange-600' : 'text-slate-800'}>{g.guest_label}</strong>
                      <span className="text-slate-500 text-[11px]">({g.nickname}) {isMe ? '👈 คุณ' : ''}</span>
                    </span>
                    <span className="font-bold text-slate-900">{formatMoney(guestSpend)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dishes List with Checklist and Live Status */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>สถานะอาหารแบบสด (Live Tracker)</span>
              <span className="text-[11px] font-normal text-slate-500">ติ๊กช่องสี่เหลี่ยมเมื่อได้รับอาหาร</span>
            </h4>

            {data.order_items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                ยังไม่มีรายการอาหารที่สั่งในรอบนี้
              </div>
            ) : (
              data.order_items.map((oi) => {
                const isReceived = oi.customer_received === 1;

                return (
                  <div
                    key={oi.id}
                    className={`bg-white rounded-2xl p-3 border transition-all ${
                      isReceived
                        ? 'border-slate-200 bg-slate-50/80 opacity-80'
                        : oi.status === 'ready'
                        ? 'border-emerald-400 ring-2 ring-emerald-400/30 bg-emerald-50/40'
                        : 'border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        {/* Checklist Button */}
                        <button
                          onClick={() => handleToggleReceived(oi.id, oi.customer_received)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition flex-shrink-0 ${
                            isReceived
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-orange-500 bg-white'
                          }`}
                          title="ติ๊กเพื่อบันทึกว่าได้รับอาหารแล้ว"
                        >
                          {isReceived && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-sm ${isReceived ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {oi.item_name}
                            </span>
                            <span className="text-orange-600 font-extrabold text-xs">x{oi.quantity}</span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5">
                            สั่งโดย: <strong className="text-slate-700">{oi.guest_label}</strong> {oi.guest_nickname ? `(${oi.guest_nickname})` : ''}
                          </div>
                          {oi.notes && (
                            <div className="text-[11px] text-amber-600 font-medium">หมายเหตุ: {oi.notes}</div>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="text-right flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold block ${
                          oi.status === 'ready'
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : oi.status === 'served'
                            ? 'bg-slate-200 text-slate-700'
                            : oi.status === 'cooking'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {oi.status === 'ready'
                            ? '✅ ทำเสร็จแล้ว/พร้อมเสิร์ฟ'
                            : oi.status === 'served'
                            ? '🍽️ เสิร์ฟแล้ว'
                            : oi.status === 'cooking'
                            ? '🍳 กำลังปรุง'
                            : '🕒 รอครัวรับ'}
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-700 block mt-1">
                          {formatMoney(oi.price * oi.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      )}

      {/* 2. Floating Action Bar (View Cart & Call Bill) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-2xl p-3">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {/* Call Bill Button */}
          <button
            onClick={handleCallBill}
            className="py-3 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition flex-shrink-0"
          >
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>เรียกเช็กบิล</span>
          </button>

          {/* View Cart Button */}
          <button
            onClick={() => setShowCartDrawer(true)}
            className="flex-1 py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-orange-600/25 transition"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>ตะกร้าของ {data.current_guest.guest_label}</span>
              {cartTotalItems > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white text-orange-600 font-extrabold text-xs">
                  {cartTotalItems}
                </span>
              )}
            </div>
            <span>{formatMoney(cartSubtotal)}</span>
          </button>
        </div>
      </div>

      {/* MODAL: ITEM DETAIL & QUANTITY / NOTES */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 shadow-2xl animate-in slide-in-from-bottom max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-extrabold text-slate-900 text-base">{selectedItemForModal.name}</h3>
              <button onClick={() => setSelectedItemForModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {selectedItemForModal.image_url && (
              <div className="h-44 rounded-xl overflow-hidden bg-slate-100 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedItemForModal.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <p className="text-xs text-slate-500 mb-4">{selectedItemForModal.description}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุพิเศษ (เช่น เผ็ดน้อย, ไม่ใส่ผักชี)</label>
                <input
                  type="text"
                  placeholder="ระบุความต้องการเพิ่มเติม..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Quantity Picker */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-700">จำนวนที่ต้องการสั่ง:</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-base font-extrabold text-slate-900 w-6 text-center">{modalQuantity}</span>
                  <button
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                    className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>เพิ่มลงตะกร้า ({isBuffet ? 'ฟรี' : formatMoney(selectedItemForModal.price * modalQuantity)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: CART VIEW */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white rounded-t-3xl max-w-md w-full p-5 shadow-2xl max-h-[80vh] flex flex-col justify-between animate-in slide-in-from-bottom">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-orange-600" />
                    <span>ตะกร้าคำสั่งซื้อ ({data.current_guest.guest_label})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">จานที่สั่งจะถูกระบุว่าสั่งโดยคุณ</p>
                </div>
                <button onClick={() => setShowCartDrawer(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  ไม่มีรายการในตะกร้า เลือกเมนูเพื่อสั่งอาหาร
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {cart.map((c, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{c.menuItem.name}</div>
                        {c.notes && <div className="text-[11px] text-amber-600">หมายเหตุ: {c.notes}</div>}
                        <div className="text-[11px] font-semibold text-orange-600 mt-0.5">
                          {isBuffet ? 'ฟรี' : formatMoney(c.menuItem.price * c.quantity)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">x{c.quantity}</span>
                        <button
                          onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-medium text-[11px] ml-1"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-100 mt-4 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-600">ยอดรวมตะกร้านี้:</span>
                  <span className="text-lg font-black text-orange-600">{formatMoney(cartSubtotal)}</span>
                </div>

                <button
                  disabled={orderSubmitting}
                  onClick={handleSubmitOrder}
                  className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-sm shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ChefHat className="w-5 h-5" />
                  <span>{orderSubmitting ? 'กำลังส่งออเดอร์...' : 'ยืนยันส่งคำสั่งซื้อเข้าครัว'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT NICKNAME */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1">ตั้งชื่อเล่นของคุณ</h3>
            <p className="text-[11px] text-slate-500 mb-3">เพื่อให้เพื่อนร่วมโต๊ะและทางร้านเรียกคุณได้ถูกต้อง</p>

            <form onSubmit={handleUpdateNickname} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="เช่น พี่ต้น, น้องพลอย"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNicknameModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
