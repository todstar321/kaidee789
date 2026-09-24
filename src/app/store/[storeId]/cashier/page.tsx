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
  AlertCircle
} from 'lucide-react';
import { Store, Table, OrderItem, BuffetTier } from '@/lib/types';
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
}

export default function CashierPage({ params }: { params: { storeId: string } }) {
  const searchParams = useSearchParams();
  const preselectedTableId = searchParams.get('table_id');

  const [store, setStore] = useState<Store | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Settlement Form State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay' | 'card'>('cash');
  const [cashReceived, setCashReceived] = useState<number | string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [applyVat, setApplyVat] = useState(false);
  const [applyServiceCharge, setApplyServiceCharge] = useState(false);

  // PromptPay QR preview
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('');

  // Invoice Completed Modal
  const [completedInvoice, setCompletedInvoice] = useState<CheckoutInvoiceResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTablesAndStore = async () => {
    try {
      const [resStore, resTables] = await Promise.all([
        fetch(`/api/stores/${params.storeId}`).then(r => r.json()),
        fetch(`/api/tables?store_id=${params.storeId}`).then(r => r.json()),
      ]);

      if (resStore.id) setStore(resStore);
      if (Array.isArray(resTables)) {
        setTables(resTables);
        // If there was a preselected table or first occupied table
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

  // When selectedTable or calculations change, update PromptPay QR if needed
  useEffect(() => {
    if (selectedTable?.session && store?.promptpay_number) {
      const currentGrand = calculateGrandTotal();
      // Generate simulated PromptPay QR payload
      const payload = `promptpay://${store.promptpay_number}?amount=${currentGrand}`;
      QRCode.toDataURL(payload, { width: 250, margin: 2 }).then(setPromptPayQrUrl).catch(console.error);
    }
  }, [selectedTable, discountAmount, applyVat, applyServiceCharge, store]);

  // Calculation helpers
  const calculateSubtotal = () => {
    if (!selectedTable?.session) return 0;
    return selectedTable.session.total_spend || 0;
  };

  const calculateVat = (subtotalAfterDiscount: number) => {
    return applyVat ? Math.round(subtotalAfterDiscount * 0.07) : 0;
  };

  const calculateServiceCharge = (subtotalAfterDiscount: number) => {
    return applyServiceCharge ? Math.round(subtotalAfterDiscount * 0.1) : 0;
  };

  const calculateGrandTotal = () => {
    const sub = calculateSubtotal();
    const afterDiscount = Math.max(0, sub - discountAmount);
    const vat = calculateVat(afterDiscount);
    const sc = calculateServiceCharge(afterDiscount);
    return afterDiscount + vat + sc;
  };

  const subtotal = calculateSubtotal();
  const grandTotal = calculateGrandTotal();
  const numCashReceived = Number(cashReceived || 0);
  const changeDue = paymentMethod === 'cash' ? Math.max(0, numCashReceived - grandTotal) : 0;

  // Checkout submission
  const handleConfirmCheckout = async () => {
    if (!selectedTable?.session || submitting) return;

    if (paymentMethod === 'cash' && numCashReceived < grandTotal) {
      alert(`ยอดเงินสดที่รับมา (฿${numCashReceived}) น้อยกว่ายอดที่ต้องชำระ (฿${grandTotal})`);
      return;
    }

    setSubmitting(true);
    try {
      const afterDiscount = Math.max(0, subtotal - discountAmount);
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
          vat_amount: calculateVat(afterDiscount),
          service_charge: calculateServiceCharge(afterDiscount),
          staff_name: 'แคชเชียร์',
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSound('cash');
        setCompletedInvoice(data);
        setSelectedTable(null);
        setCashReceived('');
        setDiscountAmount(0);
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

  const activeSeatedTables = tables.filter(t => t.status === 'occupied' || t.status === 'billing_requested');

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
            รับสัญญาณแจ้งเตือนเรียกเช็กบิล คิดเงินเงินสด/PromptPay และพิมพ์ใบเสร็จปิดโต๊ะ
          </p>
        </div>

        <button
          onClick={() => fetchTablesAndStore()}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition self-start sm:self-auto"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tables Awaiting Checkout (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-900 text-sm">โต๊ะที่กำลังรับประทาน ({activeSeatedTables.length})</h3>
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
                      setCashReceived('');
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                        : isBilling
                        ? 'border-red-300 bg-red-50/80 hover:bg-red-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{tbl.table_number}</span>
                        {isBilling && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse flex items-center gap-1">
                            <BellRing className="w-3 h-3" />
                            <span>เรียกเช็กบิล!</span>
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
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span>เปิดโต๊ะเมื่อ: {formatThaiTime(selectedTable.session?.opened_at)}</span>
                    <span>•</span>
                    <span>ลูกค้ารวม: {selectedTable.session?.guest_count} คน</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">ยอดรวมทั้งสิ้น</span>
                  <span className="text-2xl font-black text-orange-400">{formatMoney(grandTotal)}</span>
                </div>
              </div>

              {/* Bill Details & Order Items Breakdown */}
              <div className="p-5 space-y-4">
                {/* Buffet Details if buffet */}
                {selectedTable.session?.buffet_tier_name && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-amber-900 font-bold block">{selectedTable.session.buffet_tier_name}</strong>
                      <span className="text-amber-700">
                        {formatMoney(selectedTable.session.buffet_tier_price)} x {selectedTable.session.guest_count} ท่าน
                      </span>
                    </div>
                    <div className="font-black text-amber-900 text-sm">
                      {formatMoney((selectedTable.session.buffet_tier_price || 0) * (selectedTable.session.guest_count || 1))}
                    </div>
                  </div>
                )}

                {/* Items ordered list */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    รายการอาหารที่สั่งในโต๊ะ ({selectedTable.session?.items?.length || 0} รายการ)
                  </h4>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                    {selectedTable.session?.items?.map((item: any) => (
                      <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{item.item_name}</span>
                          <span className="text-orange-600 font-bold ml-1.5">x{item.quantity}</span>
                          <span className="text-slate-400 text-[11px] ml-2 font-medium">
                            (สั่งโดย {item.guest_label})
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">{formatMoney(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discounts, Taxes, Service Charge Adjustment */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-600">ยอดรวมค่าอาหาร (Subtotal):</span>
                    <span className="font-bold text-slate-900">{formatMoney(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-600">ส่วนลดพิเศษ (บาท):</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-24 px-2 py-1 text-right rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyVat}
                        onChange={(e) => setApplyVat(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-slate-700">คิดภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                    </label>
                    <span className="font-semibold text-slate-800">
                      {formatMoney(calculateVat(Math.max(0, subtotal - discountAmount)))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyServiceCharge}
                        onChange={(e) => setApplyServiceCharge(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-slate-700">ค่าบริการ (Service Charge 10%)</span>
                    </label>
                    <span className="font-semibold text-slate-800">
                      {formatMoney(calculateServiceCharge(Math.max(0, subtotal - discountAmount)))}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">เลือกวิธีรับชำระเงิน *</label>
                  <div className="grid grid-cols-3 gap-2">
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
                      <span>สแกน PromptPay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === 'card'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-purple-600" />
                      <span>บัตรเครดิต</span>
                    </button>
                  </div>
                </div>

                {/* Cash Payment Details */}
                {paymentMethod === 'cash' && (
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">รับเงินสดมา (บาท):</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-36 px-3 py-1.5 rounded-xl border border-slate-300 text-right font-extrabold text-lg text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    {/* Quick tender amount buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCashReceived(grandTotal)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        พอดี (฿{grandTotal})
                      </button>
                      {[100, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashReceived(amt)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
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

                {/* PromptPay QR Display */}
                {paymentMethod === 'promptpay' && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    {promptPayQrUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={promptPayQrUrl} alt="PromptPay QR" className="w-36 h-36 bg-white p-2 rounded-xl border border-blue-200 shadow-sm" />
                    )}
                    <div className="space-y-1">
                      <div className="font-bold text-blue-900 text-sm">สแกนชำระผ่าน PromptPay</div>
                      <div className="text-xs text-blue-800">
                        บัญชี: <strong>{store?.promptpay_name || store?.name}</strong>
                      </div>
                      <div className="text-xs text-blue-800">
                        หมายเลข: <strong>{store?.promptpay_number}</strong>
                      </div>
                      <div className="text-lg font-black text-orange-600 mt-1">
                        ยอดที่ต้องชำระ: {formatMoney(grandTotal)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Action Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">ยอดสุทธิ</span>
                  <span className="text-xl font-black text-slate-900">{formatMoney(grandTotal)}</span>
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
              <div className="flex justify-between">
                <span className="text-slate-500">ยอดสุทธิ:</span>
                <span className="font-black text-slate-900 text-sm">{formatMoney(completedInvoice.grand_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วิธีชำระ:</span>
                <span className="font-semibold text-blue-600 uppercase">{completedInvoice.payment_method}</span>
              </div>
              {completedInvoice.payment_method === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">เงินสดที่รับ:</span>
                    <span>{formatMoney(completedInvoice.cash_received)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">เงินทอน:</span>
                    <span className="font-bold text-emerald-600">{formatMoney(completedInvoice.change_given)}</span>
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
            <div style={{ fontSize: '12px', fontWeight: 'bold', margin: '6px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0' }}>
              ใบเสร็จรับเงิน / RECEIPT
            </div>
          </div>

          <div style={{ fontSize: '10px', marginBottom: '6px' }}>
            <div>โต๊ะ: {completedInvoice.table_number}</div>
            <div>เลขที่บิล: {completedInvoice.invoice_id}</div>
            <div>วันที่: {formatThaiDate(completedInvoice.paid_at)} {formatThaiTime(completedInvoice.paid_at)}</div>
          </div>

          <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '6px 0', fontSize: '11px' }}>
            {completedInvoice.buffet_details && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>{completedInvoice.buffet_details.name} x{completedInvoice.buffet_details.count}</span>
                <span>{formatMoney(completedInvoice.buffet_details.total)}</span>
              </div>
            )}
            {completedInvoice.items?.map((it) => (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>{it.item_name} x{it.quantity}</span>
                <span>{formatMoney(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ยอดรวม:</span>
              <span>{formatMoney(completedInvoice.subtotal)}</span>
            </div>
            {completedInvoice.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ส่วนลด:</span>
                <span>-{formatMoney(completedInvoice.discount_amount)}</span>
              </div>
            )}
            {completedInvoice.vat_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ภาษี VAT 7%:</span>
                <span>{formatMoney(completedInvoice.vat_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '4px' }}>
              <span>ยอดชำระสุทธิ:</span>
              <span>{formatMoney(completedInvoice.grand_total)}</span>
            </div>
            {completedInvoice.payment_method === 'cash' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
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

          <div style={{ borderTop: '1px dashed #000', marginTop: '8px', paddingTop: '6px', textAlign: 'center', fontSize: '9px' }}>
            ขอบคุณที่อุดหนุน โอกาสหน้าเชิญใหม่ครับ
          </div>
        </div>
      )}
    </div>
  );
}
