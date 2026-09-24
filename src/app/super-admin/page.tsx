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
  DollarSign,
  Key,
  Activity,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  Cpu,
  Layers,
  Save,
  Shuffle
} from 'lucide-react';
import { Store, SubscriptionPayment, SuperAdmin, SubscriptionPlanConfig } from '@/lib/types';
import { formatMoney, formatThaiDate } from '@/lib/utils';

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<'stores' | 'slips' | 'assistants' | 'plans' | 'keepalive'>('stores');
  const [stores, setStores] = useState<Store[]>([]);
  const [slips, setSlips] = useState<SubscriptionPayment[]>([]);
  const [assistants, setAssistants] = useState<SuperAdmin[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [selectedStoreForClone, setSelectedStoreForClone] = useState<Store | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<SubscriptionPayment | null>(null);
  const [showAddAssistantModal, setShowAddAssistantModal] = useState(false);

  // Store Credentials Modal & Success Modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    storeName: string;
    storeId: string;
    username: string;
    password: string;
    ownerPin: string;
    cashierPin: string;
    kitchenPin: string;
    url: string;
  } | null>(null);

  const [storeCredsModal, setStoreCredsModal] = useState<{
    storeId: string;
    storeName: string;
    username: string;
    password: string;
    ownerPin: string;
    cashierPin: string;
    kitchenPin: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  // Keepalive test state
  const [testingWakeup, setTestingWakeup] = useState(false);
  const [wakeupResult, setWakeupResult] = useState<any>(null);

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
    login_username: '',
    login_password: '',
    owner_pin: '1111',
    cashier_pin: '3333',
    kitchen_pin: '4444',
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
  const [savingPlans, setSavingPlans] = useState(false);

  const generateRandomCredentials = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const storeSlug = newStoreData.name
      ? newStoreData.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 6)
      : 'store';
    setNewStoreData(prev => ({
      ...prev,
      login_username: `${storeSlug || 'store'}_${randomSuffix}`,
      login_password: pass,
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStores, resSlips, resAssistants, resPlans] = await Promise.all([
        fetch('/api/stores').then(r => r.json()),
        fetch('/api/subscription').then(r => r.json()),
        fetch('/api/super-admin/assistants').then(r => r.json()),
        fetch('/api/super-admin/plans').then(r => r.json()),
      ]);
      if (Array.isArray(resStores)) setStores(resStores);
      if (Array.isArray(resSlips)) setSlips(resSlips);
      if (Array.isArray(resAssistants)) setAssistants(resAssistants);
      if (Array.isArray(resPlans)) setPlans(resPlans);
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
        
        // Open credentials handover modal
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kaidee789.vercel.app';
        setCreatedCredentials({
          storeName: newStoreData.name,
          storeId: data.store_id,
          username: data.store?.login_username || newStoreData.login_username || 'user',
          password: data.store?.login_password || newStoreData.login_password || 'pass',
          ownerPin: data.store?.owner_pin || newStoreData.owner_pin || '1111',
          cashierPin: data.store?.cashier_pin || newStoreData.cashier_pin || '3333',
          kitchenPin: data.store?.kitchen_pin || newStoreData.kitchen_pin || '4444',
          url: `${origin}/store/${data.store_id}/tables`,
        });

        setNewStoreData({
          name: '',
          type: 'alacarte',
          phone: '',
          address: '',
          promptpay_number: '',
          plan_id: 'pro',
          plan_billing_type: 'monthly',
          buffet_duration_mins: 120,
          login_username: '',
          login_password: '',
          owner_pin: '1111',
          cashier_pin: '3333',
          kitchen_pin: '4444',
        });
        fetchData();
      } else {
        alert(data.error || 'สร้างร้านค้าไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenStoreCreds = async (store: Store) => {
    try {
      const res = await fetch(`/api/stores/${store.id}`);
      const data = await res.json();
      const ownerStaff = data.staff?.find((s: any) => s.role === 'owner');
      const cashierStaff = data.staff?.find((s: any) => s.role === 'cashier');
      const kitchenStaff = data.staff?.find((s: any) => s.role === 'kitchen');

      setStoreCredsModal({
        storeId: store.id,
        storeName: store.name,
        username: data.login_username || store.login_username || '',
        password: data.login_password || store.login_password || '',
        ownerPin: ownerStaff?.pin || '1111',
        cashierPin: cashierStaff?.pin || '3333',
        kitchenPin: kitchenStaff?.pin || '4444',
      });
    } catch (err) {
      console.error('Failed to load store credentials:', err);
    }
  };

  const handleSaveStoreCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeCredsModal) return;
    setSavingCreds(true);
    try {
      const res = await fetch(`/api/stores/${storeCredsModal.storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login_username: storeCredsModal.username,
          login_password: storeCredsModal.password,
          owner_pin: storeCredsModal.ownerPin,
          cashier_pin: storeCredsModal.cashierPin,
          kitchen_pin: storeCredsModal.kitchenPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`อัปเดตรหัสผ่านและ PIN ของร้าน "${storeCredsModal.storeName}" เรียบร้อยแล้ว`);
        setStoreCredsModal(null);
        fetchData();
      } else {
        alert('บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCreds(false);
    }
  };

  const handleSavePlans = async () => {
    setSavingPlans(true);
    try {
      const res = await fetch('/api/super-admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plans),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('บันทึกการตั้งค่าราคาแพ็กเกจสมาชิกเรียบร้อยแล้ว!');
        if (Array.isArray(data.plans)) setPlans(data.plans);
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกราคาแพ็กเกจ');
      }
    } catch (err) {
      console.error(err);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSavingPlans(false);
    }
  };

  const handleTriggerWakeup = async () => {
    setTestingWakeup(true);
    try {
      const res = await fetch('/api/cron/keepalive');
      const data = await res.json();
      setWakeupResult(data);
      setActionMessage('⚡ ปลุกระบบและเช็คสัญญาณฐานข้อมูลเรียบร้อย (เวลาตอบสนอง: ' + data.latency_ms + ' ms)');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    } finally {
      setTestingWakeup(false);
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

  const copyCredsToClipboard = (info: {
    storeName: string;
    username: string;
    password: string;
    ownerPin: string;
    cashierPin: string;
    kitchenPin: string;
    url: string;
  }) => {
    const text = `🎉 รายละเอียดการเข้าใช้งานระบบร้านค้า: ${info.storeName}
----------------------------------------
🌐 ลิงก์ระบบร้านอาหาร: ${info.url}
👤 Username: ${info.username}
🔑 Password: ${info.password}

🔢 รหัส PIN พนักงาน:
- เจ้าของร้าน (Owner): ${info.ownerPin}
- แคชเชียร์ (Cashier): ${info.cashierPin}
- จอห้องครัว (Kitchen): ${info.kitchenPin}
----------------------------------------
ระบบเปิดพร้อมใช้งาน สแกนสั่งอาหาร เช็คบิล และ KDS ครัวสดได้ทันทีครับ`;
    navigator.clipboard.writeText(text);
    alert('📋 คัดลอกข้อมูลส่งมอบร้านค้าแล้ว สามารถนำไปวางส่งให้ลูกค้าใน LINE ได้ทันที');
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
              <p className="text-xs text-slate-400">ระบบบริหารร้านอาหาร SaaS, รหัสผ่านร้าน & การตั้งค่าราคาแพลตฟอร์ม</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerWakeup}
              disabled={testingWakeup}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition"
              title="กดทดสอบส่งสัญญาณปลุกฐานข้อมูลและแอป"
            >
              <Activity className={`w-3.5 h-3.5 ${testingWakeup ? 'animate-spin' : ''}`} />
              <span>ฐานข้อมูล: พร้อมใช้งาน (Daily Keepalive)</span>
            </button>
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30">
              ● เจ้าของแพลตฟอร์ม
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {actionMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between animate-fadeIn">
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
            <div className="text-[11px] text-slate-400 mt-1">พร้อมเปิดโต๊ะและ QR ทันที</div>
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
              <span>สถานะเซิร์ฟเวอร์ & DB</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">100%</div>
            <div className="text-[11px] text-slate-400 mt-1">ปลุกระบบทุกวัน (ไม่หลับ)</div>
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
            <span>ตั้งราคาแพ็กเกจสมาชิก</span>
          </button>

          <button
            onClick={() => setActiveTab('keepalive')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'keepalive'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>สถานะ DB & ปลุกระบบ</span>
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
                  <span>สร้างร้านค้าใหม่ & ตั้งรหัสผ่าน</span>
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

                    <div className="space-y-2 text-xs text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-700/40 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">แพ็กเกจ:</span>
                        <span className="font-semibold text-emerald-400 uppercase">{store.plan_id} ({store.plan_billing_type})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">วันหมดอายุ:</span>
                        <span className="font-medium text-slate-200">{formatThaiDate(store.plan_expires_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">บัญชีร้าน:</span>
                        <span className="font-mono text-amber-300">
                          {store.login_username ? `@${store.login_username}` : 'ยังไม่ตั้งค่า'}
                        </span>
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

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        onClick={() => handleOpenStoreCreds(store)}
                        className="py-1.5 px-2 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-amber-300 text-xs font-medium flex items-center justify-center gap-1 transition border border-slate-600"
                        title="ดูและแก้ไข Username, Password และ PIN เจ้าของร้าน/แคชเชียร์/ครัว"
                      >
                        <Key className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span>รหัส & PIN</span>
                      </button>

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
                        className="py-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition"
                        title="ก๊อปปี้ร้านค้าเพื่อเปิดให้ลูกค้ารายใหม่"
                      >
                        <Copy className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <span>โคลนร้าน</span>
                      </button>

                      <button
                        onClick={() => handleDeleteStore(store.id, store.name)}
                        className="py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center justify-center gap-1 transition border border-red-500/20"
                        title="ลบร้านค้านี้"
                      >
                        <Trash2 className="w-3 h-3 flex-shrink-0" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">ตั้งค่าราคาแพ็กเกจสมาชิก (SaaS Subscription Pricing)</h2>
                <p className="text-xs text-slate-400">Super Admin สามารถปรับเปลี่ยนราคา รายเดือน/รายปี/ซื้อขาด และจำนวนโต๊ะสูงสุดของแต่ละแพ็กเกจได้ตามต้องการ</p>
              </div>

              <button
                onClick={handleSavePlans}
                disabled={savingPlans}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingPlans ? 'กำลังบันทึก...' : '💾 บันทึกการเปลี่ยนแปลงราคา'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan, idx) => (
                <div
                  key={plan.id}
                  className={`p-6 rounded-2xl bg-slate-800 border ${
                    plan.id === 'pro'
                      ? 'border-2 border-orange-500 shadow-xl shadow-orange-500/10 relative'
                      : 'border-slate-700'
                  } flex flex-col justify-between`}
                >
                  {plan.id === 'pro' && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-500 text-white font-bold text-[10px] uppercase">
                      ยอดนิยมสำหรับร้านอาหาร
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {plan.id === 'free' ? 'เริ่มต้นใช้งาน' : plan.id === 'pro' ? 'มืออาชีพ' : 'ตลอดชีพ'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-700 text-orange-400 text-[10px] font-mono font-bold uppercase">
                        ID: {plan.id}
                      </span>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-medium text-slate-300 mb-1">ชื่อแพ็กเกจ</label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => {
                          const updated = [...plans];
                          updated[idx].name = e.target.value;
                          setPlans(updated);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-bold focus:border-orange-500"
                      />
                    </div>

                    <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 mb-4">
                      {plan.id !== 'enterprise' && (
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">ราคาต่อเดือน (บาท/เดือน)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">฿</span>
                            <input
                              type="number"
                              value={plan.price_monthly}
                              onChange={(e) => {
                                const updated = [...plans];
                                updated[idx].price_monthly = Number(e.target.value);
                                setPlans(updated);
                              }}
                              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:border-orange-500"
                            />
                          </div>
                        </div>
                      )}

                      {plan.id === 'pro' && (
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">ราคาต่อปี (บาท/ปี)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">฿</span>
                            <input
                              type="number"
                              value={plan.price_yearly}
                              onChange={(e) => {
                                const updated = [...plans];
                                updated[idx].price_yearly = Number(e.target.value);
                                setPlans(updated);
                              }}
                              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:border-orange-500"
                            />
                          </div>
                        </div>
                      )}

                      {plan.id === 'enterprise' && (
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">ราคาซื้อขาด (จ่ายครั้งเดียวจบ)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">฿</span>
                            <input
                              type="number"
                              value={plan.price_lifetime}
                              onChange={(e) => {
                                const updated = [...plans];
                                updated[idx].price_lifetime = Number(e.target.value);
                                setPlans(updated);
                              }}
                              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:border-orange-500"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">จำกัดจำนวนโต๊ะสูงสุด (โต๊ะ)</label>
                        <input
                          type="number"
                          value={plan.max_tables}
                          onChange={(e) => {
                            const updated = [...plans];
                            updated[idx].max_tables = Number(e.target.value);
                            setPlans(updated);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">คำอธิบายฟังก์ชันที่ได้รับ</label>
                      <textarea
                        rows={4}
                        value={typeof plan.features === 'string' ? plan.features : JSON.stringify(plan.features, null, 2)}
                        onChange={(e) => {
                          const updated = [...plans];
                          updated[idx].features = e.target.value;
                          setPlans(updated);
                        }}
                        placeholder="ระบุสิทธิประโยชน์ของแพ็กเกจ..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: KEEPALIVE & DB MONITOR */}
        {activeTab === 'keepalive' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h2 className="text-lg font-bold text-white">ระบบปลุกฐานข้อมูล & เซิร์ฟเวอร์อัตโนมัติ (Automated Daily Wakeup)</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    แก้ปัญหา Turso Database และ Vercel Serverless Function หลับเมื่อไม่มีคนเข้าร้านหลายวัน
                  </p>
                </div>

                <button
                  onClick={handleTriggerWakeup}
                  disabled={testingWakeup}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${testingWakeup ? 'animate-spin' : ''}`} />
                  <span>{testingWakeup ? 'กำลังทดสอบส่งสัญญาณ...' : '⚡ ปลุกระบบและเช็คสัญญาณเดี๋ยวนี้'}</span>
                </button>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
                  <div className="text-xs text-slate-400">รอบเวลาปลุกอัตโนมัติ (Vercel Cron)</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">ทุกวัน 08:00 น.</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">ตรงกับเวลา 01:00 UTC (`0 1 * * *`)</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
                  <div className="text-xs text-slate-400">ฐานข้อมูลหลัก (Database Host)</div>
                  <div className="text-lg font-bold text-white mt-1">Turso Cloud</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Region: AWS Tokyo (Latency ต่ำสุด)</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
                  <div className="text-xs text-slate-400">สถานะความตื่นตัว</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">100% Always Active</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">เปิดโต๊ะ สั่งอาหาร ได้เร็วทันใจไม่สะดุด</div>
                </div>
              </div>

              {/* Live Wakeup Result display */}
              {wakeupResult && (
                <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-slate-200">
                  <div className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>ผลการทดสอบส่งสัญญาณปลุกระบบล่าสุด (Ping Result):</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-slate-300">
                    <div>สถานะ: <strong className="text-emerald-400">{wakeupResult.status}</strong></div>
                    <div>ความเร็ว (Latency): <strong className="text-white">{wakeupResult.latency_ms} ms</strong></div>
                    <div>จำนวนร้านค้าใน DB: <strong className="text-white">{wakeupResult.stores_count} ร้าน</strong></div>
                    <div>เวลาที่ปลุก: <strong className="text-slate-400">{new Date(wakeupResult.timestamp).toLocaleTimeString('th-TH')}</strong></div>
                  </div>
                  <p className="mt-2 text-[11px] text-emerald-300/80">
                    ✓ {wakeupResult.message}
                  </p>
                </div>
              )}
            </div>

            {/* Recent heartbeats table */}
            {wakeupResult?.recent_heartbeats && wakeupResult.recent_heartbeats.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-800 border border-slate-700">
                <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>ประวัติการปลุกระบบล่าสุด (Heartbeat History Log)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="p-2.5">เหตุการณ์</th>
                        <th className="p-2.5">เวลาส่งสัญญาณ</th>
                        <th className="p-2.5">Latency (ms)</th>
                        <th className="p-2.5">ข้อความ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {wakeupResult.recent_heartbeats.map((hb: any) => (
                        <tr key={hb.id} className="hover:bg-slate-700/20">
                          <td className="p-2.5 font-medium text-emerald-400">{hb.event}</td>
                          <td className="p-2.5 text-slate-300">{new Date(hb.created_at).toLocaleString('th-TH')}</td>
                          <td className="p-2.5 font-mono text-white">{hb.latency_ms} ms</td>
                          <td className="p-2.5 text-slate-400">{hb.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL: ADD NEW STORE WITH CREDENTIALS */}
        {showAddStoreModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <StoreIcon className="w-5 h-5 text-orange-400" />
                  <span>สร้างร้านค้าใหม่ & กำหนดรหัสผ่าน</span>
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
                      <option value="free">Free Starter (฿0)</option>
                      <option value="pro">Standard Pro</option>
                      <option value="enterprise">Enterprise Lifetime</option>
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

                {/* LOGIN CREDENTIALS & PINS SECTION */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-orange-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold text-white">ข้อมูลบัญชีร้านค้า & รหัส PIN</span>
                    </div>
                    <button
                      type="button"
                      onClick={generateRandomCredentials}
                      className="text-[11px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 flex items-center gap-1 transition"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>สุ่ม Username / รหัสผ่าน</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Username ร้านค้า</label>
                      <input
                        type="text"
                        placeholder="เช่น myrestaurant"
                        value={newStoreData.login_username}
                        onChange={(e) => setNewStoreData({ ...newStoreData, login_username: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Password ร้านค้า</label>
                      <input
                        type="text"
                        placeholder="กำหนดรหัสผ่าน"
                        value={newStoreData.login_password}
                        onChange={(e) => setNewStoreData({ ...newStoreData, login_password: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:border-orange-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="block text-[11px] text-slate-400 mb-2">กำหนดรหัส PIN พนักงาน (4 หลัก)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">PIN เจ้าของ</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={newStoreData.owner_pin}
                          onChange={(e) => setNewStoreData({ ...newStoreData, owner_pin: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-center font-mono text-xs text-orange-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">PIN แคชเชียร์</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={newStoreData.cashier_pin}
                          onChange={(e) => setNewStoreData({ ...newStoreData, cashier_pin: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-center font-mono text-xs text-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">PIN ครัว</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={newStoreData.kitchen_pin}
                          onChange={(e) => setNewStoreData({ ...newStoreData, kitchen_pin: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-center font-mono text-xs text-emerald-400"
                        />
                      </div>
                    </div>
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

        {/* MODAL: POST-CREATION CREDENTIALS HANDOVER */}
        {createdCredentials && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-800 border-2 border-emerald-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="text-center pb-4 border-b border-slate-700 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">สร้างร้านค้าสำเร็จเรียบร้อย!</h3>
                <p className="text-xs text-slate-400">ข้อมูลเข้าใช้งานสำหรับส่งมอบให้ร้านค้า</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-2.5 text-xs text-slate-300 font-mono mb-4">
                <div className="flex justify-between font-sans">
                  <span className="text-slate-400">ร้าน:</span>
                  <span className="font-bold text-white">{createdCredentials.storeName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">ลิงก์ร้านค้า:</span>
                  <a
                    href={createdCredentials.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-400 hover:underline truncate max-w-[200px]"
                  >
                    {createdCredentials.url}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Username:</span>
                  <span className="font-bold text-amber-300">{createdCredentials.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Password:</span>
                  <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{createdCredentials.password}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">PIN เจ้าของ</div>
                    <div className="font-bold text-orange-400">{createdCredentials.ownerPin}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">PIN แคชเชียร์</div>
                    <div className="font-bold text-blue-400">{createdCredentials.cashierPin}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-sans">PIN ครัว</div>
                    <div className="font-bold text-emerald-400">{createdCredentials.kitchenPin}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => copyCredsToClipboard(createdCredentials)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                >
                  <Copy className="w-4 h-4" />
                  <span>📋 คัดลอกข้อมูลทั้งหมดเพื่อส่งให้ลูกค้า (LINE)</span>
                </button>
                <button
                  onClick={() => setCreatedCredentials(null)}
                  className="w-full py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold"
                >
                  เสร็จสิ้น / ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: VIEW / EDIT STORE CREDENTIALS & PINS */}
        {storeCredsModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  <span>รหัสผ่าน & PIN: {storeCredsModal.storeName}</span>
                </h3>
                <button onClick={() => setStoreCredsModal(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleSaveStoreCreds} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Username ร้านค้า</label>
                  <input
                    type="text"
                    value={storeCredsModal.username}
                    onChange={(e) => setStoreCredsModal({ ...storeCredsModal, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400">Password ร้านค้า</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? 'ซ่อนรหัส' : 'แสดงรหัส'}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={storeCredsModal.password}
                    onChange={(e) => setStoreCredsModal({ ...storeCredsModal, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono"
                  />
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 space-y-2">
                  <span className="block text-slate-400 font-medium">รหัส PIN 4 หลักประจำตำแหน่ง</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">PIN เจ้าของ</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={storeCredsModal.ownerPin}
                        onChange={(e) => setStoreCredsModal({ ...storeCredsModal, ownerPin: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-center font-mono text-orange-400 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">PIN แคชเชียร์</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={storeCredsModal.cashierPin}
                        onChange={(e) => setStoreCredsModal({ ...storeCredsModal, cashierPin: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-center font-mono text-blue-400 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">PIN ห้องครัว</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={storeCredsModal.kitchenPin}
                        onChange={(e) => setStoreCredsModal({ ...storeCredsModal, kitchenPin: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-center font-mono text-emerald-400 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kaidee789.vercel.app';
                      copyCredsToClipboard({
                        storeName: storeCredsModal.storeName,
                        username: storeCredsModal.username,
                        password: storeCredsModal.password,
                        ownerPin: storeCredsModal.ownerPin,
                        cashierPin: storeCredsModal.cashierPin,
                        kitchenPin: storeCredsModal.kitchenPin,
                        url: `${origin}/store/${storeCredsModal.storeId}/tables`,
                      });
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกส่งลูกค้า</span>
                  </button>

                  <button
                    type="submit"
                    disabled={savingCreds}
                    className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingCreds ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
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
