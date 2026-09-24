'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store as StoreIcon,
  ShieldCheck,
  UtensilsCrossed,
  Flame,
  QrCode,
  ArrowRight,
  Sparkles,
  ChefHat,
  ReceiptText,
  Clock,
  Layers,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Store } from '@/lib/types';

export default function HomePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stores')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStores(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-orange-500 selection:text-white">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/60 pb-16 pt-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.18),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs sm:text-sm font-medium mb-6 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>สุดยอดระบบร้านอาหาร SaaS Multi-tenant & Dynamic QR Ordering 2026</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
            ร้านขายดี <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400">สั่ง QR Code</span>
          </h1>
          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 font-normal leading-relaxed mb-8">
            แพลตฟอร์มบริหารร้านอาหารสำหรับเจ้าของแอปที่ต้องการสร้างและขายระบบให้กับร้านอาหารต่างๆ
            รองรับทั้ง <strong className="text-orange-400 font-semibold">ร้านตามสั่ง (A La Carte)</strong> และ{' '}
            <strong className="text-amber-400 font-semibold">ร้านบุฟเฟ่ต์จับเวลา (Buffet)</strong> พร้อม KDS ครัว, แคชเชียร์, บัญชีต้นทุน และสแกนสั่งแยกรายคน
          </p>

          {/* Quick Access Action Grid */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>เข้าสู่ระบบเจ้าของแอป (Super Admin)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/store/demo-alacarte/tables"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold transition-all transform hover:-translate-y-0.5"
            >
              <UtensilsCrossed className="w-5 h-5 text-orange-400" />
              <span>เดโมร้านตามสั่ง (A La Carte)</span>
            </Link>

            <Link
              href="/store/demo-buffet/tables"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold transition-all transform hover:-translate-y-0.5"
            >
              <Flame className="w-5 h-5 text-amber-400" />
              <span>เดโมร้านบุฟเฟ่ต์จับเวลา (Buffet)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Core Pillars Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-orange-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">เจ้าของแอปขายระบบ (SaaS)</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              สร้างร้านค้าตัวอย่าง โคลนร้านค้าเปิดให้ลูกค้าใหม่ได้ในคลิกเดียว จัดการสิทธิ์แพ็กเกจ ตรวจสอบสลิปโอนเงิน และเข้าดูระบบร้านค้าเสมือนเป็นเจ้าของร้านเอง
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-amber-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dynamic QR สั่งแยกรายคน</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              สแกน QR Code ประจำรอบ แยกผู้สั่งเช่น โต๊ะ 1-A, โต๊ะ 1-B เห็นยอดแยกคนและยอดรวม มี Checklist ตรวจรับอาหาร และ QR Code จะหมดอายุทันทีหลังคิดเงิน
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">ตามสั่ง & บุฟเฟ่ต์จับเวลา</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              รองรับทั้งร้านตามสั่งและบุฟเฟ่ต์หลาย Tier (เช่น Standard 399 / Premium 499) มีตัวนับถอยหลังเวลา พร้อมระบบ KDS ครัว แคชเชียร์ และบัญชีต้นทุน-กำไร
            </p>
          </div>
        </div>

        {/* Section 1: Active Store Tenants */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <StoreIcon className="w-6 h-6 text-orange-400" />
                <span>ร้านค้าในระบบ (Tenant Stores)</span>
              </h2>
              <p className="text-sm text-slate-400">เลือกร้านค้าเพื่อเข้าใช้งานระบบบริหารจัดการ หรือทดสอบสแกนสั่งอาหาร</p>
            </div>

            <Link
              href="/super-admin"
              className="text-xs sm:text-sm font-medium text-orange-400 hover:text-orange-300 flex items-center gap-1.5 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20"
            >
              <span>จัดการร้านค้าทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูลร้านค้า...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stores.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl bg-slate-800 border border-slate-700/80 overflow-hidden shadow-lg hover:shadow-orange-500/10 transition-all flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-700 border border-slate-600 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              s.type === 'buffet' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            }`}>
                              {s.type === 'buffet' ? 'บุฟเฟ่ต์จับเวลา' : 'อาหารตามสั่ง'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {s.plan_id.toUpperCase()} PLAN
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white leading-snug">{s.name}</h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">{s.address || 'ร้านอาหารตัวอย่างในระบบ'}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 mb-4">
                      <div>
                        <span className="text-slate-400 block">เบอร์ติดต่อ:</span>
                        <span className="text-slate-200 font-medium">{s.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">PromptPay:</span>
                        <span className="text-slate-200 font-medium">{s.promptpay_number}</span>
                      </div>
                      {s.type === 'buffet' && (
                        <div className="col-span-2 pt-1 border-t border-slate-700/50 flex items-center justify-between">
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            เวลาจำกัด: {s.buffet_duration_mins} นาที
                          </span>
                          <span className="text-slate-400">หลาย Tier ราคา</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Store Action Links */}
                  <div className="bg-slate-900/80 p-4 border-t border-slate-700/60 flex items-center justify-between gap-2">
                    <Link
                      href={`/store/${s.id}/tables`}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition"
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      <span>เปิดหน้าร้าน POS (ผังโต๊ะ)</span>
                    </Link>

                    <Link
                      href={`/store/${s.id}/kds`}
                      className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      title="จอห้องครัว KDS"
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>ครัว KDS</span>
                    </Link>

                    <Link
                      href={`/store/${s.id}/cashier`}
                      className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      title="แคชเชียร์คิดเงิน"
                    >
                      <ReceiptText className="w-3.5 h-3.5" />
                      <span>แคชเชียร์</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Interactive Customer Simulator */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/80 border border-slate-700/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 mb-2">
                <QrCode className="w-3.5 h-3.5" />
                <span>จำลองการสแกนสั่งอาหารฝั่งลูกค้า (Customer QR Simulator)</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ทดสอบประสบการณ์ลูกค้าสั่งอาหารผ่านมือถือ</h3>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                คลิกปุ่มด้านล่างเพื่อเปิดหน้าจอมือถือของลูกค้าจำลอง โดยระบบจะระบุเป็น <strong>โต๊ะ 1-A</strong> หรือ <strong>โต๊ะ B2-A</strong> ทันที
                คุณสามารถทดลองสั่งอาหาร ตรวจสอบยอดแยกคน และติดตามอาหารปรุงเสร็จได้แบบเรียลไทม์
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/order/demo-alacarte/tbl_1/sess_alc_1"
                target="_blank"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-semibold transition"
              >
                <span>ทดสอบโต๊ะตามสั่ง (โต๊ะ 1-A)</span>
                <ExternalLink className="w-4 h-4" />
              </Link>

              <Link
                href="/order/demo-buffet/tbl_b2/sess_buf_2"
                target="_blank"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold transition"
              >
                <span>ทดสอบโต๊ะบุฟเฟ่ต์ (โต๊ะ B2-A)</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 text-center text-xs text-slate-400">
        <p>© 2026 ร้านขายดี สั่ง QR Code - SaaS Restaurant Management & Ordering Platform</p>
      </footer>
    </div>
  );
}
