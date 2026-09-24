'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Sparkles,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Edit2,
  Trash2,
  X,
  Check,
  Crown,
  Award,
  RefreshCw,
  Clock,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Member, Invoice } from '@/lib/types';
import { formatMoney, formatThaiDate, formatThaiTime } from '@/lib/utils';

interface MemberWithStats extends Member {
  total_visits: number;
  total_spent: number;
  last_visit?: string;
  month_visits: number;
  month_spent: number;
}

interface SummaryData {
  total_members: number;
  total_month_revenue: number;
  top_frequent: MemberWithStats | null;
  top_spender: MemberWithStats | null;
}

export default function CustomersPage({ params }: { params: { storeId: string } }) {
  const [members, setMembers] = useState<MemberWithStats[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'frequent' | 'spent' | 'newest' | 'points'>('frequent');

  // Month selection (e.g. "2026-09")
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Month options (last 6 months)
  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = d.toISOString().substring(0, 7);
      const label = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      list.push({ value: val, label });
    }
    return list;
  }, []);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberWithStats | null>(null);
  const [viewHistoryMember, setViewHistoryMember] = useState<MemberWithStats | null>(null);
  const [memberInvoices, setMemberInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    phone: '',
    points: 0,
    notes: '',
  });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/members/stats?store_id=${params.storeId}&month=${selectedMonth}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();
      if (Array.isArray(data.members)) {
        setMembers(data.members);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [params.storeId, selectedMonth]);

  // Load invoices when viewing history modal
  const handleOpenHistory = async (m: MemberWithStats) => {
    setViewHistoryMember(m);
    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/members/stats?store_id=${params.storeId}&member_id=${m.id}&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      setMemberInvoices(data.invoices || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (m: MemberWithStats) => {
    setEditingMember(m);
    setFormData({
      name: m.name,
      nickname: m.nickname || '',
      phone: m.phone,
      points: m.points || 0,
      notes: m.notes || '',
    });
  };

  // Save Add
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          name: formData.name.trim(),
          nickname: formData.nickname.trim() || null,
          phone: formData.phone.trim(),
          points: Number(formData.points) || 0,
          notes: formData.notes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ บันทึกลงทะเบียนลูกค้าใหม่เรียบร้อยแล้ว');
        setShowAddModal(false);
        setFormData({ name: '', nickname: '', phone: '', points: 0, notes: '' });
        await fetchMembers();
      } else {
        alert(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !formData.name.trim() || !formData.phone.trim()) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          store_id: params.storeId,
          name: formData.name.trim(),
          nickname: formData.nickname.trim() || null,
          phone: formData.phone.trim(),
          points: Number(formData.points) || 0,
          notes: formData.notes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ บันทึกการแก้ไขข้อมูลลูกค้าสำเร็จเรียบร้อย');
        setEditingMember(null);
        await fetchMembers();
      } else {
        alert(data.error || 'ไม่สามารถบันทึกการแก้ไขได้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Delete Member
  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบข้อมูลลูกค้า "${name}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/members?id=${encodeURIComponent(id)}&store_id=${params.storeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ลบข้อมูลลูกค้า "${name}" เรียบร้อยแล้ว`);
        setMembers(prev => prev.filter(m => m.id !== id));
        await fetchMembers();
      } else {
        alert(data.error || 'ไม่สามารถลบได้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลลูกค้า');
    }
  };

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        m.phone.includes(q) ||
        (m.notes && m.notes.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'frequent') {
      result.sort((a, b) => b.month_visits - a.month_visits || b.total_visits - a.total_visits);
    } else if (sortBy === 'spent') {
      result.sort((a, b) => b.month_spent - a.month_spent || b.total_spent - a.total_spent);
    } else if (sortBy === 'points') {
      result.sort((a, b) => (b.points || 0) - (a.points || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [members, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              ข้อมูลลูกค้า & สมาชิก (Customer CRM)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ดูสถิติว่าในแต่ละเดือนลูกค้าคนไหนมากินบ่อยที่สุด กินไปกี่ครั้ง และมียอดรวมเท่าไร
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
            <Calendar className="w-4 h-4 text-amber-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFormData({ name: '', nickname: '', phone: '', points: 0, notes: '' });
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>ลงทะเบียนลูกค้าใหม่</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Members */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">สมาชิกทั้งหมดในระบบ</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {summary?.total_members || members.length} <span className="text-sm font-semibold text-slate-500">คน</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">ฐานข้อมูลลูกค้าประจำของร้าน</div>
        </div>

        {/* Card 2: Top Frequent Visitor */}
        <div className="bg-white p-5 rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">🥇 มากินบ่อยสุดในเดือนนี้</span>
            <span className="p-2 rounded-xl bg-amber-100 text-amber-600">
              <Crown className="w-4 h-4" />
            </span>
          </div>
          {summary?.top_frequent ? (
            <div>
              <div className="mt-2 font-black text-slate-900 text-lg flex items-baseline gap-1">
                <span>คุณ{summary.top_frequent.name}</span>
                {summary.top_frequent.nickname && (
                  <span className="text-xs font-bold text-amber-700">({summary.top_frequent.nickname})</span>
                )}
              </div>
              <div className="text-sm font-black text-amber-600 mt-0.5">
                มาทาน {summary.top_frequent.month_visits} ครั้ง
                <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                  (ยอดรวม ฿{formatMoney(summary.top_frequent.month_spent)})
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400 italic">ยังไม่มีข้อมูลในเดือนนี้</div>
          )}
        </div>

        {/* Card 3: Top Spender */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">💎 ยอดใช้จ่ายสูงสุดในเดือนนี้</span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          {summary?.top_spender ? (
            <div>
              <div className="mt-2 font-black text-slate-900 text-lg flex items-baseline gap-1">
                <span>คุณ{summary.top_spender.name}</span>
                {summary.top_spender.nickname && (
                  <span className="text-xs font-bold text-emerald-700">({summary.top_spender.nickname})</span>
                )}
              </div>
              <div className="text-sm font-black text-emerald-600 mt-0.5">
                ฿{formatMoney(summary.top_spender.month_spent)}
                <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                  ({summary.top_spender.month_visits} ครั้ง)
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400 italic">ยังไม่มีข้อมูลในเดือนนี้</div>
          )}
        </div>

        {/* Card 4: Total Member Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">ยอดขายจากสมาชิกเดือนนี้</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-700">
            ฿{formatMoney(summary?.total_month_revenue || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">จากลูกค้าที่ระบุเป็นสมาชิก</div>
        </div>
      </div>

      {/* Search, Filter & Member List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า, ชื่อเล่น หรือเบอร์โทรศัพท์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold">เรียงตาม:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-1.5 px-2.5 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="frequent">🔥 มาทานบ่อยสุด (เดือนนี้)</option>
                <option value="spent">💰 ยอดใช้จ่ายสูงสุด (เดือนนี้)</option>
                <option value="points">⭐ แต้มสะสมมากสุด</option>
                <option value="newest">🕒 สมัครล่าสุด</option>
              </select>
            </div>

            <button
              onClick={fetchMembers}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Member Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">ชื่อลูกค้า / ชื่อเล่น</th>
                <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                <th className="py-3 px-4 text-center">แต้มสะสม</th>
                <th className="py-3 px-4 text-right bg-amber-50/40 text-amber-900">
                  สถิติเดือนนี้ ({monthOptions.find(o => o.value === selectedMonth)?.label})
                </th>
                <th className="py-3 px-4 text-right">ยอดรวมตลอดกาล</th>
                <th className="py-3 px-4">มาทานล่าสุด</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div>ไม่พบข้อมูลลูกค้า</div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* Name & Nickname */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center flex-shrink-0">
                          {m.nickname ? m.nickname.substring(0, 1) : m.name.substring(0, 1)}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>คุณ{m.name}</span>
                            {m.nickname && (
                              <span className="text-amber-700 font-bold text-xs">
                                ({m.nickname})
                              </span>
                            )}
                          </div>
                          {m.notes && (
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {m.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {m.phone}
                    </td>

                    {/* Points */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                        {m.points || 0} แต้ม
                      </span>
                    </td>

                    {/* Selected Month Stats */}
                    <td className="py-3.5 px-4 text-right bg-amber-50/30">
                      <div className="font-black text-slate-900">
                        มา {m.month_visits} ครั้ง
                      </div>
                      <div className="text-xs font-bold text-amber-700">
                        ฿{formatMoney(m.month_spent)}
                      </div>
                    </td>

                    {/* Lifetime Stats */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-700">
                        {m.total_visits} ครั้ง
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        ฿{formatMoney(m.total_spent)}
                      </div>
                    </td>

                    {/* Last Visit */}
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {m.last_visit ? (
                        <div>
                          <div className="font-medium text-slate-800">{formatThaiDate(m.last_visit)}</div>
                          <div className="text-[10px] text-slate-400">{formatThaiTime(m.last_visit)} น.</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(m)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          title="ดูประวัติบิลการทาน"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                          title="แก้ไขข้อมูลลูกค้า"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="ลบข้อมูล"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD NEW CUSTOMER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span>ลงทะเบียนลูกค้าใหม่</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    placeholder="เช่น พี่ต้น"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                <input
                  type="tel"
                  required
                  placeholder="08X-XXX-XXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">แต้มสะสมเริ่มต้น</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุ / ข้อมูลที่ควรระวัง</label>
                <textarea
                  rows={2}
                  placeholder="เช่น ไม่ทานเผ็ด, แพ้อาหารทะเล, ชอบนั่งริมหน้าต่าง"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/20"
                >
                  บันทึกลงทะเบียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CUSTOMER */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-600" />
                <span>แก้ไขข้อมูลลูกค้า</span>
              </h3>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">แต้มสะสม</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุ / ข้อมูลที่ควรระวัง</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/20"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW VISIT & INVOICE HISTORY */}
      {viewHistoryMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <span>ประวัติการมาทาน: คุณ{viewHistoryMember.name}</span>
                  {viewHistoryMember.nickname && (
                    <span className="text-amber-700 font-bold">({viewHistoryMember.nickname})</span>
                  )}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  เบอร์: {viewHistoryMember.phone} | รวม {viewHistoryMember.total_visits} ครั้ง | ยอดเงินรวม ฿{formatMoney(viewHistoryMember.total_spent)}
                </div>
              </div>
              <button onClick={() => setViewHistoryMember(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2 text-xs">
              {loadingInvoices ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <div>กำลังโหลดประวัติบิล...</div>
                </div>
              ) : memberInvoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  ยังไม่มีประวัติการเช็กบิลของลูกค้ารายนี้
                </div>
              ) : (
                memberInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:bg-slate-100/60 transition"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <span>{inv.table_number || 'โต๊ะ'}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          #{inv.id}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                        <span>🕒 {formatThaiDate(inv.paid_at)} {formatThaiTime(inv.paid_at)} น.</span>
                        <span>• ชำระด้วย {inv.payment_method?.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-slate-900 text-base">
                        ฿{formatMoney(inv.grand_total)}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ชำระแล้ว
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewHistoryMember(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
