'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  UtensilsCrossed,
  Plus,
  Users,
  Clock,
  QrCode,
  Receipt,
  BellRing,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Printer,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Flame,
  Check,
  UserCheck,
  Eye,
  ShieldAlert,
  ArrowRight,
  Layers,
  LayoutGrid,
  UserPlus
} from 'lucide-react';
import { Store, Table, BuffetTier, Member, TableStatus, ServiceCallType } from '@/lib/types';
import { formatMoney, formatThaiTime, cn } from '@/lib/utils';
import { playSound } from '@/lib/sound';
import { printReceiptHtml, renderTableSlipHtml } from '@/lib/print';

interface TableWithDetails extends Table {
  session?: {
    id: string;
    opened_at: string;
    elapsed_minutes: number;
    guest_count: number;
    member_id?: string | null;
    member_name?: string | null;
    member_nickname?: string | null;
    member_phone?: string | null;
    buffet_tier_id?: string | null;
    buffet_tier_name?: string | null;
    buffet_tier_price?: number | null;
    buffet_tier_color?: string | null;
    buffet_end_time?: string | null;
    buffet_remaining_minutes?: number | null;
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
  const [viewGroupingMode, setViewGroupingMode] = useState<'by_zone' | 'flat'>('by_zone');
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
  const [newMemberNickname, setNewMemberNickname] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberNotes, setNewMemberNotes] = useState('');

  // Assign Staff Modal State
  const [assignStaffModalTarget, setAssignStaffModalTarget] = useState<{
    type: 'table' | 'zone';
    targetId: string;
    targetName: string;
    currentStaff: string;
  } | null>(null);
  const [staffInputName, setStaffInputName] = useState('');
  const [assigningStaff, setAssigningStaff] = useState(false);
  const commonStaffList = ['น้องฟ้า', 'น้องน้ำ', 'น้องฟิล์ม', 'น้องมุก', 'พี่เอก (กัปตัน)', 'พี่สมชาย (ผู้จัดการ)'];

  // Post-open modal
  const [justOpenedSession, setJustOpenedSession] = useState<{
    tableNumber: string;
    qrUrl: string;
    qrDataUrl: string;
    sessionToken: string;
    tableId: string;
    memberName?: string;
    memberNickname?: string;
  } | null>(null);

  const [viewQrModalTarget, setViewQrModalTarget] = useState<TableWithDetails | null>(null);
  const [viewQrDataUrl, setViewQrDataUrl] = useState<string>('');

  // Call Notification state
  const [activeCallTable, setActiveCallTable] = useState<TableWithDetails | null>(null);
  const prevCallsRef = useRef<Set<string>>(new Set());

  const fetchTables = async () => {
    try {
      // Use timestamp query param and no-store to completely avoid cached responses
      const res = await fetch(`/api/tables?store_id=${params.storeId}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      });
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

    // 3. Fast polling every 2.5 seconds for real-time responsiveness
    const interval = setInterval(fetchTables, 2500);
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
        const res = await fetch(`/api/members?store_id=${params.storeId}&q=${encodeURIComponent(memberSearchQuery)}&_t=${Date.now()}`);
        const json = await res.json();
        if (Array.isArray(json)) {
          setSearchResults(json);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingMember(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [memberSearchQuery, params.storeId]);

  // Handle Create Member Inline (with Nickname)
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
          nickname: newMemberNickname.trim() || null,
          phone: newMemberPhone.trim(),
          notes: newMemberNotes.trim(),
        }),
      });
      const json = await res.json();
      if (json.success && json.member) {
        setSelectedMember(json.member);
        setShowAddMemberForm(false);
        setNewMemberName('');
        setNewMemberNickname('');
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
          member_nickname: openCustomerType === 'member' ? selectedMember?.nickname : null,
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
          memberNickname: selectedMember?.nickname || undefined,
        });

        // Reset modal form
        setOpenTableModalTarget(null);
        setSelectedMember(null);
        setMemberSearchQuery('');
        setOpenCustomerType('walkin');

        // Immediately update tables state
        await fetchTables();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการเปิดโต๊ะ');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Assign Staff (Table or Zone)
  const handleConfirmAssignStaff = async () => {
    if (!assignStaffModalTarget) return;
    setAssigningStaff(true);
    try {
      const payload: any = {
        store_id: params.storeId,
        assigned_staff: staffInputName.trim() || null,
      };
      if (assignStaffModalTarget.type === 'table') {
        payload.table_id = assignStaffModalTarget.targetId;
      } else {
        payload.zone = assignStaffModalTarget.targetId;
      }

      const res = await fetch('/api/tables/assign-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setAssignStaffModalTarget(null);
        setStaffInputName('');
        await fetchTables();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการกำหนดพนักงาน');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAssigningStaff(false);
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
      await fetchTables();
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
      await fetchTables();
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

  const handlePrintJustOpenedSlip = () => {
    if (!justOpenedSession) return;
    const html = renderTableSlipHtml({
      storeName: store?.name,
      tableNumber: justOpenedSession.tableNumber,
      qrDataUrl: justOpenedSession.qrDataUrl,
      openedAt: new Date().toISOString(),
      guestCount: openGuestCount,
      memberName: justOpenedSession.memberName,
    });
    printReceiptHtml(html, `ใบเปิดโต๊ะ_${justOpenedSession.tableNumber}`);
  };

  const handlePrintViewQrSlip = () => {
    if (!viewQrModalTarget) return;
    const html = renderTableSlipHtml({
      storeName: store?.name,
      tableNumber: viewQrModalTarget.table_number,
      zone: viewQrModalTarget.zone,
      qrDataUrl: viewQrDataUrl,
      openedAt: viewQrModalTarget.session?.opened_at,
      guestCount: viewQrModalTarget.session?.guest_count,
      memberName: viewQrModalTarget.session?.member_name || undefined,
    });
    printReceiptHtml(html, `ใบเปิดโต๊ะ_${viewQrModalTarget.table_number}`);
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

  // Helper renderer for a single table card
  const renderTableCard = (tbl: TableWithDetails) => {
    const isOccupied = tbl.status === 'occupied' || tbl.status === 'billing_requested';
    const isBillingRequested = tbl.status === 'billing_requested' || tbl.service_call === 'call_bill';
    const isWaiterCalled = tbl.service_call === 'call_waiter';
    const hasAlert = isBillingRequested || isWaiterCalled;
    const hasOverdue = (tbl.session?.overdue_items_count || 0) > 0;

    return (
      <div
        key={tbl.id}
        className={cn(
          "rounded-2xl transition-all relative flex flex-col justify-between overflow-hidden bg-white shadow-sm border",
          hasAlert
            ? "border-2 border-red-500 bg-red-50/20 shadow-lg shadow-red-500/20 ring-2 ring-red-400/40"
            : isOccupied
            ? "border-blue-200 hover:border-blue-400"
            : "border-slate-200 hover:border-emerald-400"
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
                  {tbl.session.member_nickname && (
                    <span className="text-amber-700">({tbl.session.member_nickname})</span>
                  )}
                  {tbl.session.member_phone && (
                    <span className="text-slate-400 text-[10px]">({tbl.session.member_phone})</span>
                  )}
                </div>
              )}

              {/* Staff Assigned to Table badge */}
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAssignStaffModalTarget({
                      type: 'table',
                      targetId: tbl.id,
                      targetName: tbl.table_number,
                      currentStaff: tbl.assigned_staff || '',
                    });
                    setStaffInputName(tbl.assigned_staff || '');
                  }}
                  className="text-[10px] font-semibold inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 hover:underline"
                  title="คลิกเพื่อเปลี่ยนพนักงานดูแลโต๊ะนี้"
                >
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  <span>
                    ผู้ดูแล: <strong className="text-slate-800">{tbl.assigned_staff || 'ยังไม่ระบุ (คลิกตั้ง)'}</strong>
                  </span>
                </button>
              </div>
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
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold">
                  ทั้งหมด {tbl.session.items_count} จาน
                </span>

                {(tbl.session.pending_items_count || 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 text-[10px] font-bold">
                    กำลังทำ {tbl.session.pending_items_count}
                  </span>
                )}

                {hasOverdue && (
                  <span className="px-2 py-0.5 rounded-lg bg-red-600 text-white text-[10px] font-black animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
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
                setOpenGuestCount(2);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>เปิดโต๊ะใหม่ / รับลูกค้า</span>
            </button>
          )}
        </div>
      </div>
    );
  };

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
                {activeCallTable.assigned_staff && (
                  <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                    👤 พนักงานรับผิดชอบ: {activeCallTable.assigned_staff}
                  </p>
                )}
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
            <span>ผังโต๊ะอาหาร & จัดการโซน (Table & Zone Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดกลุ่มแยกตามโซน ตั้งพนักงานรับผิดชอบประจำโซน/โต๊ะ พร้อมระบบแจ้งเตือนและรายการอาหารปรุงสด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setViewGroupingMode('by_zone')}
              className={cn(
                "px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition",
                viewGroupingMode === 'by_zone' ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>จัดกลุ่มตามโซน</span>
            </button>
            <button
              onClick={() => setViewGroupingMode('flat')}
              className={cn(
                "px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition",
                viewGroupingMode === 'flat' ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <span>มุมมองรวม</span>
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Quick status counters */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              ว่าง {availableCount}
            </span>
            <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              นั่งทาน {occupiedCount}
            </span>
            {billingCount > 0 && (
              <span className="px-3 py-1 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200 animate-pulse">
                เรียกเช็กบิล {billingCount}
              </span>
            )}
            {waiterCallCount > 0 && (
              <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 animate-bounce">
                เรียกพนักงาน {waiterCallCount}
              </span>
            )}
          </div>

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
          ทุกโซน ({tables.length} โต๊ะ)
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
        {/* LEFT COLUMN: TABLE CARDS (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          {viewGroupingMode === 'by_zone' ? (
            /* GROUPED BY ZONE VIEW */
            <div className="space-y-6">
              {(selectedZone === 'all' ? zones : [selectedZone]).map((zoneName) => {
                const zoneTables = tables.filter(t => t.zone === zoneName);
                if (zoneTables.length === 0) return null;

                const zoneAvailable = zoneTables.filter(t => t.status === 'available').length;
                const zoneOccupied = zoneTables.filter(t => t.status === 'occupied' || t.status === 'billing_requested').length;
                
                // Get zone staff from tables in this zone if any
                const zoneStaffs = Array.from(new Set(zoneTables.map(t => t.assigned_staff).filter(Boolean)));
                const displayZoneStaff = zoneStaffs.length > 0 ? zoneStaffs.join(', ') : 'ยังไม่ระบุ';

                return (
                  <div key={zoneName} className="bg-slate-50/80 rounded-3xl border border-slate-200/90 p-5 space-y-4 shadow-sm">
                    {/* Zone Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                            <span>โซน {zoneName}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {zoneTables.length} โต๊ะ
                            </span>
                          </h3>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="text-emerald-700 font-medium">ว่าง {zoneAvailable}</span>
                            <span>•</span>
                            <span className="text-blue-700 font-medium">กำลังนั่ง {zoneOccupied}</span>
                          </div>
                        </div>
                      </div>

                      {/* Zone Staff Assignment Button */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500">พนักงานดูแลโซน: </span>
                          <strong className="text-slate-800">{displayZoneStaff}</strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAssignStaffModalTarget({
                              type: 'zone',
                              targetId: zoneName,
                              targetName: `โซน ${zoneName}`,
                              currentStaff: zoneStaffs[0] || '',
                            });
                            setStaffInputName(zoneStaffs[0] || '');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>กำหนดพนักงานประจำโซน</span>
                        </button>
                      </div>
                    </div>

                    {/* Zone Table Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {zoneTables.map(renderTableCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* FLAT GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTables.map(renderTableCard)}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE ORDERS & KITCHEN SLA STATUS (4 cols) */}
        <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span>สถานะออเดอร์สด (Live Orders)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ติดตามรายการอาหารที่สั่งในร้าน และแจ้งเตือน SLA เกินเวลา
              </p>
            </div>

            {overdueItemsList.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-black animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>เกิน SLA {overdueItemsList.length}</span>
              </span>
            )}
          </div>

          {/* Subtabs for live orders */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setLiveOrdersTab('pending')}
              className={cn(
                "flex-1 py-1.5 rounded-lg transition text-center",
                liveOrdersTab === 'pending' ? "bg-white text-orange-600 shadow-sm" : "hover:text-slate-900"
              )}
            >
              กำลังปรุง ({pendingItemsList.length})
            </button>
            <button
              onClick={() => setLiveOrdersTab('all')}
              className={cn(
                "flex-1 py-1.5 rounded-lg transition text-center",
                liveOrdersTab === 'all' ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
              )}
            >
              ทั้งหมด ({allActiveItems.length})
            </button>
          </div>

          {/* Orders List in Sidebar */}
          <div className="max-h-[680px] overflow-y-auto space-y-2.5 pr-1">
            {(liveOrdersTab === 'pending' ? pendingItemsList : allActiveItems).length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                {liveOrdersTab === 'pending' ? 'ไม่มีรายการอาหารที่รอปรุงในขณะนี้' : 'ยังไม่มีรายการอาหารที่สั่ง'}
              </div>
            ) : (
              (liveOrdersTab === 'pending' ? pendingItemsList : allActiveItems).map((item) => {
                const isOverdue = item.is_overdue;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 rounded-2xl border transition-all text-xs flex flex-col gap-2",
                      isOverdue
                        ? "bg-red-50/90 border-red-300 ring-2 ring-red-400/40"
                        : item.status === 'cooking'
                        ? "bg-amber-50/60 border-amber-200"
                        : item.status === 'ready'
                        ? "bg-emerald-50/60 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 text-sm">{item.table_number}</span>
                          <span className="text-[10px] text-slate-500 font-semibold">({item.zone})</span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                            {item.guest_label}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">
                          {item.item_name} <span className="text-orange-600 font-black">x{item.quantity}</span>
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-red-600 font-semibold mt-0.5">
                            * {item.notes}
                          </div>
                        )}
                      </div>

                      {/* SLA Warning or Time */}
                      <div className="text-right">
                        <div className={cn(
                          "text-[11px] font-black inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                          isOverdue
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-slate-200 text-slate-700"
                        )}>
                          <Clock className="w-3 h-3" />
                          <span>{item.elapsed_minutes || 0}/{item.cooking_time_mins || 10} น.</span>
                        </div>
                        {isOverdue && (
                          <span className="block text-[10px] font-bold text-red-600 mt-0.5">
                            ⚠️ เกินเวลา SLA!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick status progress buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500">
                        สถานะ: <strong className="text-slate-800">{
                          item.status === 'pending' ? 'รอดำเนินการ' :
                          item.status === 'cooking' ? 'กำลังทำ' :
                          item.status === 'ready' ? 'เสร็จพร้อมเสิร์ฟ' : 'เสิร์ฟแล้ว'
                        }</strong>
                      </span>

                      <div className="flex items-center gap-1">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateItemStatus(item.id, 'cooking')}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] transition"
                          >
                            เริ่มทำ
                          </button>
                        )}
                        {item.status === 'cooking' && (
                          <button
                            onClick={() => handleUpdateItemStatus(item.id, 'ready')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition"
                          >
                            เสร็จแล้ว
                          </button>
                        )}
                        {item.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateItemStatus(item.id, 'served')}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[10px] transition"
                          >
                            เสิร์ฟแล้ว
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Link
              href={`/store/${params.storeId}/kds`}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>เปิดหน้าจอครัวเต็มจอ (Kitchen KDS Display)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* MODAL 1: OPEN TABLE & MEMBER CRM */}
      {openTableModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
                  <span>เปิดโต๊ะใหม่: {openTableModalTarget.table_number} ({openTableModalTarget.zone})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ความจุโต๊ะ: {openTableModalTarget.capacity} ที่นั่ง
                </p>
              </div>
              <button
                onClick={() => setOpenTableModalTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOpenTable} className="space-y-4">
              {/* Guest Count */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  จำนวนลูกค้าที่มานั่ง (ท่าน) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={openTableModalTarget.capacity * 2}
                    value={openGuestCount}
                    onChange={(e) => setOpenGuestCount(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-center text-sm font-extrabold rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                  <div className="flex gap-1.5">
                    {[1, 2, 4, 6, 8].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setOpenGuestCount(c)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          openGuestCount === c
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {c} คน
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Buffet Tier Selector if store is buffet */}
              {store?.type === 'buffet' && buffetTiers.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    เลือกแพ็กเกจบุฟเฟ่ต์ (Buffet Tier) *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {buffetTiers.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedBuffetTierId(tier.id)}
                        className={`p-3 rounded-2xl border text-left transition ${
                          selectedBuffetTierId === tier.id
                            ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <strong className="block font-black text-slate-900 text-sm">{tier.name}</strong>
                        <span className="text-orange-600 font-extrabold text-xs">
                          {formatMoney(tier.price)} / ท่าน
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Type Selector: Walk-in vs Member */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-800 block">ข้อมูลลูกค้า & สมาชิก (CRM)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenCustomerType('walkin');
                      setSelectedMember(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      openCustomerType === 'walkin'
                        ? 'bg-slate-900 text-white shadow'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>ลูกค้าทั่วไป (Walk-in)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpenCustomerType('member')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      openCustomerType === 'member'
                        ? 'bg-amber-600 text-white shadow'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>สมาชิกร้าน (Member)</span>
                  </button>
                </div>

                {/* Member Search / Form */}
                {openCustomerType === 'member' && (
                  <div className="space-y-3 pt-2">
                    {selectedMember ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-extrabold text-amber-950 text-sm flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            <span>คุณ{selectedMember.name}</span>
                            {selectedMember.nickname && (
                              <span className="text-amber-800 font-bold">({selectedMember.nickname})</span>
                            )}
                          </div>
                          <div className="text-amber-800 mt-0.5">
                            เบอร์: {selectedMember.phone} | แต้มสะสม: {selectedMember.points || 0} แต้ม
                          </div>
                          {selectedMember.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              หมายเหตุ: {selectedMember.notes}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedMember(null)}
                          className="text-xs text-red-600 font-bold hover:underline"
                        >
                          เปลี่ยน
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="ค้นหาชื่อเล่น, ชื่อจริง หรือเบอร์โทรสมาชิก..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-amber-600"
                          />
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                          <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-slate-200 text-xs shadow-sm">
                            {searchResults.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMember(m);
                                  setMemberSearchQuery('');
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-amber-50 flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold text-slate-900">คุณ{m.name}</span>
                                  {m.nickname && (
                                    <span className="ml-1 text-amber-800 font-bold">({m.nickname})</span>
                                  )}
                                  <span className="ml-2 text-slate-500">{m.phone}</span>
                                </div>
                                <span className="font-bold text-amber-600">{m.points || 0} แต้ม</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Inline Add Member Toggle */}
                        {!showAddMemberForm ? (
                          <button
                            type="button"
                            onClick={() => setShowAddMemberForm(true)}
                            className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ ลงทะเบียนสมาชิกใหม่ทันที</span>
                          </button>
                        ) : (
                          <div className="p-3 bg-white rounded-xl border border-amber-300 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">กรอกข้อมูลสมาชิกใหม่</span>
                              <button
                                type="button"
                                onClick={() => setShowAddMemberForm(false)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                ยกเลิก
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="ชื่อ-นามสกุล *"
                                value={newMemberName}
                                onChange={(e) => setNewMemberName(e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300"
                              />
                              <input
                                type="text"
                                placeholder="ชื่อเล่น (เช่น บอย, ตาล, หมวย)"
                                value={newMemberNickname}
                                onChange={(e) => setNewMemberNickname(e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                              />
                            </div>
                            <input
                              type="tel"
                              placeholder="เบอร์โทรศัพท์ *"
                              value={newMemberPhone}
                              onChange={(e) => setNewMemberPhone(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                            />
                            <input
                              type="text"
                              placeholder="หมายเหตุ / ข้อควรระวัง (เช่น ไม่ทานเนื้อ)"
                              value={newMemberNotes}
                              onChange={(e) => setNewMemberNotes(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={handleSaveNewMember}
                              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-sm transition"
                            >
                              บันทึกสมาชิก & เลือกใช้งาน
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpenTableModalTarget(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>ยืนยันเปิดโต๊ะ & สร้าง QR Code</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN STAFF TO TABLE OR ZONE */}
      {assignStaffModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <span>ตั้งพนักงานรับผิดชอบ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เป้าหมาย: <strong className="text-slate-800">{assignStaffModalTarget.targetName}</strong>
                </p>
              </div>
              <button
                onClick={() => setAssignStaffModalTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ชื่อพนักงานผู้รับผิดชอบ
                </label>
                <input
                  type="text"
                  placeholder="เช่น น้องฟ้า, น้องน้ำ, พี่เอก"
                  value={staffInputName}
                  onChange={(e) => setStaffInputName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>

              {/* Quick Staff Selection Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  เลือกพนักงานด่วน:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {commonStaffList.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStaffInputName(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        staffInputName === st
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStaffInputName('')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    ล้างค่า (ไม่ระบุ)
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAssignStaffModalTarget(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={assigningStaff}
                  onClick={handleConfirmAssignStaff}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-sm transition"
                >
                  {assigningStaff ? 'กำลังบันทึก...' : 'บันทึกพนักงาน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: JUST OPENED SESSION QR CODE MODAL */}
      {justOpenedSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7" />
            </div>

            <h3 className="font-extrabold text-slate-900 text-lg mb-1">
              เปิดโต๊ะ {justOpenedSession.tableNumber} สำเร็จ!
            </h3>
            {justOpenedSession.memberName && (
              <p className="text-xs text-amber-800 font-bold mb-2">
                👑 สมาชิก: คุณ{justOpenedSession.memberName} {justOpenedSession.memberNickname ? `(${justOpenedSession.memberNickname})` : ''}
              </p>
            )}
            <p className="text-xs text-slate-500 mb-4">
              ลูกค้าสามารถสแกน QR Code นี้เพื่อสั่งอาหารได้ทันที
            </p>

            {/* QR Code Container */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mx-auto mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={justOpenedSession.qrDataUrl}
                alt="Table QR Code"
                className="w-48 h-48 mx-auto rounded-xl shadow-sm"
              />
              <span className="block text-[11px] font-black text-slate-700 mt-2">
                {justOpenedSession.tableNumber} (Dynamic Session)
              </span>
            </div>

            <div className="space-y-2">
              <a
                href={justOpenedSession.qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow"
              >
                <span>เปิดดูหน้าจอลูกค้า (ทดสอบสั่งอาหาร)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handlePrintJustOpenedSlip}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ใบเปิดโต๊ะ (Slip 58mm/80mm)</span>
              </button>

              <button
                onClick={() => setJustOpenedSession(null)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW QR CODE FOR ACTIVE TABLE */}
      {viewQrModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-lg mb-1">
              QR Code สั่งอาหาร: {viewQrModalTarget.table_number}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              สแกนเพื่อสั่งอาหารร่วมกันในโต๊ะ (จะแยกเป็น โต๊ะ 1-A, โต๊ะ 1-B)
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mx-auto mb-4">
              {viewQrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewQrDataUrl}
                  alt="Table QR Code"
                  className="w-48 h-48 mx-auto rounded-xl shadow-sm"
                />
              )}
              <span className="block text-[11px] font-black text-slate-700 mt-2">
                {viewQrModalTarget.table_number} ({viewQrModalTarget.zone})
              </span>
            </div>

            <div className="space-y-2">
              <a
                href={`${window.location.origin}/order/${params.storeId}/${viewQrModalTarget.id}/${viewQrModalTarget.session?.qr_code_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow"
              >
                <span>เปิดดูหน้าจอลูกค้า (ทดสอบสั่งอาหาร)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handlePrintViewQrSlip}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ใบเปิดโต๊ะ (Slip 58mm/80mm)</span>
              </button>

              <button
                onClick={() => setViewQrModalTarget(null)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE TABLE SLIP */}
      {justOpenedSession && (
        <div className="printable-receipt hidden">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>{store?.name}</h2>
            <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0' }}>
              ใบเปิดโต๊ะ / TABLE SLIP
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', margin: '6px 0', border: '1px solid #000', padding: '4px 0' }}>
              {justOpenedSession.tableNumber}
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '12px 0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={justOpenedSession.qrDataUrl} alt="QR Slip" style={{ width: '150px', height: '150px', margin: '0 auto' }} />
            <p style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '6px' }}>สแกนเพื่อสั่งอาหารผ่านมือถือ</p>
          </div>

          <div style={{ fontSize: '10px', borderTop: '1px dashed #000', paddingTop: '6px' }}>
            <div>เวลาเปิด: {formatThaiTime(new Date().toISOString())}</div>
            {justOpenedSession.memberName && <div>สมาชิก: {justOpenedSession.memberName}</div>}
            <div style={{ marginTop: '4px', textAlign: 'center', fontSize: '9px' }}>
              QR Code นี้ใช้ได้เฉพาะรอบการทานนี้เท่านั้น
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
