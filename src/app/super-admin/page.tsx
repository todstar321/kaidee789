'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Store as StoreIcon,
  Copy,
  Plus,
  Trash2,
  ExternalLink,
  Receipt,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  DollarSign
} from 'lucide-react';
import { Store, SubscriptionPayment, SuperAdmin } from '@/lib/types';
import { formatMoney, formatThaiDate } from '@/lib/utils';

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<'stores' | 'slips' | 'assistants' | 'plans'>('stores');
  const [stores, setStores] = useState<Store[]>([]);
  const [slips, setSlips] = useState<SubscriptionPayment[]>([]);
  const [assistants, setAssistants] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [selectedStoreForClone, setSelectedStoreForClone] = useState<Store | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<SubscriptionPayment | null>(null);
  const [showAddAssistantModal, setShowAddAssistantModal] = useState(false);

  // Form states
  const [newStoreData, setNewStoreData] = useState({
    name: '',
    type: 'alacarte',
    phone: '',
    address: '',
    promptpay_number: '',
    plan_id: 'pro',
    plan_billing_type: 'monthly',
    buffet_duration_mins: 120,
  });

  const [cloneData, setCloneData] = useState({
    new_name: '',
    plan_id: 'pro',
    plan_billing_type: 'monthly',
  });

  const [assistantData, setAssistantData] = useState({
    username: '',
    password: '',
    name: '',
    permissions: ['manage_stores', 'verify_slips', 'impersonate'],
  });

  const [reviewNotes, setReviewNotes] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStores, resSlips, resAssistants] = await Promise.all([
        fetch('/api/stores').then(r => r.json()),
        fetch('/api/subscription').then(r => r.json()),
        fetch('/api/super-admin/assistants').then(r => r.json()),
      ]);
      if (Array.isArray(resStores)) setStores(resStores);
      if (Array.isArray(resSlips)) setSlips(resSlips);
      if (Array.isArray(resAssistants)) setAssistants(resAssistants);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreData.name) return;

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStoreData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddStoreModal(false);
        setActionMessage(`สร้างร้านค้า "${newStoreData.name}" สำเร็จเรียบร้อย!`);
        setNewStoreData({
          name: '',
          type: 'alacarte',
          phone: '',
          address: '',
          promptpay_number: '',
          plan_id: 'pro',
          plan_billing_type: 'monthly',
          buffet_duration_mins: 120,
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloneStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreForClone || !cloneData.new_name) return;

    try {
      const res = await fetch(`/api/stores/${selectedStoreForClone.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloneData),
      });
      const data = await res.json();
      if (data.success) {
        setShowCloneModal(false);
        setActionMessage(data.message || 'โคลนร้านค้าสำเร็จเรียบร้อย!');
        setCloneData({ new_name: '', plan_id: 'pro', plan_billing_type: 'monthly' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStore = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบร้าน "${name}" ใช่หรือไม่? ข้อมูลทั้งหมดของร้านจะถูกลบ`)) return;
    try {
      await fetch(`/api/stores/${id}`, { method: 'DELETE' });
      setActionMessage(`ลบร้านค้า "${name}" สำเร็จ`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSlip = async (action: 'approve' | 'reject') => {
    if (!selectedSlip) return;
    try {
      const res = await fetch('/api/subscription/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slip_id: selectedSlip.id,
          action,
          reviewer_notes: reviewNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSlip(null);
        setReviewNotes('');
        setActionMessage(data.message);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-admin/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assistantData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddAssistantModal(false);
        setActionMessage('เพิ่มผู้ช่วยแอดมินเรียบร้อยแล้ว');
        setAssistantData({ username: '', password: '', name: '', permissions: ['manage_stores', 'verify_slips', 'impersonate'] });
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAssistant = async (id: string) => {
    if (!confirm('ต้องการลบผู้ช่วยแอดมินคนนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/super-admin/assistants?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingSlipsCount = slips.filter(s => s.status === 'pending').length;

  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Header */}
      <header className="bg-slate-800/90 backdrop-blur border-b border-slate-700/80 sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-300 transition"
              title="กลับหน้าหลัก"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-orange-500/20 text-orange-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-lg sm:text-xl font-bold text-white">Super Admin Portal</h1>
              </div>
              <p className="text-xs text-slate-400">ระบบบริหารร้านอาหาร SaaS & การชำระเงินแพลตฟอร์ม</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
              ● เข้าใช้งานในฐานะ: เจ้าของแพลตฟอร์ม
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {actionMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs text-slate-400 hover:text-white">✕ ปิด</button>
          </div>
        )}

        {/* Platform Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/70">
            <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
              <span>ร้านค้าทั้งหมด</span>
              <StoreIcon className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stores.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">พร้อมระบบเปิดร้านทันที</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/70">
            <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
              <span>สลิปรอตรวจสอบ</span>
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{pendingSlipsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">ร้านแนบสลิปต่ออายุ</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/70">
            <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
              <span>แอดมินและผู้ช่วย</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{assistants.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">ช่วยดูแลระบบร้านค้า</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/70">
            <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
              <span>สถานะแพลตฟอร์ม</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">100%</div>
            <div className="text-[11px] text-slate-400 mt-1">พร้อมให้บริการทุกสาขา</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700 mb-6 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('stores')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'stores'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <StoreIcon className="w-4 h-4" />
            <span>จัดการร้านค้า ({stores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('slips')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition whitespace-nowrap relative ${
              activeTab === 'slips'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>ตรวจสอบสลิปโอนเงิน</span>
            {pendingSlipsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {pendingSlipsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('assistants')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'assistants'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>แอดมินผู้ช่วย ({assistants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'plans'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>แพ็กเกจ & สิทธิ์ฟังก์ชัน</span>
          </button>
        </div>

        {/* TAB 1: STORES MANAGEMENT */}
        {activeTab === 'stores' && (
          <div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อร้านค้า หรือ ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddStoreModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างร้านค้าใหม่</span>
                </button>
              </div>
            </div>

            {/* Store Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store) => (
                <div
                  key={store.id}
                  className="rounded-2xl bg-slate-800/90 border border-slate-700/80 overflow-hidden shadow-lg flex flex-col justify-between hover:border-slate-600 transition"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-700 border border-slate-600 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base leading-snug">{store.name}</h3>
                          <div className="text-[11px] text-slate-400">ID: {store.id}</div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        store.type === 'buffet' ? 'bg-amber-500/20 text-amber-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {store.type === 'buffet' ? 'บุฟเฟ่ต์' : 'ตามสั่ง'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-700/40 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">แพ็กเกจ:</span>
                        <span className="font-semibold text-emerald-400 uppercase">{store.plan_id} ({store.plan_billing_type})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">วันหมดอายุ:</span>
                        <span className="font-medium text-slate-200">{formatThaiDate(store.plan_expires_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">สถานะ:</span>
                        <span className={`font-semibold ${store.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {store.status === 'active' ? '● เปิดใช้งานปกติ' : '● ระงับการใช้งาน'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Impersonate & Action Buttons */}
                  <div className="p-4 bg-slate-900/70 border-t border-slate-700/60 flex flex-col gap-2">
                    <Link
                      href={`/store/${store.id}/tables`}
                      className="w-full py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เข้าจัดการระบบเสมือนเป็นเจ้าของร้าน (Impersonate)</span>
                    </Link>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setSelectedStoreForClone(store);
                          setCloneData({
                            new_name: `สาขาใหม่ของ ${store.name}`,
                            plan_id: store.plan_id,
                            plan_billing_type: store.plan_billing_type,
                          });
                          setShowCloneModal(true);
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition"
                        title="ก๊อปปี้ร้านค้าเพื่อเปิดให้ลูกค้ารายใหม่"
                      >
                        <Copy className="w-3 h-3 text-amber-400" />
                        <span>โคลนร้านนี้</span>
                      </button>

                      <button
                        onClick={() => handleDeleteStore(store.id, store.name)}
                        className="py-1.5 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1 transition border border-red-500/20"
                        title="ลบร้านค้านี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SLIPS VERIFICATION */}
        {activeTab === 'slips' && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white mb-1">รายการสลิปชำระเงินที่ร้านอาหารแนบส่งเข้ามา</h2>
              <p className="text-xs text-slate-400">ตรวจสอบความถูกต้องของยอดเงินและภาพสลิปเพื่อกดอนุมัติการต่ออายุแพ็กเกจ</p>
            </div>

            {slips.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-800 rounded-2xl border border-slate-700">
                ยังไม่มีรายการสลิปที่แนบเข้ามา
              </div>
            ) : (
              <div className="space-y-4">
                {slips.map((slip) => (
                  <div
                    key={slip.id}
                    className="p-5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <button
                        onClick={() => setSelectedSlip(slip)}
                        className="w-16 h-20 rounded-xl overflow-hidden bg-slate-700 border border-slate-600 flex-shrink-0 relative group"
                        title="คลิกเพื่อดูสลิปขนาดเต็ม"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={slip.slip_url} alt="สลิป" className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition">
                          ดูสลิป
                        </span>
                      </button>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-base">{slip.store_name}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            slip.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : slip.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {slip.status === 'pending' ? 'รอตรวจสอบ' : slip.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-0.5">
                          <p>แพ็กเกจที่ชำระ: <strong className="text-orange-400 uppercase">{slip.plan_id} ({slip.billing_cycle})</strong></p>
                          <p>ยอดโอน: <strong className="text-white text-sm">{formatMoney(slip.amount)}</strong> | วันที่ส่ง: {formatThaiDate(slip.created_at)}</p>
                          {slip.reviewer_notes && <p className="text-amber-300">หมายเหตุ: {slip.reviewer_notes}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button
                        onClick={() => setSelectedSlip(slip)}
                        className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
                      >
                        ตรวจดูสลิป / ตัดสินใจ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASSISTANT ADMINS */}
        {activeTab === 'assistants' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">แอดมินผู้ช่วยในระบบ (Assistant Admins)</h2>
                <p className="text-xs text-slate-400">เพิ่มทีมงานผู้ช่วยเพื่อเข้ามาช่วยดูแลและตรวจสอบระบบร้านค้า</p>
              </div>

              <button
                onClick={() => setShowAddAssistantModal(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มผู้ช่วยแอดมิน</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assistants.map((adm) => (
                <div key={adm.id} className="p-5 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white ${
                      adm.role === 'owner' ? 'bg-orange-600' : 'bg-blue-600'
                    }`}>
                      {adm.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{adm.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          adm.role === 'owner' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {adm.role === 'owner' ? 'เจ้าของหลัก (Owner)' : 'ผู้ช่วยแอดมิน'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">ชื่อผู้ใช้: @{adm.username}</p>
                    </div>
                  </div>

                  {adm.role !== 'owner' && (
                    <button
                      onClick={() => handleDeleteAssistant(adm.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                      title="ลบผู้ช่วยคนนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PLANS & PRICING CONFIG */}
        {activeTab === 'plans' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">การกำหนดแพ็กเกจและสิทธิ์ฟังก์ชัน (SaaS Plans & Feature Gating)</h2>
              <p className="text-xs text-slate-400">กำหนดว่าร้านค้าแต่ละระดับสามารถใช้งานฟังก์ชันอะไรได้บ้าง</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free Plan */}
              <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">แพ็กเกจเริ่มต้น</span>
                  <h3 className="text-xl font-bold text-white mt-1">Free Starter</h3>
                  <div className="text-2xl font-extrabold text-orange-400 mt-2">฿0 <span className="text-xs text-slate-400 font-normal">/ ตลอดชีพ</span></div>
                  <p className="text-xs text-slate-400 mt-2">เหมาะสำหรับร้านขนาดเล็กทดลองใช้งาน</p>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> จำกัดโต๊ะไม่เกิน 5 โต๊ะ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> สแกนสั่ง QR Code ทั่วไป</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> เมนูอาหารไม่เกิน 30 รายการ</li>
                    <li className="flex items-center gap-2 text-slate-500"><XCircle className="w-4 h-4 text-slate-500" /> ไม่มีระบบ KDS ครัวสด</li>
                    <li className="flex items-center gap-2 text-slate-500"><XCircle className="w-4 h-4 text-slate-500" /> ไม่มีระบบบุฟเฟ่ต์จับเวลา</li>
                    <li className="flex items-center gap-2 text-slate-500"><XCircle className="w-4 h-4 text-slate-500" /> ไม่มีระบบบัญชีต้นทุนและรายจ่าย</li>
                  </ul>
                </div>
              </div>

              {/* Standard Pro Plan */}
              <div className="p-6 rounded-2xl bg-slate-800 border-2 border-orange-500 relative flex flex-col justify-between shadow-xl shadow-orange-500/10">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-500 text-white font-bold text-[10px] uppercase">
                  ยอดนิยมสำหรับร้านอาหาร
                </span>

                <div>
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">แพ็กเกจแนะนำ</span>
                  <h3 className="text-xl font-bold text-white mt-1">Standard Pro</h3>
                  <div className="text-2xl font-extrabold text-white mt-2">฿590 <span className="text-xs text-slate-400 font-normal">/ เดือน (หรือ ฿5,900/ปี)</span></div>
                  <p className="text-xs text-slate-400 mt-2">ระบบครบวงจรสำหรับร้านอาหารทุกรูปแบบ</p>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> ไม่จำกัดจำนวนโต๊ะและโซน</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> ระบบ QR สั่งแยกรายคน (1-A, 1-B)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> จอห้องครัว KDS แจ้งเตือนเสียงสด</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> โหมดบุฟเฟ่ต์จับเวลา & หลาย Tier ราคา</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> รายงานบัญชี คำนวณต้นทุนอาหาร กำไรสุทธิ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> ระบบพิมพ์ใบเสร็จและตั๋วครัว 80mm/58mm</li>
                  </ul>
                </div>
              </div>

              {/* Lifetime Enterprise Plan */}
              <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">แพ็กเกจซื้อขาด</span>
                  <h3 className="text-xl font-bold text-white mt-1">Enterprise Lifetime</h3>
                  <div className="text-2xl font-extrabold text-amber-400 mt-2">฿19,900 <span className="text-xs text-slate-400 font-normal">/ จ่ายครั้งเดียวจบ</span></div>
                  <p className="text-xs text-slate-400 mt-2">เหมาะสำหรับร้านที่ต้องการซื้อขาดไม่มีรายเดือน</p>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> ครบทุกฟังก์ชันของ Standard Pro</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> ใช้งานได้ตลอดชีพ ไม่มีค่าบริการรายเดือน</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> สิทธิ์ปรับแต่งโลโก้ร้านค้าและโดเมนเต็มรูปแบบ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> ซัพพอร์ตการดูแลระบบแบบพรีเมียม</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD NEW STORE */}
        {showAddStoreModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <StoreIcon className="w-5 h-5 text-orange-400" />
                  <span>สร้างร้านค้าใหม่ในระบบ</span>
                </h3>
                <button onClick={() => setShowAddStoreModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateStore} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ชื่อร้านอาหาร *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ครัวคุณแม่ อาหารปักษ์ใต้"
                    value={newStoreData.name}
                    onChange={(e) => setNewStoreData({ ...newStoreData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">รูปแบบร้านอาหาร *</label>
                  <select
                    value={newStoreData.type}
                    onChange={(e) => setNewStoreData({ ...newStoreData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="alacarte">อาหารตามสั่ง / สั่งตามเมนู (A La Carte)</option>
                    <option value="buffet">บุฟเฟ่ต์จับเวลา (Buffet หลาย Tier)</option>
                  </select>
                </div>

                {newStoreData.type === 'buffet' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">เวลาจำกัดในการรับประทาน (นาที)</label>
                    <input
                      type="number"
                      value={newStoreData.buffet_duration_mins}
                      onChange={(e) => setNewStoreData({ ...newStoreData, buffet_duration_mins: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">แพ็กเกจสมาชิก</label>
                    <select
                      value={newStoreData.plan_id}
                      onChange={(e) => setNewStoreData({ ...newStoreData, plan_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="free">Free Starter</option>
                      <option value="pro">Standard Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">รอบการชำระ</label>
                    <select
                      value={newStoreData.plan_billing_type}
                      onChange={(e) => setNewStoreData({ ...newStoreData, plan_billing_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="monthly">รายเดือน</option>
                      <option value="yearly">รายปี</option>
                      <option value="lifetime">ซื้อขาด</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">เบอร์โทรศัพท์ร้าน</label>
                  <input
                    type="text"
                    placeholder="08X-XXX-XXXX"
                    value={newStoreData.phone}
                    onChange={(e) => setNewStoreData({ ...newStoreData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">หมายเลข PromptPay สำหรับรับเงิน</label>
                  <input
                    type="text"
                    placeholder="เบอร์โทร หรือ เลขประจำตัวผู้เสียภาษี"
                    value={newStoreData.promptpay_number}
                    onChange={(e) => setNewStoreData({ ...newStoreData, promptpay_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddStoreModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-lg shadow-orange-600/30"
                  >
                    ยืนยันสร้างร้านค้า
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CLONE STORE */}
        {showCloneModal && selectedStoreForClone && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Copy className="w-5 h-5 text-amber-400" />
                  <span>โคลนร้านค้าต้นแบบ</span>
                </h3>
                <button onClick={() => setShowCloneModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                ระบบจะทำการคัดลอกหมวดหมู่ เมนูอาหาร รูปภาพ ราคาต้นทุน และผังโต๊ะจาก{' '}
                <strong className="text-orange-400">{selectedStoreForClone.name}</strong> ไปยังร้านค้าใหม่ให้อัตโนมัติทันที
              </p>

              <form onSubmit={handleCloneStore} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ชื่อร้านค้าใหม่ *</label>
                  <input
                    type="text"
                    required
                    value={cloneData.new_name}
                    onChange={(e) => setCloneData({ ...cloneData, new_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">แพ็กเกจ</label>
                    <select
                      value={cloneData.plan_id}
                      onChange={(e) => setCloneData({ ...cloneData, plan_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="free">Free Starter</option>
                      <option value="pro">Standard Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">รอบชำระ</label>
                    <select
                      value={cloneData.plan_billing_type}
                      onChange={(e) => setCloneData({ ...cloneData, plan_billing_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="monthly">รายเดือน</option>
                      <option value="yearly">รายปี</option>
                      <option value="lifetime">ซื้อขาด</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCloneModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30"
                  >
                    โคลนและเปิดร้านใหม่ทันที
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: SLIP PREVIEW & APPROVAL */}
        {selectedSlip && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  <span>ตรวจสอบสลิป: {selectedSlip.store_name}</span>
                </h3>
                <button onClick={() => setSelectedSlip(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {/* Slip Full Image */}
              <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700 mb-4 flex items-center justify-center p-2 max-h-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedSlip.slip_url} alt="สลิปโอนเงิน" className="max-h-72 w-auto object-contain rounded-lg" />
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 text-xs space-y-1.5 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">ร้านค้า:</span>
                  <span className="font-bold text-white">{selectedSlip.store_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">แพ็กเกจที่ชำระ:</span>
                  <span className="font-bold text-orange-400 uppercase">{selectedSlip.plan_id} ({selectedSlip.billing_cycle})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ยอดเงินที่ต้องชำระ:</span>
                  <span className="font-bold text-emerald-400 text-sm">{formatMoney(selectedSlip.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">วันที่แนบสลิป:</span>
                  <span className="text-slate-300">{formatThaiDate(selectedSlip.created_at)}</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-300 mb-1">บันทึกข้อความ / หมายเหตุถึงร้านค้า</label>
                <input
                  type="text"
                  placeholder="เช่น ยอดเงินตรงตามรอบบิล อนุมัติการใช้งานต่อ"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleReviewSlip('reject')}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-semibold transition"
                >
                  ✕ ปฏิเสธสลิปนี้
                </button>
                <button
                  onClick={() => handleReviewSlip('approve')}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition"
                >
                  ✓ อนุมัติ & ขยายวันหมดอายุ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD ASSISTANT */}
        {showAddAssistantModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>เพิ่มผู้ช่วยแอดมิน (Assistant Admin)</span>
                </h3>
                <button onClick={() => setShowAddAssistantModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleAddAssistant} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ชื่อ-นามสกุล หรือชื่อเล่น *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น น้องโบว์ ผู้ช่วยดูแลระบบ"
                    value={assistantData.name}
                    onChange={(e) => setAssistantData({ ...assistantData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Username สำหรับเข้าสู่ระบบ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น assistant2"
                    value={assistantData.username}
                    onChange={(e) => setAssistantData({ ...assistantData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">รหัสผ่าน (Password) *</label>
                  <input
                    type="password"
                    required
                    placeholder="กำหนดรหัสผ่าน"
                    value={assistantData.password}
                    onChange={(e) => setAssistantData({ ...assistantData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAssistantModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30"
                  >
                    บันทึกผู้ช่วยแอดมิน
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
