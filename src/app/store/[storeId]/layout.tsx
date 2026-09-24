'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  UtensilsCrossed,
  ChefHat,
  Receipt,
  BookOpen,
  PieChart,
  Settings,
  Lock,
  UserCheck,
  ArrowLeft,
  Flame,
  Clock,
  AlertCircle,
  ShieldAlert,
  Users,
  Phone
} from 'lucide-react';
import { Store, StoreStaff, StaffRole } from '@/lib/types';
import { formatThaiDate } from '@/lib/utils';

export default function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { storeId: string };
}) {
  const pathname = usePathname();
  const [store, setStore] = useState<Store | null>(null);
  const [staffList, setStaffList] = useState<StoreStaff[]>([]);
  const [currentRole, setCurrentRole] = useState<StaffRole>('owner');
  const [currentStaffName, setCurrentStaffName] = useState<string>('เจ้าของร้าน');
  const [showPinModal, setShowPinModal] = useState(false);
  const [targetStaff, setTargetStaff] = useState<StoreStaff | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showDailyExpiryModal, setShowDailyExpiryModal] = useState(false);

  // Compute days remaining for 7-day warning
  const daysRemaining = store?.plan_expires_at
    ? Math.ceil((new Date(store.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 999;
  const isExpiringSoon = daysRemaining <= 7;
  const adminPhone = store?.admin_phone || '081-234-5678';

  useEffect(() => {
    fetch(`/api/stores/${params.storeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setStore(data);
          if (Array.isArray(data.staff)) {
            setStaffList(data.staff);
            const ownerStaff = data.staff.find((s: StoreStaff) => s.role === 'owner');
            if (ownerStaff) {
              setCurrentRole(ownerStaff.role);
              setCurrentStaffName(ownerStaff.name);
            }
          }

          // Check if within 7 days and not acknowledged today
          if (data.plan_expires_at) {
            const days = Math.ceil((new Date(data.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (days <= 7) {
              const todayKey = 'expiry_modal_ack_' + new Date().toISOString().split('T')[0];
              const ack = typeof window !== 'undefined' ? localStorage.getItem(todayKey) : null;
              if (!ack) {
                setShowDailyExpiryModal(true);
              }
            }
          }
        }
      })
      .catch((err) => console.error(err));
  }, [params.storeId]);

  const handleDismissDailyModal = () => {
    const todayKey = 'expiry_modal_ack_' + new Date().toISOString().split('T')[0];
    if (typeof window !== 'undefined') {
      localStorage.setItem(todayKey, 'true');
    }
    setShowDailyExpiryModal(false);
  };

  const handleSelectStaff = (s: StoreStaff) => {
    setTargetStaff(s);
    setEnteredPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStaff) return;

    if (enteredPin === targetStaff.pin) {
      setCurrentRole(targetStaff.role);
      setCurrentStaffName(targetStaff.name);
      setShowPinModal(false);
      setPinError('');
    } else {
      setPinError('รหัส PIN ไม่ถูกต้อง (ลองดู PIN ในหน้ารายชื่อ staff หรือตั้งค่า)');
    }
  };

  const navItems = [
    {
      href: `/store/${params.storeId}/tables`,
      label: 'จัดการโต๊ะ (หน้าแรก)',
      icon: UtensilsCrossed,
      color: 'text-orange-500',
    },
    {
      href: `/store/${params.storeId}/kds`,
      label: 'จอห้องครัว KDS',
      icon: ChefHat,
      color: 'text-emerald-500',
    },
    {
      href: `/store/${params.storeId}/cashier`,
      label: 'แคชเชียร์คิดเงิน',
      icon: Receipt,
      color: 'text-blue-500',
    },
    {
      href: `/store/${params.storeId}/menu`,
      label: 'เมนูอาหาร & ต้นทุน',
      icon: BookOpen,
      color: 'text-purple-500',
    },
    {
      href: `/store/${params.storeId}/accounting`,
      label: 'บัญชี & สรุปกำไร',
      icon: PieChart,
      color: 'text-rose-500',
    },
    {
      href: `/store/${params.storeId}/customers`,
      label: 'ลูกค้า & สมาชิก',
      icon: Users,
      color: 'text-amber-500',
    },
    {
      href: `/store/${params.storeId}/settings`,
      label: 'ตั้งค่า & ต่ออายุ',
      icon: Settings,
      color: 'text-slate-500',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* 7-DAY EXPIRATION STICKY ALERT BANNER */}
      {isExpiringSoon && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-md sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-red-700">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/20 animate-pulse">
              <AlertCircle className="w-4 h-4" />
            </span>
            <span>
              {daysRemaining <= 0 ? (
                <>🚨 <strong>แจ้งเตือนสำคัญ:</strong> บัญชีร้านค้านี้หมดอายุการใช้งานแล้ว กรุณาติดต่อแอดมินเพื่อต่ออายุทันที</>
              ) : (
                <>⚠️ <strong>แจ้งเตือน:</strong> แอปพลิเคชันของร้านจะหมดอายุในอีก <span className="underline font-bold text-yellow-200">{daysRemaining} วัน</span> (วันที่ {formatThaiDate(store?.plan_expires_at || '')}) กรุณาติดต่อแอดมินเพื่อต่ออายุการใช้งาน</>
              )}
            </span>
          </div>

          <a
            href={`tel:${adminPhone}`}
            className="px-3.5 py-1 bg-white hover:bg-yellow-50 text-red-700 hover:text-red-800 rounded-lg font-bold flex items-center gap-1.5 shadow transition text-xs whitespace-nowrap animate-bounce"
            title="กดเพื่อโทรออกหาแอดมินทันที"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>📞 กดโทรหาแอดมิน: {adminPhone}</span>
          </a>
        </div>
      )}

      {/* Top Operational Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Left: Store identity */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              title="กลับหน้าหลัก"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {store?.logo_url && (
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base leading-tight">
                  {store ? store.name : 'กำลังโหลดร้านค้า...'}
                </h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  store?.type === 'buffet' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {store?.type === 'buffet' ? 'บุฟเฟ่ต์' : 'ตามสั่ง'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">ระบบจัดการหน้าร้าน POS & QR Code</p>
            </div>
          </div>

          {/* Right: Role Switcher & Fast PIN lock */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300/80 text-xs font-semibold text-slate-700 transition"
              >
                <UserCheck className="w-4 h-4 text-orange-600" />
                <span className="hidden sm:inline">ผู้ใช้งาน:</span>
                <span className="text-orange-600">{currentStaffName}</span>
                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 uppercase">
                  {currentRole}
                </span>
              </button>

              {/* Staff Switch Dropdown */}
              <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 hidden group-hover:block z-40">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                  สลับผู้ใช้งาน / ใส่รหัส PIN
                </div>
                {staffList.map((stf) => (
                  <button
                    key={stf.id}
                    onClick={() => handleSelectStaff(stf)}
                    className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-orange-50 text-slate-700 hover:text-orange-700 transition"
                  >
                    <div>
                      <div className="font-semibold">{stf.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{stf.role} (PIN: {stf.pin})</div>
                    </div>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            <Link
              href="/super-admin"
              className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center gap-1.5 transition"
              title="สลับไปหน้า Super Admin เจ้าของแอป"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Super Admin</span>
            </Link>
          </div>
        </div>

        {/* Operational Navigation Tabs */}
        <div className="border-t border-slate-200/80 bg-slate-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-none py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* FAST PIN LOCK MODAL */}
      {showPinModal && targetStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">ใส่รหัส PIN เพื่อสลับผู้ใช้</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำลังสลับไปเป็น: <strong>{targetStaff.name}</strong> ({targetStaff.role})
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="ใส่รหัส PIN 4 หลัก"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  className="w-full text-center tracking-widest text-2xl font-bold py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500"
                />
                {pinError && <p className="text-xs text-red-500 mt-1.5 text-center font-medium">{pinError}</p>}
                <p className="text-[11px] text-slate-400 text-center mt-1">Hint ในระบบเดโม: PIN คือ {targetStaff.pin}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-md shadow-orange-600/30"
                >
                  ยืนยัน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MORNING EXPIRY MODAL DIALOG */}
      {showDailyExpiryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-red-500 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3 shadow-inner">
                <AlertCircle className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                แจ้งเตือนการหมดอายุของระบบร้านค้า
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ร้าน: <strong>{store?.name}</strong>
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900 space-y-2 mb-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">สถานะแพ็กเกจ:</span>
                <span className="font-bold text-red-600 uppercase">{store?.plan_id} ({store?.plan_billing_type})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">วันหมดอายุ:</span>
                <span className="font-bold text-slate-900 font-mono">{formatThaiDate(store?.plan_expires_at || '')}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-red-200/60">
                <span className="font-semibold text-slate-700">เวลาที่เหลือ:</span>
                <span className="font-black text-red-600 text-sm">
                  {daysRemaining <= 0 ? 'หมดอายุแล้ววันนี้' : `เหลือเวลาอีก ${daysRemaining} วัน`}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
              เพื่อป้องกันไม่ให้ระบบรับออเดอร์และการสั่งอาหารผ่าน QR Code หยุดชะงัก กรุณาติดต่อแอดมินเพื่อทำการต่ออายุการใช้งานได้ทันที
            </p>

            <div className="space-y-2">
              <a
                href={`tel:${adminPhone}`}
                className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition"
              >
                <Phone className="w-4 h-4" />
                <span>📞 โทรติดต่อแอดมินทันที: {adminPhone}</span>
              </a>

              <button
                type="button"
                onClick={handleDismissDailyModal}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                รับทราบ / เข้าสู่ระบบการขาย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
