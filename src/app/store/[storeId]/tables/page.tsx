'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  UtensilsCrossed,
  Plus,
  QrCode,
  Clock,
  Users,
  DollarSign,
  Printer,
  ExternalLink,
  RefreshCw,
  BellRing,
  AlertTriangle,
  Receipt,
  CheckCircle,
  ChefHat,
  X
} from 'lucide-react';
import { Table, Store, BuffetTier } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { playSound } from '@/lib/sound';

interface TableWithDetails extends Table {
  session?: {
    id: string;
    opened_at: string;
    elapsed_minutes: number;
    guest_count: number;
    buffet_tier_id?: string;
    buffet_tier_name?: string;
    buffet_tier_price?: number;
    buffet_tier_color?: string;
    buffet_end_time?: string;
    buffet_remaining_minutes?: number;
    buffet_is_expired?: boolean;
    qr_code_token: string;
    total_spend: number;
    items_count: number;
    items: {
      id: string;
      item_name: string;
      quantity: number;
      price: number;
      guest_label: string;
      guest_nickname?: string;
      status: string;
      notes?: string;
    }[];
  } | null;
}

export default function TablesPage({ params }: { params: { storeId: string } }) {
  const [store, setStore] = useState<Store | null>(null);
  const [tables, setTables] = useState<TableWithDetails[]>([]);
  const [buffetTiers, setBuffetTiers] = useState<BuffetTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('all');

  // Modals state
  const [openTableModalTarget, setOpenTableModalTarget] = useState<Table | null>(null);
  const [openGuestCount, setOpenGuestCount] = useState(2);
  const [selectedBuffetTierId, setSelectedBuffetTierId] = useState<string>('');
  const [justOpenedSession, setJustOpenedSession] = useState<{
    tableNumber: string;
    qrUrl: string;
    qrDataUrl: string;
    sessionToken: string;
    tableId: string;
  } | null>(null);

  const [viewQrModalTarget, setViewQrModalTarget] = useState<TableWithDetails | null>(null);
  const [viewQrDataUrl, setViewQrDataUrl] = useState<string>('');

  const fetchTables = async () => {
    try {
      const res = await fetch(`/api/tables?store_id=${params.storeId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Check if any table requested bill to play sound
        const hasBillingRequested = data.some((t: TableWithDetails) => t.status === 'billing_requested');
        if (hasBillingRequested) {
          // Play subtle bell
        }
        setTables(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // 1. Fetch store info
    fetch(`/api/stores/${params.storeId}`)
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          setStore(data);
          if (Array.isArray(data.buffet_tiers)) {
            setBuffetTiers(data.buffet_tiers);
            if (data.buffet_tiers.length > 0) {
              setSelectedBuffetTierId(data.buffet_tiers[0].id);
            }
          }
        }
      });

    // 2. Fetch tables initially
    fetchTables().finally(() => setLoading(false));

    // 3. Setup polling interval (every 4 seconds)
    const interval = setInterval(() => {
      fetchTables();
    }, 4000);

    return () => clearInterval(interval);
  }, [params.storeId]);

  // Handle open table
  const handleConfirmOpenTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openTableModalTarget) return;

    try {
      const res = await fetch('/api/tables/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          table_id: openTableModalTarget.id,
          guest_count: openGuestCount,
          buffet_tier_id: store?.type === 'buffet' ? selectedBuffetTierId : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSound('order');
        const customerOrderUrl = `${window.location.origin}/order/${params.storeId}/${openTableModalTarget.id}/${data.token}`;
        const qrImage = await QRCode.toDataURL(customerOrderUrl, { width: 300, margin: 2 });

        setJustOpenedSession({
          tableNumber: openTableModalTarget.table_number,
          qrUrl: customerOrderUrl,
          qrDataUrl: qrImage,
          sessionToken: data.token,
          tableId: openTableModalTarget.id,
        });

        setOpenTableModalTarget(null);
        fetchTables();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open view QR modal for an occupied table
  const handleOpenViewQr = async (tbl: TableWithDetails) => {
    if (!tbl.session) return;
    setViewQrModalTarget(tbl);
    const customerOrderUrl = `${window.location.origin}/order/${params.storeId}/${tbl.id}/${tbl.session.qr_code_token}`;
    const qrImage = await QRCode.toDataURL(customerOrderUrl, { width: 300, margin: 2 });
    setViewQrDataUrl(qrImage);
  };

  // Print slip helper
  const handlePrintSlip = () => {
    window.print();
  };

  // Distinct zones
  const zones = Array.from(new Set(tables.map(t => t.zone || 'ทั่วไป')));
  const filteredTables = selectedZone === 'all'
    ? tables
    : tables.filter(t => t.zone === selectedZone);

  const availableCount = tables.filter(t => t.status === 'available').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const billingCount = tables.filter(t => t.status === 'billing_requested').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-500" />
            <span>ผังโต๊ะอาหาร & สถานะห้องอาหาร (Table Grid)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เห็นสถานะโต๊ะว่าง เวลาที่ลูกค้านั่ง ยอดเงิน และเปิดโต๊ะสร้าง Dynamic QR Code ทันที
          </p>
        </div>

        {/* Quick status summary chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>โต๊ะว่าง: {availableCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>นั่งทาน: {occupiedCount}</span>
          </div>

          {billingCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-red-100 border border-red-300 text-red-700 font-bold flex items-center gap-1.5 animate-bounce">
              <BellRing className="w-3.5 h-3.5" />
              <span>รอลูกค้าเช็กบิล: {billingCount} โต๊ะ!</span>
            </div>
          )}

          <button
            onClick={() => fetchTables()}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedZone('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            selectedZone === 'all'
              ? 'bg-slate-900 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          ทุกโซน ({tables.length})
        </button>
        {zones.map((zone) => (
          <button
            key={zone}
            onClick={() => setSelectedZone(zone)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              selectedZone === zone
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {zone} ({tables.filter(t => t.zone === zone).length})
          </button>
        ))}
      </div>

      {/* Table Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">กำลังโหลดสถานะโต๊ะ...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredTables.map((tbl) => {
            const isAvailable = tbl.status === 'available';
            const isOccupied = tbl.status === 'occupied';
            const isBilling = tbl.status === 'billing_requested';

            return (
              <div
                key={tbl.id}
                className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                  isBilling
                    ? 'bg-red-50/90 border-red-400 ring-2 ring-red-400/40'
                    : isOccupied
                    ? 'bg-white border-blue-300'
                    : 'bg-white border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                {/* Table Header */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-lg">{tbl.table_number}</h3>
                        <span className="text-[11px] font-medium text-slate-400">({tbl.zone})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>ความจุ {tbl.capacity} ที่นั่ง</span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                      isBilling
                        ? 'bg-red-500 text-white animate-pulse'
                        : isOccupied
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isBilling ? '🔔 เรียกเช็กบิล' : isOccupied ? '● มีลูกค้านั่ง' : '✓ โต๊ะว่าง'}
                    </span>
                  </div>
                </div>

                {/* Table Body Content */}
                <div className="p-4 flex-1 flex flex-col justify-between text-xs space-y-3">
                  {isAvailable ? (
                    <div className="py-6 text-center text-slate-400 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                        <Plus className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-600">พร้อมรับลูกค้าใหม่</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">กดเปิดโต๊ะเพื่อสร้าง QR Code สั่งอาหาร</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Timer & Buffet Bar */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-1.5">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            นั่งไปแล้ว:
                          </span>
                          <span className="font-bold text-slate-900">{tbl.session?.elapsed_minutes} นาที</span>
                        </div>

                        {/* Buffet Countdown (If buffet store or buffet session) */}
                        {tbl.session?.buffet_tier_name && (
                          <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between">
                            <span className="font-semibold text-amber-700">
                              {tbl.session.buffet_tier_name}
                            </span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                              tbl.session.buffet_is_expired
                                ? 'bg-red-500 text-white'
                                : (tbl.session.buffet_remaining_minutes || 0) <= 15
                                ? 'bg-orange-500 text-white animate-pulse'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {tbl.session.buffet_is_expired
                                ? 'หมดเวลาแล้ว!'
                                : `⏱️ เหลือ ${tbl.session.buffet_remaining_minutes} นาที`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Current Spend & Items count */}
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <span className="text-slate-400 text-[11px] block">ยอดสั่งสะสม:</span>
                          <span className="text-lg font-black text-slate-900">
                            {formatMoney(tbl.session?.total_spend)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[11px] block">รายการอาหาร:</span>
                          <span className="font-semibold text-slate-700">
                            {tbl.session?.items_count || 0} จาน
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Table Footer Actions */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
                  {isAvailable ? (
                    <button
                      onClick={() => {
                        setOpenTableModalTarget(tbl);
                        setOpenGuestCount(2);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เปิดโต๊ะ (Check-in)</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleOpenViewQr(tbl)}
                        className="flex-1 py-2 px-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition"
                        title="ดู QR Code และรายการที่กำลังทำ"
                      >
                        <QrCode className="w-3.5 h-3.5 text-orange-500" />
                        <span>ดู QR / ออเดอร์</span>
                      </button>

                      <Link
                        href={`/store/${params.storeId}/cashier?table_id=${tbl.id}`}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow-sm ${
                          isBilling
                            ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>คิดเงิน</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: OPEN TABLE */}
      {openTableModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                <span>เปิดโต๊ะ: {openTableModalTarget.table_number} ({openTableModalTarget.zone})</span>
              </h3>
              <button onClick={() => setOpenTableModalTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOpenTable} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">จำนวนลูกค้าที่มานั่ง (คน) *</label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5, 6, 8].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setOpenGuestCount(num)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition ${
                        openGuestCount === num
                          ? 'bg-orange-600 text-white shadow-md shadow-orange-500/30'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* If Buffet Store: Select Buffet Tier */}
              {store?.type === 'buffet' && buffetTiers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">เลือกระดับราคาบุฟเฟ่ต์ (Buffet Tier) *</label>
                  <div className="space-y-2">
                    {buffetTiers.map((tier) => (
                      <label
                        key={tier.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                          selectedBuffetTierId === tier.id
                            ? 'border-orange-500 bg-orange-50/70 ring-1 ring-orange-500'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="buffet_tier"
                            value={tier.id}
                            checked={selectedBuffetTierId === tier.id}
                            onChange={(e) => setSelectedBuffetTierId(e.target.value)}
                            className="text-orange-600 focus:ring-orange-500"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{tier.name}</div>
                            <div className="text-xs text-slate-500">{tier.description}</div>
                          </div>
                        </div>
                        <div className="text-base font-extrabold text-orange-600">
                          {formatMoney(tier.price)}/ท่าน
                        </div>
                      </label>
                    ))}
                  </div>

                  <p className="text-[11px] text-amber-700 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ⏱️ กำหนดเวลารับประทาน: <strong>{store.buffet_duration_mins} นาที</strong> (ระบบจะเริ่มนับถอยหลังทันทีเมื่อเปิดโต๊ะ)
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpenTableModalTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>ยืนยันเปิดโต๊ะ & สร้าง QR Code</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: JUST OPENED TABLE & QR SLIP PRINT */}
      {justOpenedSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7" />
            </div>

            <h3 className="font-extrabold text-slate-900 text-xl mb-1">
              เปิดโต๊ะ {justOpenedSession.tableNumber} สำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ให้ลูกค้านำมือถือมาสแกน QR Code ด้านล่างนี้เพื่อสั่งอาหาร
            </p>

            {/* QR Code Container */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mb-4 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={justOpenedSession.qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
              <div className="text-[11px] font-bold text-slate-500 mt-2">
                สแกนสั่ง โต๊ะ {justOpenedSession.tableNumber}
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href={justOpenedSession.qrUrl}
                target="_blank"
                className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow"
              >
                <ExternalLink className="w-4 h-4" />
                <span>เปิดหน้าจอลูกค้า (ทดสอบสั่งอาหาร)</span>
              </Link>

              <button
                onClick={handlePrintSlip}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ใบ QR Code สำหรับวางที่โต๊ะ (58mm/80mm)</span>
              </button>

              <button
                onClick={() => setJustOpenedSession(null)}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW ACTIVE TABLE QR & ACTIVE DISHES */}
      {viewQrModalTarget && viewQrModalTarget.session && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {viewQrModalTarget.table_number} ({viewQrModalTarget.zone})
                </h3>
                <p className="text-xs text-slate-500">
                  นั่งไปแล้ว {viewQrModalTarget.session.elapsed_minutes} นาที | รวม {viewQrModalTarget.session.guest_count} คน
                </p>
              </div>
              <button onClick={() => setViewQrModalTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top QR & Link */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-4">
              {viewQrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewQrDataUrl} alt="Table QR" className="w-28 h-28 rounded-lg bg-white p-1 border border-slate-200" />
              )}
              <div className="flex-1 text-center sm:text-left text-xs space-y-1.5">
                <div className="font-bold text-slate-900">QR Code ประจำรอบการนั่งนี้</div>
                <p className="text-slate-500 text-[11px]">
                  เมื่อลูกค้ารายใหม่สแกน ระบบจะระบุเป็นคนถัดไป เช่น <strong>{viewQrModalTarget.table_number}-B</strong>
                </p>
                <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                  <Link
                    href={`/order/${params.storeId}/${viewQrModalTarget.id}/${viewQrModalTarget.session.qr_code_token}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>เปิดสั่งอาหาร</span>
                  </Link>

                  <button
                    onClick={handlePrintSlip}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-[11px] flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" />
                    <span>พิมพ์ตั๋ว</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Items Ordered */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ChefHat className="w-4 h-4 text-emerald-600" />
                  <span>รายการอาหารที่สั่งในโต๊ะนี้ ({viewQrModalTarget.session.items?.length || 0} จาน)</span>
                </h4>
                <span className="font-black text-slate-900 text-sm">
                  ยอดรวม: {formatMoney(viewQrModalTarget.session.total_spend)}
                </span>
              </div>

              {viewQrModalTarget.session.items?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  ยังไม่มีคำสั่งซื้อที่ส่งเข้ามาจากโต๊ะนี้
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {viewQrModalTarget.session.items?.map((itm) => (
                    <div
                      key={itm.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{itm.item_name}</span>
                          <span className="text-orange-600 font-bold">x{itm.quantity}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>สั่งโดย: <strong className="text-slate-700">{itm.guest_label}</strong> {itm.guest_nickname ? `(${itm.guest_nickname})` : ''}</span>
                          {itm.notes && <span className="text-amber-600">| {itm.notes}</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          itm.status === 'ready'
                            ? 'bg-emerald-100 text-emerald-700'
                            : itm.status === 'served'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {itm.status === 'ready' ? 'เสร็จแล้ว/พร้อมเสิร์ฟ' : itm.status === 'served' ? 'เสิร์ฟแล้ว' : 'กำลังปรุง'}
                        </span>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">
                          {formatMoney(itm.price * itm.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
              <Link
                href={`/store/${params.storeId}/cashier?table_id=${viewQrModalTarget.id}`}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Receipt className="w-4 h-4" />
                <span>ไปหน้าคิดเงินโต๊ะนี้</span>
              </Link>

              <button
                onClick={() => setViewQrModalTarget(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE SLIP FOR 58mm/80mm THERMAL PRINTERS */}
      {(justOpenedSession || viewQrModalTarget) && (
        <div className="printable-receipt hidden">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>{store?.name}</h2>
            <p style={{ fontSize: '11px', margin: '2px 0' }}>สแกนสั่งอาหารผ่าน QR Code</p>
            <div style={{ fontSize: '18px', fontWeight: 'bold', margin: '6px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0' }}>
              {justOpenedSession?.tableNumber || viewQrModalTarget?.table_number}
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={justOpenedSession?.qrDataUrl || viewQrDataUrl}
              alt="QR Code"
              style={{ width: '150px', height: '150px', margin: '0 auto', display: 'block' }}
            />
          </div>

          <div style={{ fontSize: '10px', textAlign: 'center', margin: '6px 0' }}>
            <p style={{ margin: '2px 0' }}>1. สแกน QR Code ด้วยกล้องมือถือ</p>
            <p style={{ margin: '2px 0' }}>2. สั่งอาหารได้ทันที โดยไม่ต้องโหลดแอป</p>
            <p style={{ margin: '2px 0' }}>3. สแกนหลายคนในโต๊ะ ระบบจะแยกผู้สั่งให้อัตโนมัติ</p>
          </div>

          <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', textAlign: 'center', fontSize: '9px' }}>
            ขอบคุณที่มาใช้บริการครับ
          </div>
        </div>
      )}
    </div>
  );
}
