'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  CreditCard,
  UploadCloud,
  CheckCircle,
  Clock,
  AlertTriangle,
  Store as StoreIcon,
  ShieldCheck,
  Lock,
  Receipt,
  Sparkles,
  Phone,
  FileText
} from 'lucide-react';
import { Store, SubscriptionPayment } from '@/lib/types';
import { formatMoney, formatThaiDate } from '@/lib/utils';

export default function StoreSettingsPage({ params }: { params: { storeId: string } }) {
  const [store, setStore] = useState<Store | null>(null);
  const [slips, setSlips] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Store Edit Form
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    promptpay_number: '',
    promptpay_name: '',
    type: 'alacarte',
    buffet_duration_mins: 120,
  });

  // Slip Payment Modal
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipForm, setSlipForm] = useState({
    plan_id: 'pro',
    billing_cycle: 'monthly',
    amount: 590,
    slip_url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&h=800&fit=crop',
  });
  const [slipSubmitting, setSlipSubmitting] = useState(false);
  const [slipMessage, setSlipMessage] = useState<string | null>(null);

  const fetchStoreData = async () => {
    try {
      const [resStore, resSlips] = await Promise.all([
        fetch(`/api/stores/${params.storeId}`).then(r => r.json()),
        fetch(`/api/subscription?store_id=${params.storeId}`).then(r => r.json()),
      ]);

      if (resStore.id) {
        setStore(resStore);
        setForm({
          name: resStore.name || '',
          phone: resStore.phone || '',
          address: resStore.address || '',
          promptpay_number: resStore.promptpay_number || '',
          promptpay_name: resStore.promptpay_name || '',
          type: resStore.type || 'alacarte',
          buffet_duration_mins: resStore.buffet_duration_mins || 120,
        });
      }
      if (Array.isArray(resSlips)) setSlips(resSlips);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [params.storeId]);

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/stores/${params.storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchStoreData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlanSelectionChange = (cycle: string) => {
    if (cycle === 'yearly') {
      setSlipForm({ ...slipForm, billing_cycle: 'yearly', amount: 5900 });
    } else if (cycle === 'lifetime') {
      setSlipForm({ ...slipForm, plan_id: 'enterprise', billing_cycle: 'lifetime', amount: 19900 });
    } else {
      setSlipForm({ ...slipForm, plan_id: 'pro', billing_cycle: 'monthly', amount: 590 });
    }
  };

  const handleSubmitSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlipSubmitting(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          ...slipForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSlipModal(false);
        setSlipMessage(data.message);
        fetchStoreData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSlipSubmitting(false);
    }
  };

  if (loading || !store) {
    return <div className="p-16 text-center text-slate-400">กำลังโหลดการตั้งค่า...</div>;
  }

  // Calculate remaining days
  const expiresAt = new Date(store.plan_expires_at);
  const now = new Date();
  const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isNearExpiry = diffDays <= 7;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600" />
            <span>ตั้งค่าร้านค้า & สถานะแพ็กเกจ (Settings & Subscription)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดการข้อมูลร้านค้า เบอร์ PromptPay รับเงิน และแนบสลิปชำระเงินต่ออายุการใช้งาน
          </p>
        </div>
      </div>

      {/* Subscription Status Card & Billing Reminder */}
      <div className={`p-6 rounded-2xl border shadow-sm ${
        isNearExpiry
          ? 'bg-amber-50/70 border-amber-300'
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">สถานะการเป็นสมาชิก SaaS</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                {store.plan_id} ({store.plan_billing_type})
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              วันหมดอายุแพ็กเกจ: {formatThaiDate(store.plan_expires_at)}
            </h3>

            <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>
                {diffDays > 0 ? (
                  <>เหลือระยะเวลาใช้งานอีก <strong className="text-orange-600 font-bold">{diffDays} วัน</strong></>
                ) : (
                  <strong className="text-red-600 font-bold">หมดอายุแล้ว กรุณาชำระเงินต่ออายุ</strong>
                )}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowSlipModal(true)}
            className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition transform hover:-translate-y-0.5 flex-shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>ชำระเงิน & แนบสลิปโอนเงิน</span>
          </button>
        </div>

        {slipMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{slipMessage}</span>
          </div>
        )}
      </div>

      {/* Store Profile Settings Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
          <StoreIcon className="w-5 h-5 text-orange-500" />
          <span>ข้อมูลร้านค้า & บัญชีรับเงินลูกค้า</span>
        </h3>

        {saveSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-semibold">
            ✓ บันทึกการตั้งค่าร้านค้าเรียบร้อยแล้ว
          </div>
        )}

        <form onSubmit={handleUpdateStore} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">ชื่อร้านอาหาร *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">รูปแบบร้านค้า *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
              >
                <option value="alacarte">อาหารตามสั่ง (A La Carte)</option>
                <option value="buffet">บุฟเฟ่ต์จับเวลา (Buffet Tiers)</option>
              </select>
            </div>

            {form.type === 'buffet' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">เวลาจำกัดการทานบุฟเฟ่ต์ (นาที)</label>
                <input
                  type="number"
                  value={form.buffet_duration_mins}
                  onChange={(e) => setForm({ ...form, buffet_duration_mins: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">หมายเลข PromptPay (เบอร์โทร/เลขประจำตัวผู้เสียภาษี) *</label>
              <input
                type="text"
                placeholder="08XXXXXXXX หรือ 13 หลัก"
                value={form.promptpay_number}
                onChange={(e) => setForm({ ...form, promptpay_number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-slate-400">ระบบจะนำไปสร้าง QR Code บนหน้าจอแคชเชียร์ให้ลูกค้าสแกนจ่ายเงิน</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อบัญชี PromptPay</label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล หรือชื่อนิติบุคคล"
                value={form.promptpay_name}
                onChange={(e) => setForm({ ...form, promptpay_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อร้าน</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ที่อยู่ร้านอาหาร</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </form>
      </div>

      {/* Slip History Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          <span>ประวัติการแนบสลิปชำระเงินต่ออายุ ({slips.length} รายการ)</span>
        </h3>

        {slips.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">ยังไม่มีประวัติการส่งสลิป</div>
        ) : (
          <div className="space-y-2">
            {slips.map((sl) => (
              <div key={sl.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 uppercase">{sl.plan_id} ({sl.billing_cycle})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sl.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sl.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sl.status === 'approved' ? '✓ อนุมัติแล้ว' : sl.status === 'pending' ? 'รอตรวจสอบ' : '✕ ปฏิเสธ'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    ยอดเงิน: {formatMoney(sl.amount)} | วันที่ส่ง: {formatThaiDate(sl.created_at)}
                  </div>
                  {sl.reviewer_notes && (
                    <div className="text-[11px] text-blue-600 mt-0.5">ข้อความจากแอดมิน: {sl.reviewer_notes}</div>
                  )}
                </div>

                <a
                  href={sl.slip_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-[11px] hover:bg-slate-100"
                >
                  ดูรูปสลิป
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: SUBMIT SLIP PAYMENT */}
      {showSlipModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" />
                <span>ชำระเงินค่าบริการ & แนบสลิป</span>
              </h3>
              <button onClick={() => setShowSlipModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Platform Owner Transfer Info */}
            <div className="p-4 bg-orange-50/80 rounded-2xl border border-orange-200/80 text-xs space-y-1.5 mb-4">
              <div className="font-bold text-orange-950 text-sm">โอนเงินเข้าบัญชีเจ้าของระบบ:</div>
              <div className="text-slate-700">ธนาคารกสิกรไทย (KBANK)</div>
              <div className="text-slate-900 font-extrabold text-sm">PromptPay: 089-123-4567</div>
              <div className="text-slate-600">ชื่อบัญชี: คุณธนภัทร (เจ้าของแพลตฟอร์ม)</div>
            </div>

            <form onSubmit={handleSubmitSlip} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">เลือกรูปแบบการชำระเงิน *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlanSelectionChange('monthly')}
                    className={`p-2.5 rounded-xl border font-bold text-center transition ${
                      slipForm.billing_cycle === 'monthly'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>รายเดือน</div>
                    <div className="text-sm font-extrabold text-orange-600 mt-1">฿590</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanSelectionChange('yearly')}
                    className={`p-2.5 rounded-xl border font-bold text-center transition ${
                      slipForm.billing_cycle === 'yearly'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>รายปี (คุ้มสุด)</div>
                    <div className="text-sm font-extrabold text-orange-600 mt-1">฿5,900</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanSelectionChange('lifetime')}
                    className={`p-2.5 rounded-xl border font-bold text-center transition ${
                      slipForm.billing_cycle === 'lifetime'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>ซื้อขาดตลอดชีพ</div>
                    <div className="text-sm font-extrabold text-orange-600 mt-1">฿19,900</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL รูปภาพสลิปการโอนเงิน *</label>
                <input
                  type="text"
                  required
                  placeholder="https://... หรือแนบสลิป"
                  value={slipForm.slip_url}
                  onChange={(e) => setSlipForm({ ...slipForm, slip_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Slip Preview Thumbnail */}
              {slipForm.slip_url && (
                <div className="p-2 bg-slate-100 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block mb-1">ตัวอย่างสลิปที่จะส่งให้แอดมิน:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipForm.slip_url} alt="สลิป" className="max-h-40 mx-auto rounded-lg object-contain shadow-sm" />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSlipModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={slipSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-lg shadow-orange-600/30 disabled:opacity-50"
                >
                  {slipSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งสลิปให้แอดมินตรวจสอบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
