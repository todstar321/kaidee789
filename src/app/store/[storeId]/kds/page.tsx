'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChefHat,
  Clock,
  Printer,
  CheckCircle,
  Flame,
  Volume2,
  VolumeX,
  RefreshCw,
  Bell,
  Utensils,
  Sparkles
} from 'lucide-react';
import { OrderItem } from '@/lib/types';
import { formatThaiTime } from '@/lib/utils';
import { playSound } from '@/lib/sound';

interface KitchenOrderItem extends OrderItem {
  table_number: string;
  table_zone: string;
  image_url: string;
}

export default function KitchenPage({ params }: { params: { storeId: string } }) {
  const [items, setItems] = useState<KitchenOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'active' | 'ready' | 'served' | 'all'>('active');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);

  // Keep track of existing item IDs to detect new orders and trigger sound alert
  const previousItemIdsRef = useRef<Set<string>>(new Set());

  const fetchKitchenOrders = async () => {
    try {
      const res = await fetch(`/api/orders?store_id=${params.storeId}&status=${filterStatus}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Detect if any new items arrived that weren't in previous state
        const currentIds = new Set<string>(data.map(i => i.id));
        let hasNewOrder = false;

        data.forEach(item => {
          if (!previousItemIdsRef.current.has(item.id)) {
            hasNewOrder = true;
          }
        });

        if (hasNewOrder && previousItemIdsRef.current.size > 0 && soundEnabled) {
          playSound('order');
          if (autoPrintEnabled) {
            window.print();
          }
        }

        previousItemIdsRef.current = currentIds;
        setItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [params.storeId, filterStatus, soundEnabled, autoPrintEnabled]);

  // Update item status
  const handleUpdateStatus = async (itemId: string, newStatus: 'cooking' | 'ready' | 'served') => {
    // Optimistic UI update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));

    try {
      await fetch('/api/orders/item-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, status: newStatus }),
      });
      fetchKitchenOrders();
    } catch (err) {
      console.error(err);
    }
  };

  // Group items by Table
  const tableGroups: Record<string, KitchenOrderItem[]> = {};
  items.forEach(itm => {
    const key = `${itm.table_number} (${itm.table_zone})`;
    if (!tableGroups[key]) tableGroups[key] = [];
    tableGroups[key].push(itm);
  });

  return (
    <div className="space-y-6">
      {/* Top KDS Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">จอแสดงออเดอร์ห้องครัว (Kitchen Display System)</h2>
              <p className="text-xs text-slate-400 mt-0.5">รับออเดอร์สด อัปเดตสถานะทำเสร็จ และพิมพ์ตั๋วครัวอัตโนมัติ</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'เปิดเสียงเตือน' : 'ปิดเสียงเตือน'}</span>
          </button>

          {/* Auto Print Toggle */}
          <button
            onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              autoPrintEnabled
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
            title="เมื่อมีออเดอร์ใหม่ สั่งพิมพ์เข้าเครื่องพิมพ์สลิปทันที"
          >
            <Printer className="w-4 h-4" />
            <span>{autoPrintEnabled ? 'พิมพ์อัตโนมัติ: เปิด' : 'พิมพ์อัตโนมัติ: ปิด'}</span>
          </button>

          <button
            onClick={() => fetchKitchenOrders()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Status Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            filterStatus === 'active'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          🔥 กำลังปรุง / รอดำเนินการ
        </button>

        <button
          onClick={() => setFilterStatus('ready')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            filterStatus === 'ready'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          ✅ ทำเสร็จแล้ว (รอเสิร์ฟ)
        </button>

        <button
          onClick={() => setFilterStatus('served')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            filterStatus === 'served'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          🍽️ เสิร์ฟแล้ว
        </button>

        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            filterStatus === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          ทั้งหมด
        </button>
      </div>

      {/* KDS Kitchen Tickets Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">กำลังโหลดรายการออเดอร์ในครัว...</div>
      ) : Object.keys(tableGroups).length === 0 ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">ไม่มีรายการอาหารค้างในสถานะนี้</p>
          <p className="text-xs text-slate-400 mt-0.5">เมื่อลูกค้ากดสั่งอาหารผ่าน QR Code รายการจะปรากฏที่นี่ทันทีพร้อมเสียงเตือน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(tableGroups).map(([tableTitle, groupItems]) => (
            <div
              key={tableTitle}
              className="bg-white rounded-2xl border-2 border-slate-200 shadow-md overflow-hidden flex flex-col justify-between"
            >
              {/* Ticket Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-white leading-tight">{tableTitle}</h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    <span>เวลาสั่งล่าสุด: {formatThaiTime(groupItems[0]?.created_at)}</span>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="พิมพ์ตั๋วครัว"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>

              {/* Ticket Items */}
              <div className="p-4 space-y-3 divide-y divide-slate-100 flex-1">
                {groupItems.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-base text-slate-900 leading-snug">
                            {item.item_name}
                          </span>
                          <span className="text-orange-600 font-black text-lg">
                            x{item.quantity}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 mt-0.5">
                          สั่งโดย: <strong className="text-slate-800">{item.guest_label}</strong> {item.guest_nickname ? `(${item.guest_nickname})` : ''}
                        </div>

                        {item.notes && (
                          <div className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/80 mt-1 inline-block">
                            ⚠️ หมายเหตุ: {item.notes}
                          </div>
                        )}
                      </div>

                      {/* Status Action Buttons */}
                      <div className="flex flex-col gap-1 text-right flex-shrink-0">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'cooking')}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm"
                          >
                            เริ่มปรุง
                          </button>
                        )}

                        {item.status === 'cooking' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'ready')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm animate-pulse"
                          >
                            ✓ ปรุงเสร็จแล้ว
                          </button>
                        )}

                        {item.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'served')}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm"
                          >
                            🍽️ นำไปเสิร์ฟแล้ว
                          </button>
                        )}

                        {item.status === 'served' && (
                          <span className="px-2 py-1 rounded text-[11px] font-bold bg-slate-100 text-slate-600">
                            เสิร์ฟเรียบร้อย
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ticket Footer Quick Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>รวม {groupItems.length} รายการ</span>
                <button
                  onClick={() => {
                    groupItems.forEach(i => {
                      if (i.status === 'cooking' || i.status === 'pending') {
                        handleUpdateStatus(i.id, 'ready');
                      }
                    });
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  เสร็จทั้งหมดของโต๊ะนี้ ✓
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Kitchen Ticket (Hidden until Print) */}
      <div className="printable-receipt hidden">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>ใบสั่งอาหารเข้าครัว</h2>
          <p style={{ fontSize: '12px', margin: '2px 0' }}>พิมพ์อัตโนมัติ KDS</p>
        </div>
        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '6px 0' }}>
          {items.slice(0, 5).map(it => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', margin: '4px 0' }}>
              <span>{it.item_name} x{it.quantity}</span>
              <span>{it.table_number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
