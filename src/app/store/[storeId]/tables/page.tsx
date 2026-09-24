'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  X,
  Search,
  UserCheck,
  User,
  Sparkles,
  Phone,
  Flame,
  Check
} from 'lucide-react';
import { Table, Store, BuffetTier, Member } from '@/lib/types';
import { formatMoney, formatThaiTime, cn } from '@/lib/utils';
import { playSound } from '@/lib/sound';

interface TableWithDetails extends Table {
  service_call?: 'call_waiter' | 'call_bill' | null;
  session?: {
    id: string;
    opened_at: string;
    elapsed_minutes: number;
    guest_count: number;
    member_id?: string | null;
    member_name?: string | null;
    member_phone?: string | null;
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
    pending_items_count?: number;
    overdue_items_count?: number;
    items: {
      id: string;
      order_id?: string;
      item_name: string;
      quantity: number;
      price: number;
      guest_label: string;
      guest_nickname?: string;
      status: string;
      notes?: string;
      cooking_time_mins?: number;
      elapsed_minutes?: number;
      is_overdue?: boolean;
      created_at?: string;
    }[];
  } | null;
}

export default function TablesPage({ params }: { params: { storeId: string } }) {
  const [store, setStore] = useState<Store | null>(null);
  const [tables, setTables] = useState<TableWithDetails[]>([]);
  const [buffetTiers, setBuffetTiers] = useState<BuffetTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [liveOrdersTab, setLiveOrdersTab] = useState<'pending' | 'all'>('pending');

  // Modals state
  const [openTableModalTarget, setOpenTableModalTarget] = useState<Table | null>(null);
  const [openGuestCount, setOpenGuestCount] = useState(2);
  const [selectedBuffetTierId, setSelectedBuffetTierId] = useState<string>('');
  
  // Member CRM state in Open Table Modal
  const [openCustomerType, setOpenCustomerType] = useState<'walkin' | 'member'>('walkin');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberNotes, setNewMemberNotes] = useState('');

  // Post-open modal
  const [justOpenedSession, setJustOpenedSession] = useState<{
    tableNumber: string;
    qrUrl: string;
    qrDataUrl: string;
    sessionToken: string;
    tableId: string;
    memberName?: string;
  } | null>(null);

  const [viewQrModalTarget, setViewQrModalTarget] = useState<TableWithDetails | null>(null);
  const [viewQrDataUrl, setViewQrDataUrl] = useState<string>('');

  // Call Notification state
  const [activeCallTable, setActiveCallTable] = useState<TableWithDetails | null>(null);
  const prevCallsRef = useRef<Set<string>>(new Set());

  const fetchTables = async () => {
    try {
      const res = await fetch(`/api/tables?store_id=${params.storeId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Detect new service calls or billing requests to trigger sound
        const currentCalls = new Set<string>();
        let callingTable: TableWithDetails | null = null;

        data.forEach((t: TableWithDetails) => {
          if (t.service_call || t.status === 'billing_requested') {
            const key = `${t.id}_${t.service_call || t.status}`;
            currentCalls.add(key);
            if (!prevCallsRef.current.has(key)) {
              playSound('bell');
            }
            if (!callingTable) callingTable = t;
          }
        });

        prevCallsRef.current = currentCalls;
        setActiveCallTable(callingTable);
        setTables(data);
      }
    } catch (e) {
      console.error('Failed to fetch tables:', e);
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

    // 3. Fast polling every 3 seconds for real-time responsiveness
    const interval = setInterval(fetchTables, 3000);
    return () => clearInterval(interval);
  }, [params.storeId]);

  // Search members debounced
  useEffect(() => {
    if (!memberSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingMember(true);
      try {
        const res = await fetch(`/api/members?store_id=${params.storeId}&q=${encodeURIComponent(memberSearchQuery)}`);
        const json = await res.json();
        if (Array.isArray(json)) {
          setSearchResults(json);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingMember(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [memberSearchQuery, params.storeId]);

  // Handle Create Member Inline
  const handleSaveNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          name: newMemberName.trim(),
          phone: newMemberPhone.trim(),
          notes: newMemberNotes.trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.member) {
        setSelectedMember(json.member);
        setShowAddMemberForm(false);
        setNewMemberName('');
        setNewMemberPhone('');
        setNewMemberNotes('');
      } else {
        alert(json.error || 'ไม่สามารถบันทึกสมาชิกได้');
      }
    } catch (e) {
      console.error(e);
    }
  };

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
          member_id: openCustomerType === 'member' ? selectedMember?.id : null,
          member_name: openCustomerType === 'member' ? selectedMember?.name : null,
          member_phone: openCustomerType === 'member' ? selectedMember?.phone : null,
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
          memberName: selectedMember?.name,
        });

        // Reset modal form
        setOpenTableModalTarget(null);
        setSelectedMember(null);
        setMemberSearchQuery('');
        setOpenCustomerType('walkin');
        fetchTables();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Acknowledge / Clear service call
  const handleAcknowledgeCall = async (tableId: string) => {
    try {
      await fetch('/api/cashier/call-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: tableId }),
      });
      setActiveCallTable(null);
      fetchTables();
    } catch (e) {
      console.error(e);
    }
  };

  // Quick update item status from sidebar
  const handleUpdateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      await fetch('/api/orders/item-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, status: newStatus }),
      });
      fetchTables();
    } catch (e) {
      console.error(e);
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
  const billingCount = tables.filter(t => t.status === 'billing_requested' || t.service_call === 'call_bill').length;
  const waiterCallCount = tables.filter(t => t.service_call === 'call_waiter').length;

  // Flatten all active order items for right sidebar
  const allActiveItems = tables
    .flatMap(t => (t.session?.items || []).map(itm => ({
      ...itm,
      table_id: t.id,
      table_number: t.table_number,
      zone: t.zone,
    })))
    .filter(itm => itm.status !== 'cancelled');

  const pendingItemsList = allActiveItems.filter(itm => itm.status === 'pending' || itm.status === 'cooking');
  const overdueItemsList = allActiveItems.filter(itm => itm.is_overdue);

  return (
    <div className="space-y-6">
      {/* POPUP NOTIFICATION MODAL: WHEN A TABLE CALLS WAITER OR BILL */}
      {activeCallTable && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-red-500 p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center text-red-600 animate-bounce flex-shrink-0">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  {activeCallTable.service_call === 'call_waiter' ? '🔔 ลูกค้าเรียกพนักงาน!' : '💵 รอลูกค้าเช็กบิล!'}
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight mt-1">
                  {activeCallTable.table_number} ({activeCallTable.zone})
                </h3>
                <p className="text-xs text-slate-500">
                  {activeCallTable.service_call === 'call_waiter'
                    ? 'ลูกค้ากดเรียกพนักงานมาที่โต๊ะ กรุณาไปให้บริการ'
                    : 'ลูกค้ากดเรียกเช็กบิล ยอดรวม: ' + formatMoney(activeCallTable.session?.total_spend || 0)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveCallTable(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => handleAcknowledgeCall(activeCallTable.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Check className="w-4 h-4" />
              <span>รับทราบ / เคลียร์แจ้งเตือน</span>
            </button>

            {(activeCallTable.status === 'billing_requested' || activeCallTable.service_call === 'call_bill') && (
              <Link
                href={`/store/${params.storeId}/cashier?table_id=${activeCallTable.id}`}
                className="py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Receipt className="w-4 h-4" />
                <span>ไปหน้าคิดเงิน</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Top Banner / Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-500" />
            <span>ผังโต๊ะอาหาร & จัดการโต๊ะ (Table Grid)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เห็นสถานะโต๊ะสด ยอดเงินปัจจุบัน รายการค้าง และมีแจ้งเตือนสีแดงทันทีเมื่อปรุงเกินเวลา
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

          {waiterCallCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center gap-1.5 animate-bounce">
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span>เรียกพนักงาน: {waiterCallCount} โต๊ะ!</span>
            </div>
          )}

          {billingCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-red-100 border border-red-300 text-red-700 font-bold flex items-center gap-1.5 animate-bounce">
              <Receipt className="w-3.5 h-3.5 text-red-600" />
              <span>รอเช็กบิล: {billingCount} โต๊ะ!</span>
            </div>
          )}

          {overdueItemsList.length > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-black flex items-center gap-1.5 animate-pulse shadow-md shadow-rose-600/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>อาหารเกินเวลา: {overdueItemsList.length} จาน!</span>
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

      {/* MAIN TWO-COLUMN LAYOUT: TABLES GRID (LEFT) + LIVE ORDERS SIDEBAR (RIGHT) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: TABLE CARDS (7 or 8 cols) */}
        <div className="xl:col-span-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTables.map((tbl) => {
              const isOccupied = tbl.status === 'occupied' || tbl.status === 'billing_requested';
              const isBillingRequested = tbl.status === 'billing_requested' || tbl.service_call === 'call_bill';
              const isWaiterCalled = tbl.service_call === 'call_waiter';
              const hasAlert = isBillingRequested || isWaiterCalled;
              const hasOverdue = (tbl.session?.overdue_items_count || 0) > 0;

              return (
                <div
                  key={tbl.id}
                  className={cn(
                    "rounded-2xl transition-all relative flex flex-col justify-between overflow-hidden bg-white shadow-sm",
                    hasAlert
                      ? "border-2 border-red-500 bg-red-50/20 shadow-lg shadow-red-500/20 ring-2 ring-red-400/40"
                      : isOccupied
                      ? "border border-blue-200 hover:border-blue-400"
                      : "border border-slate-200 hover:border-emerald-400"
                  )}
                >
                  {/* Card Header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-lg leading-tight">
                            {tbl.table_number}
                          </h3>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {tbl.zone}
                          </span>
                        </div>

                        {/* Member badge if assigned */}
                        {tbl.session?.member_name && (
                          <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1.5 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{tbl.session.member_name}</span>
                            {tbl.session.member_phone && (
                              <span className="text-slate-400 text-[10px]">({tbl.session.member_phone})</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col items-end gap-1">
                        {isWaiterCalled && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold animate-bounce flex items-center gap-1">
                            <BellRing className="w-3 h-3" />
                            <span>เรียกพนักงาน</span>
                          </span>
                        )}

                        {isBillingRequested && (
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold animate-pulse flex items-center gap-1">
                            <Receipt className="w-3 h-3" />
                            <span>เรียกเช็กบิล</span>
                          </span>
                        )}

                        {!hasAlert && isOccupied && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                            นั่งทาน ({tbl.session?.guest_count} คน)
                          </span>
                        )}

                        {!isOccupied && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            ว่าง ({tbl.capacity} ที่)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Occupied Table Details */}
                    {isOccupied && tbl.session && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                        {/* Time & spend info */}
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>เปิด {formatThaiTime(tbl.session.opened_at)} ({tbl.session.elapsed_minutes} น.)</span>
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {formatMoney(tbl.session.total_spend)}
                          </span>
                        </div>

                        {/* Buffet countdown if buffet */}
                        {tbl.session.buffet_tier_name && (
                          <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-900">{tbl.session.buffet_tier_name}</span>
                            <span className={cn(
                              "font-black",
                              tbl.session.buffet_is_expired ? "text-red-600 animate-pulse" : "text-amber-800"
                            )}>
                              ⏱️ {tbl.session.buffet_is_expired ? 'หมดเวลาแล้ว' : `เหลือ ${tbl.session.buffet_remaining_minutes} นาที`}
                            </span>
                          </div>
                        )}

                        {/* Pending & Overdue Badges */}
                        <div className="flex items-center justify-between gap-1 pt-1 text-[11px]">
                          <span className="text-slate-500 font-medium">
                            สั่งแล้ว {tbl.session.items_count || 0} รายการ
                            {(tbl.session.pending_items_count || 0) > 0 && (
                              <strong className="text-blue-600 ml-1">({tbl.session.pending_items_count} ค้างทำ)</strong>
                            )}
                          </span>

                          {hasOverdue && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-black animate-pulse flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              <span>เกินเวลา {tbl.session.overdue_items_count} จาน!</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer / Action Buttons */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5">
                    {isOccupied && tbl.session ? (
                      <>
                        <button
                          onClick={() => handleOpenViewQr(tbl)}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition"
                        >
                          <QrCode className="w-3.5 h-3.5 text-slate-500" />
                          <span>ดู QR</span>
                        </button>

                        {hasAlert && (
                          <button
                            onClick={() => handleAcknowledgeCall(tbl.id)}
                            className="py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1"
                            title="รับทราบการเรียก"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>รับทราบ</span>
                          </button>
                        )}

                        <Link
                          href={`/store/${params.storeId}/cashier?table_id=${tbl.id}`}
                          className={cn(
                            "flex-1 py-2 px-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1 transition shadow-sm",
                            isBillingRequested
                              ? "bg-red-600 hover:bg-red-500 animate-pulse"
                              : "bg-blue-600 hover:bg-blue-500"
                          )}
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>คิดเงิน</span>
                        </Link>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setOpenTableModalTarget(tbl);
                          setSelectedMember(null);
                          setMemberSearchQuery('');
                          setOpenCustomerType('walkin');
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>เปิดโต๊ะ (Check-in)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE ORDERS & KITCHEN SLA STATUS SIDEBAR (4 cols) */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-500" />
                <span>สถานะออเดอร์สด (Live Orders)</span>
              </h3>
              <p className="text-[11px] text-slate-500">อัปเดตแบบเรียลไทม์ พร้อมติดตามจานที่เกินเวลา</p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
              <button
                onClick={() => setLiveOrdersTab('pending')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition",
                  liveOrdersTab === 'pending' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                ค้างทำ ({pendingItemsList.length})
              </button>
              <button
                onClick={() => setLiveOrdersTab('all')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition",
                  liveOrdersTab === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                ทั้งหมด ({allActiveItems.length})
              </button>
            </div>
          </div>

          {/* Overdue Alert Banner if any */}
          {overdueItemsList.length > 0 && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>
                <strong>มีอาหารเกินเวลา {overdueItemsList.length} รายการ!</strong> กรุณาติดตามกับแม่ครัวด่วน
              </span>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {(liveOrdersTab === 'pending' ? pendingItemsList : allActiveItems).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <ChefHat className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <span>ไม่มีรายการอาหารค้างทำในขณะนี้ ครัวเคลียร์ครบแล้ว</span>
              </div>
            ) : (
              (liveOrdersTab === 'pending' ? pendingItemsList : allActiveItems).map((itm) => {
                const isOverdue = itm.is_overdue;
                const elapsed = itm.elapsed_minutes || 0;
                const limit = itm.cooking_time_mins || 10;

                return (
                  <div
                    key={itm.id}
                    className={cn(
                      "p-3 rounded-xl border transition text-xs space-y-2",
                      isOverdue
                        ? "bg-red-50/70 border-red-300 ring-1 ring-red-400 shadow-sm"
                        : itm.status === 'ready'
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-slate-50/80 border-slate-200/80"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] border border-blue-200">
                            {itm.table_number}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{itm.item_name}</span>
                          <span className="text-orange-600 font-extrabold">x{itm.quantity}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>สั่งโดย: {itm.guest_label} {itm.guest_nickname ? `(${itm.guest_nickname})` : ''}</span>
                        </div>
                        {itm.notes && (
                          <div className="text-[11px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded mt-1 border border-amber-200">
                            หมายเหตุ: {itm.notes}
                          </div>
                        )}
                      </div>

                      {/* Status indicator */}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0",
                        itm.status === 'ready'
                          ? "bg-emerald-100 text-emerald-800"
                          : itm.status === 'served'
                          ? "bg-slate-200 text-slate-700"
                          : itm.status === 'cooking'
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      )}>
                        {itm.status === 'ready' ? '✓ ปรุงเสร็จ' : itm.status === 'served' ? 'เสิร์ฟแล้ว' : itm.status === 'cooking' ? '🍳 กำลังปรุง' : '🕒 รอดำเนินการ'}
                      </span>
                    </div>

                    {/* Time limit & Overdue Warning */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className={cn(isOverdue ? "text-red-700 font-bold" : "text-slate-500")}>
                          สั่งมาแล้ว {elapsed} นาที (กำหนด {limit} นาที)
                        </span>
                      </div>

                      {isOverdue && (
                        <span className="font-black text-red-600 animate-pulse">
                          ⚠️ เกินเวลา! ตามครัวด่วน
                        </span>
                      )}
                    </div>

                    {/* Quick status progress buttons */}
                    <div className="flex gap-1.5 pt-1">
                      {itm.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateItemStatus(itm.id, 'cooking')}
                          className="flex-1 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] transition"
                        >
                          เริ่มปรุง
                        </button>
                      )}
                      {itm.status === 'cooking' && (
                        <button
                          onClick={() => handleUpdateItemStatus(itm.id, 'ready')}
                          className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition"
                        >
                          ปรุงเสร็จแล้ว
                        </button>
                      )}
                      {itm.status === 'ready' && (
                        <button
                          onClick={() => handleUpdateItemStatus(itm.id, 'served')}
                          className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] transition"
                        >
                          เสิร์ฟแล้ว
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: OPEN TABLE & MEMBER CRM INTEGRATION */}
      {openTableModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  เปิดโต๊ะ: {openTableModalTarget.table_number} ({openTableModalTarget.zone})
                </h3>
                <p className="text-xs text-slate-500">ความจุโต๊ะ: {openTableModalTarget.capacity} ที่นั่ง</p>
              </div>
              <button
                onClick={() => setOpenTableModalTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOpenTable} className="space-y-4">
              {/* Customer Type Selector: Walk-in vs Member */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ประเภทลูกค้า *</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenCustomerType('walkin');
                      setSelectedMember(null);
                    }}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition",
                      openCustomerType === 'walkin'
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <User className="w-4 h-4" />
                    <span>ลูกค้าทั่วไป (Walk-in)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpenCustomerType('member')}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition",
                      openCustomerType === 'member'
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span>ลูกค้าสมาชิก (CRM)</span>
                  </button>
                </div>
              </div>

              {/* Member CRM Lookup / Inline Register */}
              {openCustomerType === 'member' && (
                <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-200/80 space-y-3">
                  {!selectedMember && !showAddMemberForm && (
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        ค้นหาสมาชิก (ด้วยเบอร์โทร หรือ ชื่อ)
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="พิมพ์เบอร์โทร 081... หรือชื่อ..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      {/* Search Results Dropdown */}
                      {searchResults.length > 0 && (
                        <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-md divide-y divide-slate-100 max-h-40 overflow-y-auto">
                          {searchResults.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedMember(m);
                                setMemberSearchQuery('');
                                setSearchResults([]);
                              }}
                              className="w-full p-2.5 text-left text-xs hover:bg-orange-50 flex items-center justify-between transition"
                            >
                              <div>
                                <strong className="text-slate-900 font-bold block">{m.name}</strong>
                                <span className="text-[11px] text-slate-500">{m.phone}</span>
                              </div>
                              <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                {m.points || 0} แต้ม
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 flex justify-between items-center text-xs">
                        <span className="text-slate-500 text-[11px]">ไม่พบข้อมูลสมาชิก?</span>
                        <button
                          type="button"
                          onClick={() => setShowAddMemberForm(true)}
                          className="font-bold text-orange-600 hover:text-orange-700 text-xs flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ ลงทะเบียนสมาชิกใหม่</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Selected Member Badge */}
                  {selectedMember && (
                    <div className="p-3 bg-white rounded-xl border border-orange-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                          👑
                        </div>
                        <div>
                          <strong className="text-slate-900 text-xs block">{selectedMember.name}</strong>
                          <span className="text-[11px] text-slate-500">{selectedMember.phone} • {selectedMember.points || 0} แต้ม</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedMember(null)}
                        className="text-xs text-red-600 hover:text-red-700 font-bold"
                      >
                        เปลี่ยน
                      </button>
                    </div>
                  )}

                  {/* Add New Member Form Inline */}
                  {showAddMemberForm && !selectedMember && (
                    <div className="bg-white p-3 rounded-xl border border-orange-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">ลงทะเบียนสมาชิกใหม่</span>
                        <button
                          type="button"
                          onClick={() => setShowAddMemberForm(false)}
                          className="text-slate-400 text-xs"
                        >
                          ยกเลิก
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="ชื่อ-นามสกุล *"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                      <input
                        type="tel"
                        placeholder="เบอร์โทรศัพท์ (สำหรับค้นหา) *"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="หมายเหตุ (เช่น แพ้อาหาร, สาขาประจำ)"
                        value={newMemberNotes}
                        onChange={(e) => setNewMemberNotes(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />

                      <button
                        type="button"
                        onClick={handleSaveNewMember}
                        className="w-full py-2 rounded-lg bg-orange-600 text-white font-bold text-xs hover:bg-orange-500 transition"
                      >
                        บันทึก & ผูกกับโต๊ะนี้
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Number of Guests */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">จำนวนลูกค้า (ท่าน) *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 4, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setOpenGuestCount(num)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition",
                        openGuestCount === num
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
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
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition",
                          selectedBuffetTierId === tier.id
                            ? "border-orange-500 bg-orange-50/70 ring-1 ring-orange-500"
                            : "border-slate-200 hover:bg-slate-50"
                        )}
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
            {justOpenedSession.memberName && (
              <p className="text-xs font-bold text-amber-700 mb-2">
                👑 สมาชิก: {justOpenedSession.memberName}
              </p>
            )}
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
                {viewQrModalTarget.session.member_name && (
                  <p className="text-xs font-bold text-amber-700 mt-0.5">
                    👑 สมาชิก: {viewQrModalTarget.session.member_name} ({viewQrModalTarget.session.member_phone})
                  </p>
                )}
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
                      className={cn(
                        "p-2.5 rounded-xl border flex items-center justify-between text-xs",
                        itm.is_overdue
                          ? "bg-red-50 border-red-300"
                          : "bg-slate-50 border-slate-200/60"
                      )}
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
                        {itm.is_overdue && (
                          <span className="text-[10px] text-red-600 font-bold">
                            ⚠️ เกินเวลาทำ ({itm.elapsed_minutes} น. / กำหนด {itm.cooking_time_mins} น.)
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          itm.status === 'ready'
                            ? 'bg-emerald-100 text-emerald-700'
                            : itm.status === 'served'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {itm.status === 'ready' ? 'เสร็จแล้ว' : itm.status === 'served' ? 'เสิร์ฟแล้ว' : 'กำลังปรุง'}
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
            {justOpenedSession?.memberName && (
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '2px 0' }}>
                สมาชิก: {justOpenedSession.memberName}
              </p>
            )}
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
