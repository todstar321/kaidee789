'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  Receipt,
  DollarSign,
  Printer,
  CheckCircle,
  CreditCard,
  QrCode,
  BellRing,
  Clock,
  Users,
  Search,
  RefreshCw,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Tag,
  Plus,
  Trash2,
  Settings,
  X,
  Building2,
  Wallet
} from 'lucide-react';
import { Store, Table, OrderItem, StoreDiscount, PaymentMethod } from '@/lib/types';
import { formatMoney, formatThaiTime, formatThaiDate } from '@/lib/utils';
import { playSound } from '@/lib/sound';

interface CheckoutInvoiceResult {
  invoice_id: string;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  service_charge: number;
  grand_total: number;
  cash_received: number;
  change_given: number;
  payment_method: string;
  paid_at: string;
  table_number: string;
  buffet_details?: { name: string; price: number; count: number; total: number } | null;
  items: OrderItem[];
  member_name?: string;
  discount_details?: string;
}

export default function CashierPage({ params }: { params: { storeId: string } }) {
  const searchParams = useSearchParams();
  const preselectedTableId = searchParams.get('table_id');

  const [store, setStore] = useState<Store | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Discounts state
  const [discounts, setDiscounts] = useState<StoreDiscount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('');
  const [customDiscount, setCustomDiscount] = useState<number | string>('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [newDiscountName, setNewDiscountName] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [newDiscountVal, setNewDiscountVal] = useState<number | string>('');

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPaymentName, setNewPaymentName] = useState('');

  // PromptPay Config Modal
  const [showPromptPayModal, setShowPromptPayModal] = useState(false);
  const [editPromptPayNumber, setEditPromptPayNumber] = useState('');
  const [editPromptPayName, setEditPromptPayName] = useState('');
  const [editPromptPayQrUrl, setEditPromptPayQrUrl] = useState('');
  const [savingPromptPay, setSavingPromptPay] = useState(false);

  // Settlement Form State
  const [cashReceived, setCashReceived] = useState<number | string>('');
  const [applyServiceCharge, setApplyServiceCharge] = useState(false);
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(10);
  const [applyVat, setApplyVat] = useState(false);
  const vatPercent = 7;

  // PromptPay QR preview
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');

  // Invoice Completed Modal
  const [completedInvoice, setCompletedInvoice] = useState<CheckoutInvoiceResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize service charge % from localStorage if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSc = localStorage.getItem('kaidee_sc_percent');
      if (savedSc !== null && !isNaN(Number(savedSc))) {
        setServiceChargePercent(Number(savedSc));
      }
      const savedApplySc = localStorage.getItem('kaidee_apply_sc');
      if (savedApplySc !== null) {
        setApplyServiceCharge(savedApplySc === 'true');
      }
      const savedApplyVat = localStorage.getItem('kaidee_apply_vat');
      if (savedApplyVat !== null) {
        setApplyVat(savedApplyVat === 'true');
      }
    }
  }, []);

  const handleScPercentChange = (val: number) => {
    setServiceChargePercent(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kaidee_sc_percent', val.toString());
    }
  };

  const handleToggleApplySc = (checked: boolean) => {
    setApplyServiceCharge(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kaidee_apply_sc', checked ? 'true' : 'false');
    }
  };

  const handleToggleApplyVat = (checked: boolean) => {
    setApplyVat(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kaidee_apply_vat', checked ? 'true' : 'false');
    }
  };

  // Fetch core data
  const fetchTablesAndStore = async () => {
    try {
      const [resStore, resTables, resDiscounts, resPayments] = await Promise.all([
        fetch(`/api/stores/${params.storeId}`).then((r) => r.json()),
        fetch(`/api/tables?store_id=${params.storeId}`).then((r) => r.json()),
        fetch(`/api/discounts?store_id=${params.storeId}`).then((r) => r.json()),
        fetch(`/api/payment-methods?store_id=${params.storeId}`).then((r) => r.json()),
      ]);

      if (resStore.id) {
        setStore(resStore);
        setEditPromptPayNumber(resStore.promptpay_number || '');
        setEditPromptPayName(resStore.promptpay_name || '');
        setEditPromptPayQrUrl(resStore.promptpay_qr_url || '');
        if (resStore.service_charge_percent !== undefined && resStore.service_charge_percent !== null) {
          if (!localStorage.getItem('kaidee_sc_percent')) {
            setServiceChargePercent(resStore.service_charge_percent);
          }
        }
      }

      if (Array.isArray(resDiscounts)) {
        setDiscounts(resDiscounts);
      }

      if (Array.isArray(resPayments)) {
        setPaymentMethods(resPayments);
      }

      if (Array.isArray(resTables)) {
        setTables(resTables);
        if (preselectedTableId) {
          const found = resTables.find((t: any) => t.id === preselectedTableId);
          if (found && found.session) setSelectedTable(found);
        } else if (!selectedTable) {
          const billingFirst = resTables.find((t: any) => t.status === 'billing_requested');
          const occupiedFirst = resTables.find((t: any) => t.status === 'occupied');
          setSelectedTable(billingFirst || occupiedFirst || null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTablesAndStore();
    const interval = setInterval(fetchTablesAndStore, 4000);
    return () => clearInterval(interval);
  }, [params.storeId]);

  // Calculations
  const calculateSubtotal = () => {
    if (!selectedTable?.session) return 0;
    return selectedTable.session.total_spend || 0;
  };

  const calculateDiscount = () => {
    const sub = calculateSubtotal();
    if (selectedDiscountId) {
      const disc = discounts.find((d) => d.id === selectedDiscountId);
      if (disc) {
        if (disc.type === 'percent') {
          return Math.round((sub * disc.value) / 100);
        } else {
          return Math.min(sub, disc.value);
        }
      }
    }
    const directVal = Number(customDiscount || 0);
    return Math.min(sub, Math.max(0, directVal));
  };

  const calculateSubtotalAfterDiscount = () => {
    const sub = calculateSubtotal();
    const disc = calculateDiscount();
    return Math.max(0, sub - disc);
  };

  const calculateServiceCharge = () => {
    if (!applyServiceCharge) return 0;
    const afterDisc = calculateSubtotalAfterDiscount();
    return Math.round((afterDisc * (serviceChargePercent || 0)) / 100);
  };

  const calculateVat = () => {
    if (!applyVat) return 0;
    const afterDisc = calculateSubtotalAfterDiscount();
    const sc = calculateServiceCharge();
    return Math.round((afterDisc + sc) * (vatPercent / 100));
  };

  const calculateGrandTotal = () => {
    const afterDisc = calculateSubtotalAfterDiscount();
    const sc = calculateServiceCharge();
    const vat = calculateVat();
    return Math.max(0, afterDisc + sc + vat);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = calculateDiscount();
  const subtotalAfterDiscount = calculateSubtotalAfterDiscount();
  const serviceChargeAmount = calculateServiceCharge();
  const vatAmount = calculateVat();
  const grandTotal = calculateGrandTotal();

  // Keep cashReceived defaulted to grandTotal if paymentMethod is cash
  useEffect(() => {
    if (paymentMethod === 'cash' && selectedTable) {
      setCashReceived(grandTotal);
    }
  }, [selectedTable?.id, grandTotal, paymentMethod]);

  const numCashReceived = Number(cashReceived || 0);
  const changeDue = paymentMethod === 'cash' ? Math.max(0, numCashReceived - grandTotal) : 0;

  // PromptPay QR generation
  useEffect(() => {
    if (selectedTable?.session && store?.promptpay_number && paymentMethod === 'promptpay') {
      if (store.promptpay_qr_url) {
        setPromptPayQrUrl(store.promptpay_qr_url);
      } else {
        const payload = `promptpay://${store.promptpay_number}?amount=${grandTotal}`;
        QRCode.toDataURL(payload, { width: 250, margin: 2 })
          .then(setPromptPayQrUrl)
          .catch(console.error);
      }
    }
  }, [selectedTable, grandTotal, paymentMethod, store]);

  // Discount rule operations
  const handleAddDiscount = async () => {
    if (!newDiscountName || !newDiscountVal) {
      alert('กรุณากรอกชื่อและมูลค่าส่วนลด');
      return;
    }
    try {
      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          name: newDiscountName,
          type: newDiscountType,
          value: Number(newDiscountVal),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDiscountName('');
        setNewDiscountVal('');
        fetchTablesAndStore();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm('ยืนยันลบรายการส่วนลดนี้?')) return;
    try {
      await fetch(`/api/discounts?id=${id}`, { method: 'DELETE' });
      if (selectedDiscountId === id) setSelectedDiscountId('');
      fetchTablesAndStore();
    } catch (e) {
      console.error(e);
    }
  };

  // Payment method operations
  const handleAddPaymentMethod = async () => {
    if (!newPaymentName) {
      alert('กรุณากรอกชื่อวิธีรับชำระเงิน');
      return;
    }
    try {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          name: newPaymentName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewPaymentName('');
        setShowPaymentModal(false);
        fetchTablesAndStore();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!confirm('ยืนยันลบวิธีรับชำระเงินนี้?')) return;
    try {
      await fetch(`/api/payment-methods?id=${id}`, { method: 'DELETE' });
      fetchTablesAndStore();
    } catch (e) {
      console.error(e);
    }
  };

  // Save PromptPay config
  const handleSavePromptPay = async () => {
    setSavingPromptPay(true);
    try {
      const res = await fetch(`/api/stores/${params.storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptpay_number: editPromptPayNumber,
          promptpay_name: editPromptPayName,
          promptpay_qr_url: editPromptPayQrUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPromptPayModal(false);
        fetchTablesAndStore();
      } else {
        alert('บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPromptPay(false);
    }
  };

  // Checkout submission
  const handleConfirmCheckout = async () => {
    if (!selectedTable?.session || submitting) return;

    if (paymentMethod === 'cash' && numCashReceived < grandTotal) {
      alert(`ยอดเงินสดที่รับมา (฿${numCashReceived}) น้อยกว่ายอดที่ต้องชำระ (฿${grandTotal})`);
      return;
    }

    setSubmitting(true);
    try {
      let discountDetails = '';
      if (selectedDiscountId) {
        const d = discounts.find((item) => item.id === selectedDiscountId);
        if (d) discountDetails = `${d.name} (${d.type === 'percent' ? `${d.value}%` : `฿${d.value}`})`;
      } else if (Number(customDiscount) > 0) {
        discountDetails = `ส่วนลดพิเศษ ฿${customDiscount}`;
      }

      const res = await fetch('/api/cashier/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          table_id: selectedTable.id,
          session_id: selectedTable.session.id,
          payment_method: paymentMethod,
          cash_received: paymentMethod === 'cash' ? numCashReceived : grandTotal,
          discount_amount: discountAmount,
          vat_amount: vatAmount,
          service_charge: serviceChargeAmount,
          staff_name: 'แคชเชียร์',
          member_id: selectedTable.session.member_id || null,
          member_name: selectedTable.session.member_name || null,
          discount_details: discountDetails,
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSound('cash');
        setCompletedInvoice(data);
        setSelectedTable(null);
        setCashReceived('');
        setSelectedDiscountId('');
        setCustomDiscount('');
        fetchTablesAndStore();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการคิดเงิน');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const activeSeatedTables = tables.filter(
    (t) => t.status === 'occupied' || t.status === 'billing_requested'
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <span>เคาน์เตอร์คิดเงิน & แคชเชียร์ POS (Cashier Settlement)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            รับแจ้งเตือนเช็กบิล รองรับสูตรส่วนลดพิเศษ ลำดับคิดค่าบริการ + VAT 7% เงินสด PromptPay และวิธีชำระอื่นๆ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPromptPayModal(true)}
            className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>ตั้งค่า PromptPay</span>
          </button>
          <button
            onClick={() => fetchTablesAndStore()}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tables Awaiting Checkout (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-900 text-sm">
              โต๊ะที่กำลังรับประทาน ({activeSeatedTables.length})
            </h3>
            <span className="text-[11px] text-slate-500">คลิกเพื่อเปิดบิล</span>
          </div>

          {activeSeatedTables.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
              ขณะนี้ไม่มีโต๊ะที่นั่งทานอยู่ในร้าน
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeSeatedTables.map((tbl) => {
                const isSelected = selectedTable?.id === tbl.id;
                const isBilling = tbl.status === 'billing_requested';

                return (
                  <button
                    key={tbl.id}
                    onClick={() => {
                      setSelectedTable(tbl);
                      setSelectedDiscountId('');
                      setCustomDiscount('');
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                        : isBilling || tbl.service_call === 'call_bill'
                        ? 'border-red-400 bg-red-50/90 hover:bg-red-100 animate-pulse'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{tbl.table_number}</span>
                        {isBilling && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center gap-1">
                            <BellRing className="w-3 h-3" />
                            <span>เรียกเช็กบิล!</span>
                          </span>
                        )}
                        {tbl.session?.member_name && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-semibold">
                            👑 {tbl.session.member_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        นั่งแล้ว {tbl.session?.elapsed_minutes} นาที | {tbl.session?.items_count || 0} จาน
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-slate-900 text-base">
                        {formatMoney(tbl.session?.total_spend)}
                      </div>
                      <span className="text-[11px] text-blue-600 font-semibold">เลือกคิดเงิน →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Bill Breakdown & Checkout Panel (8 cols) */}
        <div className="lg:col-span-8">
          {!selectedTable ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">เลือกโต๊ะจากรายการด้านซ้ายเพื่อเปิดบิลคิดเงิน</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              {/* Bill Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-xl text-white">
                      ใบเสร็จคิดเงิน: {selectedTable.table_number} ({selectedTable.zone})
                    </h3>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span>เปิดโต๊ะเมื่อ: {formatThaiTime(selectedTable.session?.opened_at)}</span>
                    <span>•</span>
                    <span>ลูกค้ารวม: {selectedTable.session?.guest_count} คน</span>
                    {selectedTable.session?.member_name && (
                      <>
                        <span>•</span>
                        <span className="text-amber-300 font-bold">
                          👑 สมาชิก: {selectedTable.session.member_name} (
                          {selectedTable.session.member_phone || 'ไม่มีเบอร์'})
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">ยอดสุทธิที่ต้องชำระ</span>
                  <span className="text-2xl font-black text-orange-400">{formatMoney(grandTotal)}</span>
                </div>
              </div>

              {/* Bill Details & Order Items Breakdown */}
              <div className="p-5 space-y-5">
                {/* Buffet Details if buffet */}
                {selectedTable.session?.buffet_tier_name && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-amber-900 font-bold block">
                        {selectedTable.session.buffet_tier_name}
                      </strong>
                      <span className="text-amber-700">
                        {formatMoney(selectedTable.session.buffet_tier_price)} x {selectedTable.session.guest_count} ท่าน
                      </span>
                    </div>
                    <div className="font-black text-amber-900 text-sm">
                      {formatMoney(
                        (selectedTable.session.buffet_tier_price || 0) * (selectedTable.session.guest_count || 1)
                      )}
                    </div>
                  </div>
                )}

                {/* Items ordered list */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    รายการอาหารที่สั่ง ({selectedTable.session?.items?.length || 0} รายการ)
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                    {selectedTable.session?.items?.map((item: any) => (
                      <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{item.item_name}</span>
                          <span className="text-orange-600 font-bold ml-1.5">x{item.quantity}</span>
                          <span className="text-slate-400 text-[11px] ml-2 font-medium">
                            (สั่งโดย {item.guest_label})
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {formatMoney(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 4: CUSTOM DISCOUNTS SELECTOR & MANAGEMENT */}
                <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-orange-600" />
                      <span>เลือกส่วนลดพิเศษ (Discount Presets)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDiscountModal(true)}
                      className="text-[11px] font-bold text-orange-700 hover:text-orange-800 underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>จัดการสูตรส่วนลด</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {discounts.map((d) => {
                      const isSelected = selectedDiscountId === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDiscountId('');
                            } else {
                              setSelectedDiscountId(d.id);
                              setCustomDiscount('');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            isSelected
                              ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-500/20'
                              : 'bg-white border border-orange-200 text-orange-900 hover:bg-orange-100/60'
                          }`}
                        >
                          <span>{d.name}</span>
                          <span className="opacity-80">({d.type === 'percent' ? `${d.value}%` : `฿${d.value}`})</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-orange-200/60 text-xs">
                    <span className="text-slate-600">หรือระบุส่วนลดเอง (บาท):</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0.00"
                      value={customDiscount}
                      onChange={(e) => {
                        setCustomDiscount(e.target.value);
                        setSelectedDiscountId('');
                      }}
                      className="w-28 px-2 py-1 text-right rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-orange-500 bg-white"
                    />
                    {discountAmount > 0 && (
                      <span className="text-orange-700 font-bold ml-auto">
                        หักลด -{formatMoney(discountAmount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* SECTION 5: REORDERED CALCULATIONS (Subtotal -> Discount -> Service Charge -> VAT -> Grand Total) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                  {/* 1. Subtotal */}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">1. รวมค่าอาหาร (Subtotal):</span>
                    <span className="font-bold text-slate-900">{formatMoney(subtotal)}</span>
                  </div>

                  {/* 2. Less Discount */}
                  <div className="flex items-center justify-between text-orange-600">
                    <span className="font-semibold">2. หักส่วนลดพิเศษ (Discount):</span>
                    <span className="font-bold">-{formatMoney(discountAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 text-[11px] pl-2 border-l-2 border-slate-200">
                    <span>ยอดหลังหักส่วนลด:</span>
                    <span className="font-semibold text-slate-700">{formatMoney(subtotalAfterDiscount)}</span>
                  </div>

                  {/* 3. Service Charge (Can specify % & remembers value) */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="chk_sc"
                        checked={applyServiceCharge}
                        onChange={(e) => handleToggleApplySc(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="chk_sc" className="font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
                        <span>3. คิดค่าบริการ (Service Charge):</span>
                      </label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={serviceChargePercent}
                          onChange={(e) => handleScPercentChange(Number(e.target.value))}
                          className="w-12 px-1 py-0.5 text-center text-xs font-bold rounded border border-slate-300 bg-white"
                        />
                        <span className="ml-1 text-slate-600 font-bold">%</span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">
                      +{formatMoney(serviceChargeAmount)}
                    </span>
                  </div>

                  {/* 4. VAT (7%) */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyVat}
                        onChange={(e) => handleToggleApplyVat(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4"
                      />
                      <span className="font-semibold text-slate-700">4. คิดภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                    </label>
                    <span className="font-bold text-slate-900">
                      +{formatMoney(vatAmount)}
                    </span>
                  </div>

                  {/* 5. Grand Total */}
                  <div className="flex items-center justify-between pt-2 border-t-2 border-slate-300">
                    <span className="font-extrabold text-sm text-slate-900">5. ยอดชำระสุทธิ (Grand Total):</span>
                    <span className="font-black text-xl text-blue-700">{formatMoney(grandTotal)}</span>
                  </div>
                </div>

                {/* SECTION 6: PAYMENT METHODS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-blue-600" />
                      <span>เลือกวิธีรับชำระเงิน *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>เพิ่มวิธีชำระ</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === 'cash'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      <span>เงินสด (Cash)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('promptpay')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === 'promptpay'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <QrCode className="w-5 h-5 text-blue-600" />
                      <span>PromptPay</span>
                    </button>

                    {paymentMethods
                      .filter((pm) => pm.code !== 'cash' && pm.code !== 'promptpay')
                      .map((pm) => {
                        const isSelected = paymentMethod === pm.code;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.code)}
                            className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition relative group ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <CreditCard className="w-5 h-5 text-purple-600" />
                            <span>{pm.name}</span>
                            {!pm.is_system && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePaymentMethod(pm.id);
                                }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow"
                                title="ลบวิธีนี้"
                              >
                                ×
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Cash Payment Details (Defaults to exact grand total) */}
                {paymentMethod === 'cash' && (
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block">รับเงินสดมา (บาท):</label>
                        <span className="text-[10px] text-emerald-700">ขึ้นค่ายอดสุทธิให้อัตโนมัติ (แก้ไขได้)</span>
                      </div>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-36 px-3 py-1.5 rounded-xl border border-slate-300 text-right font-extrabold text-lg text-slate-900 focus:outline-none focus:border-emerald-600 bg-white"
                      />
                    </div>

                    {/* Quick tender amount buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCashReceived(grandTotal)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-extrabold shadow-sm hover:bg-emerald-700"
                      >
                        พอดี (฿{grandTotal})
                      </button>
                      {[100, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashReceived(amt)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          ฿{amt}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                      <span className="text-xs font-bold text-slate-700">เงินทอนลูกค้า:</span>
                      <span className="text-xl font-black text-emerald-700">{formatMoney(changeDue)}</span>
                    </div>
                  </div>
                )}

                {/* PromptPay QR Display & Configuration Link */}
                {paymentMethod === 'promptpay' && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    {promptPayQrUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={promptPayQrUrl}
                        alt="PromptPay QR"
                        className="w-36 h-36 bg-white p-2 rounded-xl border border-blue-200 shadow-sm object-contain"
                      />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 text-sm">สแกนชำระผ่าน PromptPay</span>
                        <button
                          type="button"
                          onClick={() => setShowPromptPayModal(true)}
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Settings className="w-3 h-3" />
                          <span>แก้ไขข้อมูล/รูป QR</span>
                        </button>
                      </div>
                      <div className="text-xs text-blue-800">
                        บัญชี: <strong>{store?.promptpay_name || store?.name}</strong>
                      </div>
                      <div className="text-xs text-blue-800">
                        หมายเลข: <strong>{store?.promptpay_number || 'ยังไม่ได้ระบุ'}</strong>
                      </div>
                      <div className="text-lg font-black text-orange-600 pt-1">
                        ยอดที่ต้องชำระ: {formatMoney(grandTotal)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Action Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">ยอดสุทธิปิดโต๊ะ</span>
                  <span className="text-2xl font-black text-slate-900">{formatMoney(grandTotal)}</span>
                </div>

                <button
                  disabled={submitting}
                  onClick={handleConfirmCheckout}
                  className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{submitting ? 'กำลังบันทึกบิล...' : 'ยืนยันชำระเงิน & ปิดโต๊ะ'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: MANAGE DISCOUNT RULES */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-600" />
                <span>จัดการสูตรส่วนลดพิเศษ (Discount Presets)</span>
              </h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing discounts list */}
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {discounts.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-3">ยังไม่มีสูตรส่วนลดที่ตั้งไว้</div>
              ) : (
                discounts.map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{d.name}</span>
                      <span className="ml-2 text-orange-600 font-semibold">
                        ({d.type === 'percent' ? `${d.value}%` : `฿${d.value}`})
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteDiscount(d.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="ลบส่วนลดนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new discount form */}
            <div className="p-3 bg-orange-50/70 rounded-2xl border border-orange-200 space-y-3">
              <span className="text-xs font-bold text-orange-950 block">+ เพิ่มสูตรส่วนลดใหม่</span>
              <input
                type="text"
                placeholder="ชื่อส่วนลด (เช่น วันแม่, สมาชิก VIP)"
                value={newDiscountName}
                onChange={(e) => setNewDiscountName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newDiscountType}
                  onChange={(e) => setNewDiscountType(e.target.value as any)}
                  className="px-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="percent">เป็นเปอร์เซ็นต์ (%)</option>
                  <option value="fixed">เป็นจำนวนเงิน (บาท)</option>
                </select>
                <input
                  type="number"
                  placeholder="มูลค่า (เช่น 10 หรือ 50)"
                  value={newDiscountVal}
                  onChange={(e) => setNewDiscountVal(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                />
              </div>
              <button
                type="button"
                onClick={handleAddDiscount}
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow"
              >
                บันทึกสูตรส่วนลด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE PAYMENT METHODS */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                <span>เพิ่มวิธีรับชำระเงินใหม่</span>
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ชื่อวิธีรับชำระเงิน (เช่น คนละครึ่ง, บัตรกำนัล, ShopeePay)
                </label>
                <input
                  type="text"
                  placeholder="ระบุชื่อวิธีรับชำระ"
                  value={newPaymentName}
                  onChange={(e) => setNewPaymentName(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <button
                type="button"
                onClick={handleAddPaymentMethod}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow"
              >
                เพิ่มวิธีรับชำระเงิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROMPTPAY SETTINGS */}
      {showPromptPayModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                <span>ตั้งค่า PromptPay & QR Code ของร้าน</span>
              </h3>
              <button
                onClick={() => setShowPromptPayModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  หมายเลข PromptPay (เบอร์มือถือ หรือ เลขผู้เสียภาษี)
                </label>
                <input
                  type="text"
                  placeholder="08X-XXX-XXXX หรือ 010XXXXXXXXXX"
                  value={editPromptPayNumber}
                  onChange={(e) => setEditPromptPayNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ชื่อบัญชี PromptPay (แสดงให้ลูกค้าตรวจสอบ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น บจก. ร้านขายดี 789"
                  value={editPromptPayName}
                  onChange={(e) => setEditPromptPayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  URL รูปภาพ QR Code ป้ายหน้าร้าน (ถ้ามี หรือเว้นว่างให้ระบบสร้างอัตโนมัติ)
                </label>
                <input
                  type="text"
                  placeholder="https://... รูปภาพ QR Code ของธนาคาร"
                  value={editPromptPayQrUrl}
                  onChange={(e) => setEditPromptPayQrUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromptPayModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={savingPromptPay}
                  onClick={handleSavePromptPay}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow"
                >
                  {savingPromptPay ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED INVOICE & RECEIPT MODAL */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7" />
            </div>

            <h3 className="font-extrabold text-slate-900 text-lg mb-1">
              ชำระเงิน {completedInvoice.table_number} สำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              โต๊ะถูกปรับสถานะเป็นว่าง และ QR Code เดิมถูกยกเลิกเรียบร้อยแล้ว
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-left mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">เลขที่ใบเสร็จ:</span>
                <span className="font-bold text-slate-800">{completedInvoice.invoice_id}</span>
              </div>
              {completedInvoice.member_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">สมาชิก:</span>
                  <span className="font-bold text-amber-800">{completedInvoice.member_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">ยอดสุทธิ:</span>
                <span className="font-black text-slate-900 text-sm">
                  {formatMoney(completedInvoice.grand_total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วิธีชำระ:</span>
                <span className="font-semibold text-blue-600 uppercase">
                  {completedInvoice.payment_method}
                </span>
              </div>
              {completedInvoice.payment_method === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">เงินสดที่รับ:</span>
                    <span>{formatMoney(completedInvoice.cash_received)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">เงินทอน:</span>
                    <span className="font-bold text-emerald-600">
                      {formatMoney(completedInvoice.change_given)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ใบเสร็จรับเงิน (Thermal 58mm/80mm)</span>
              </button>

              <button
                onClick={() => setCompletedInvoice(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                ปิดหน้าต่าง / รับลูกค้ารายถัดไป
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE RECEIPT */}
      {completedInvoice && (
        <div className="printable-receipt hidden">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>{store?.name}</h2>
            <p style={{ fontSize: '10px', margin: '2px 0' }}>{store?.address}</p>
            <p style={{ fontSize: '10px', margin: '2px 0' }}>โทร: {store?.phone}</p>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                margin: '6px 0',
                borderTop: '1px dashed #000',
                borderBottom: '1px dashed #000',
                padding: '4px 0',
              }}
            >
              ใบเสร็จรับเงิน / RECEIPT
            </div>
          </div>

          <div style={{ fontSize: '10px', marginBottom: '6px' }}>
            <div>โต๊ะ: {completedInvoice.table_number}</div>
            <div>เลขที่บิล: {completedInvoice.invoice_id}</div>
            <div>
              วันที่: {formatThaiDate(completedInvoice.paid_at)} {formatThaiTime(completedInvoice.paid_at)}
            </div>
            {completedInvoice.member_name && <div>สมาชิก: {completedInvoice.member_name}</div>}
          </div>

          <div
            style={{
              borderTop: '1px dashed #000',
              borderBottom: '1px dashed #000',
              padding: '6px 0',
              margin: '6px 0',
              fontSize: '11px',
            }}
          >
            {completedInvoice.buffet_details && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>
                  {completedInvoice.buffet_details.name} x{completedInvoice.buffet_details.count}
                </span>
                <span>{formatMoney(completedInvoice.buffet_details.total)}</span>
              </div>
            )}
            {completedInvoice.items?.map((it) => (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>
                  {it.item_name} x{it.quantity}
                </span>
                <span>{formatMoney(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>1. ยอดรวมอาหาร:</span>
              <span>{formatMoney(completedInvoice.subtotal)}</span>
            </div>
            {completedInvoice.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>2. ส่วนลดพิเศษ {completedInvoice.discount_details ? `(${completedInvoice.discount_details})` : ''}:</span>
                <span>-{formatMoney(completedInvoice.discount_amount)}</span>
              </div>
            )}
            {completedInvoice.service_charge > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>3. ค่าบริการ:</span>
                <span>+{formatMoney(completedInvoice.service_charge)}</span>
              </div>
            )}
            {completedInvoice.vat_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>4. ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                <span>+{formatMoney(completedInvoice.vat_amount)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: '13px',
                borderTop: '1px solid #000',
                paddingTop: '4px',
                marginTop: '4px',
              }}
            >
              <span>5. ยอดชำระสุทธิ:</span>
              <span>{formatMoney(completedInvoice.grand_total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
              <span>วิธีชำระเงิน:</span>
              <span style={{ fontWeight: 'bold' }}>{completedInvoice.payment_method}</span>
            </div>
            {completedInvoice.payment_method === 'cash' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span>รับเงินสด:</span>
                  <span>{formatMoney(completedInvoice.cash_received)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>เงินทอน:</span>
                  <span>{formatMoney(completedInvoice.change_given)}</span>
                </div>
              </>
            )}
          </div>

          <div
            style={{
              borderTop: '1px dashed #000',
              marginTop: '8px',
              paddingTop: '6px',
              textAlign: 'center',
              fontSize: '9px',
            }}
          >
            ขอบคุณที่อุดหนุน โอกาสหน้าเชิญใหม่ครับ
          </div>
        </div>
      )}
    </div>
  );
}
