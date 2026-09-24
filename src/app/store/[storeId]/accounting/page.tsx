'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  DollarSign,
  TrendingUp,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  QrCode,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingBag,
  Sparkles,
  Printer,
  ChevronRight,
  Search,
  CheckCircle,
  Clock,
  Layers,
  BarChart3,
  Filter
} from 'lucide-react';
import { Invoice, Expense, Store } from '@/lib/types';
import { formatMoney, formatThaiDate, formatThaiTime } from '@/lib/utils';
import { printReceiptHtml, renderAccountingReportHtml } from '@/lib/print';

export default function AccountingPage({ params }: { params: { storeId: string } }) {
  const [store, setStore] = useState<Store | null>(null);

  // 3 Modes: 'daily' | 'monthly' | 'range'
  const [reportMode, setReportMode] = useState<'daily' | 'monthly' | 'range'>('daily');

  // Filter States
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  
  // Custom range default: start of this month to today
  const [startDate, setStartDate] = useState<string>(`${currentMonthStr}-01`);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [summary, setSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyBreakdown, setDailyBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search invoice
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // 12 Months selection options
  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = d.toISOString().substring(0, 7);
      const label = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      list.push({ value: val, label });
    }
    return list;
  }, []);

  // Modal Add Expense
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'วัตถุดิบ/ของสด',
    title: '',
    amount: '',
    notes: '',
  });

  // Fetch store info
  useEffect(() => {
    fetch(`/api/stores/${params.storeId}`)
      .then(r => r.json())
      .then(d => { if (d.id) setStore(d); })
      .catch(console.error);
  }, [params.storeId]);

  const fetchAccounting = async () => {
    setLoading(true);
    try {
      let queryUrl = `/api/accounting?store_id=${params.storeId}&mode=${reportMode}&_t=${Date.now()}`;
      if (reportMode === 'daily') {
        queryUrl += `&date=${selectedDate}`;
      } else if (reportMode === 'monthly') {
        queryUrl += `&month=${selectedMonth}`;
      } else {
        queryUrl += `&start_date=${startDate}&end_date=${endDate}`;
      }

      const res = await fetch(queryUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setInvoices(data.invoices || []);
        setExpenses(data.expenses || []);
        setDailyBreakdown(data.daily_breakdown || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounting();
  }, [params.storeId, reportMode, selectedDate, selectedMonth, startDate, endDate]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) return;

    try {
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          date: reportMode === 'daily' ? selectedDate : todayStr,
          category: expenseForm.category,
          title: expenseForm.title,
          amount: Number(expenseForm.amount),
          notes: expenseForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddExpenseModal(false);
        setExpenseForm({
          category: 'วัตถุดิบ/ของสด',
          title: '',
          amount: '',
          notes: '',
        });
        alert('✅ บันทึกรายจ่ายเรียบร้อยแล้ว');
        fetchAccounting();
      } else {
        alert(data.error || 'บันทึกรายจ่ายไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (err.message || ''));
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('ต้องการลบรายการรายจ่ายนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/accounting?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('✅ ลบรายการรายจ่ายสำเร็จ');
        fetchAccounting();
      } else {
        alert(data.error || 'ลบรายการไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบรายการ');
    }
  };

  // Print executive report
  const handlePrintReport = () => {
    if (!summary) return;

    let title = 'สรุปยอดขายประจำวัน';
    let dateLabel = formatThaiDate(selectedDate);

    if (reportMode === 'monthly') {
      const found = monthOptions.find(m => m.value === selectedMonth);
      title = 'รายงานยอดขายประจำเดือน';
      dateLabel = found ? found.label : selectedMonth;
    } else if (reportMode === 'range') {
      title = 'รายงานยอดขายตามช่วงเวลา';
      dateLabel = `${formatThaiDate(startDate)} ถึง ${formatThaiDate(endDate)}`;
    }

    const html = renderAccountingReportHtml({
      storeName: store?.name,
      title,
      dateLabel,
      summary,
      dailyBreakdown,
      invoices,
      expenses,
    });

    printReceiptHtml(html, title, 'a4');
  };

  // Filtered invoices by search query
  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(inv =>
      (inv.table_number && inv.table_number.toLowerCase().includes(q)) ||
      (inv.id && inv.id.toLowerCase().includes(q)) ||
      (inv.payment_method && inv.payment_method.toLowerCase().includes(q)) ||
      (inv.member_name && inv.member_name.toLowerCase().includes(q))
    );
  }, [invoices, invoiceSearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner with Print and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                บัญชีสรุปยอดขาย & กำไรสุทธิ (Sales & Financial Reports)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                สรุปยอดขาย ต้นทุนอาหาร (COGS) รายจ่าย และกำไรสุทธิ ครอบคลุมรายวัน รายเดือน และเลือกช่วงเวลาย้อนหลัง
              </p>
            </div>
          </div>
        </div>

        {/* Print Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReport}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
          >
            <Printer className="w-4 h-4 text-rose-400" />
            <span>พิมพ์รายงาน A4 (Print Report)</span>
          </button>
        </div>
      </div>

      {/* 3 Report Mode Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1.5 border border-slate-200/80">
        <button
          onClick={() => setReportMode('daily')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            reportMode === 'daily'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. สรุปยอดรายวัน (Daily)</span>
        </button>

        <button
          onClick={() => setReportMode('monthly')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            reportMode === 'monthly'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>2. รายงานยอดขายประจำเดือน (Monthly)</span>
        </button>

        <button
          onClick={() => setReportMode('range')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            reportMode === 'range'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>3. กำหนดช่วงวันที่ (Date Range)</span>
        </button>
      </div>

      {/* Filter Toolbar depending on Active Mode */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* MODE 1: DAILY FILTER */}
        {reportMode === 'daily' && (
          <div className="flex flex-wrap items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">เลือกวันที่เรียกดู:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 text-[11px]">ทางลัด:</span>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                  selectedDate === todayStr ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              >
                เมื่อวาน
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 2);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              >
                ย้อนหลัง 2 วัน
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: MONTHLY FILTER */}
        {reportMode === 'monthly' && (
          <div className="flex flex-wrap items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">เลือกเดือนที่ต้องการดู:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-slate-50 focus:outline-none focus:border-blue-500"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.value})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <span>หรือระบุเดือน:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-slate-300 font-bold text-slate-700 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
              📆 ข้อมูลยอดขาย & กำไรประจำเดือน {monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}
            </div>
          </div>
        )}

        {/* MODE 3: DATE RANGE FILTER */}
        {reportMode === 'range' && (
          <div className="flex flex-wrap items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">วันเริ่มต้น:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <span className="font-bold text-slate-500">ถึง</span>
              <span className="font-bold text-slate-700">วันสิ้นสุด:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick Range Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 text-[11px]">ช่วงเวลาด่วน:</span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 6);
                  setStartDate(d.toISOString().split('T')[0]);
                  setEndDate(todayStr);
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              >
                7 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 13);
                  setStartDate(d.toISOString().split('T')[0]);
                  setEndDate(todayStr);
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              >
                14 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 29);
                  setStartDate(d.toISOString().split('T')[0]);
                  setEndDate(todayStr);
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              >
                30 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate(`${currentMonthStr}-01`);
                  setEndDate(todayStr);
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              >
                เดือนนี้
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5 Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* 1. Revenue */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>ยอดขายรวม</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            ฿{formatMoney(summary?.total_revenue || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{summary?.invoice_count || 0} บิลที่เช็กแล้ว</span>
            {summary?.total_discount > 0 && (
              <span className="text-rose-500">ลด ฿{formatMoney(summary.total_discount)}</span>
            )}
          </div>
        </div>

        {/* 2. COGS (Cost of goods sold) */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>ต้นทุนอาหาร (COGS)</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-extrabold text-rose-600">
            ฿{formatMoney(summary?.total_cogs || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">คำนวณจากราคาต้นทุนเมนู</div>
        </div>

        {/* 3. Gross Profit */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>กำไรขั้นต้น (Gross)</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-blue-600">
            ฿{formatMoney(summary?.gross_profit || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ยอดขาย - ต้นทุนอาหาร</div>
        </div>

        {/* 4. Expenses */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>รายจ่ายประจำร้าน</span>
            <Receipt className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-600">
            ฿{formatMoney(summary?.total_expenses || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ของสด แก๊ส ค่าแรง ฯลฯ</div>
        </div>

        {/* 5. Net Profit (Highlighted) */}
        <div className="col-span-2 md:col-span-1 p-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>กำไรสุทธิ (Net Profit)</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black ${
            (summary?.net_profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            ฿{formatMoney(summary?.net_profit || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>หักรายจ่ายทั้งหมด</span>
            <span className="font-bold text-emerald-400">
              {summary?.profit_margin ? `${summary.profit_margin.toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">เงินสด (Cash):</span>
          </div>
          <span className="font-extrabold text-slate-900">฿{formatMoney(summary?.payment_breakdown?.cash || 0)}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">สแกน PromptPay:</span>
          </div>
          <span className="font-extrabold text-slate-900">฿{formatMoney(summary?.payment_breakdown?.promptpay || 0)}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-slate-700">บัตรเครดิต:</span>
          </div>
          <span className="font-extrabold text-slate-900">฿{formatMoney(summary?.payment_breakdown?.card || 0)}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-orange-600" />
            <span className="font-semibold text-slate-700">เฉลี่ยต่อบิล:</span>
          </div>
          <span className="font-extrabold text-slate-900">฿{formatMoney(summary?.avg_ticket || 0)}</span>
        </div>
      </div>

      {/* VIEW SECTION A: FOR MONTHLY OR RANGE - SHOW DAILY BREAKDOWN TABLE */}
      {(reportMode === 'monthly' || reportMode === 'range') && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>
                  {reportMode === 'monthly'
                    ? `ตารางสรุปยอดขายรายวัน ประจำเดือน ${monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}`
                    : `ตารางสรุปยอดขายรายวัน ช่วง ${formatThaiDate(startDate)} ถึง ${formatThaiDate(endDate)}`
                  }
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกที่ปุ่ม &quot;ดูบิลวันนี้&quot; เพื่อเปิดดูรายละเอียดบิลและรายการอาหารของวันนั้นโดยตรง
              </p>
            </div>
            <div className="text-xs font-bold text-slate-500">
              พบ {dailyBreakdown.length} วันที่มีรายการ
            </div>
          </div>

          {dailyBreakdown.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <div>ไม่พบข้อมูลยอดขายในช่วงเวลานี้</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-700 font-extrabold">
                    <th className="py-3 px-4">วันที่</th>
                    <th className="py-3 px-4 text-center">จำนวนบิล</th>
                    <th className="py-3 px-4 text-right">ยอดขายรวม</th>
                    <th className="py-3 px-4 text-right">ต้นทุน (COGS)</th>
                    <th className="py-3 px-4 text-right">รายจ่าย</th>
                    <th className="py-3 px-4 text-right">กำไรสุทธิ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyBreakdown.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatThaiDate(row.date)}
                        <span className="text-[10px] text-slate-400 ml-2 font-mono">({row.date})</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {row.invoice_count} บิล
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        ฿{formatMoney(row.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                        ฿{formatMoney(row.cogs)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-600 font-semibold">
                        ฿{formatMoney(row.expenses)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-black ${row.net_profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          ฿{formatMoney(row.net_profit)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(row.date);
                            setReportMode('daily');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <Search className="w-3 h-3" />
                          <span>ดูบิลวันนี้</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW SECTION B: INVOICES & EXPENSES (Daily View or Below Monthly/Range Tables) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Invoices List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>
                  {reportMode === 'daily'
                    ? `ประวัติบิลที่ชำระแล้ว (${invoices.length} บิล)`
                    : `รายการบิลทั้งหมด (${filteredInvoices.length} บิล)`
                  }
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {reportMode === 'daily' ? `ประจำวันที่ ${formatThaiDate(selectedDate)}` : 'ค้นหาตามเลขที่บิล หรือ โต๊ะ'}
              </p>
            </div>

            {/* Search Invoice Input for Monthly/Range */}
            {reportMode !== 'daily' && (
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาบิล/โต๊ะ..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <div>ยังไม่มีการปิดบิลในช่วงเวลานี้</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs hover:bg-slate-100/60 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{inv.table_number || 'โต๊ะ'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({inv.id})</span>
                      {inv.member_name && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                          {inv.member_name}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{formatThaiDate(inv.paid_at)}</span>
                      <span>•</span>
                      <span>{formatThaiTime(inv.paid_at)} น.</span>
                      <span>•</span>
                      <span className="uppercase font-bold text-slate-700">{inv.payment_method}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-slate-900 text-sm">฿{formatMoney(inv.grand_total)}</div>
                    {inv.discount_amount > 0 && (
                      <span className="text-[10px] text-rose-500 block">ส่วนลด -฿{formatMoney(inv.discount_amount)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Expenses Log */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>สมุดบันทึกรายจ่ายประจำร้าน ({expenses.length} รายการ)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                บันทึกค่าใช้จ่ายเพื่อนำไปหักคำนวณกำไรสุทธิ
              </p>
            </div>

            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="px-3.5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>บันทึกรายจ่าย</span>
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <div>ยังไม่มีการบันทึกรายจ่ายในช่วงเวลานี้</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {expenses.map((exp) => (
                <div key={exp.id} className="p-3 rounded-2xl bg-amber-50/40 border border-amber-200/60 flex items-center justify-between text-xs hover:bg-amber-50/70 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{exp.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                        {exp.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>วันที่: {formatThaiDate(exp.date)}</span>
                      {exp.notes && (
                        <>
                          <span>•</span>
                          <span>{exp.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-black text-rose-600 text-sm">-฿{formatMoney(exp.amount)}</span>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="text-slate-400 hover:text-red-600 p-1 transition"
                      title="ลบรายจ่าย"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD EXPENSE */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-base mb-1">บันทึกรายจ่ายประจำร้าน</h3>
            <p className="text-[11px] text-slate-500 mb-4">บันทึกค่าใช้จ่ายเพื่อนำไปหักคำนวณกำไรสุทธิ</p>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">หมวดหมู่รายจ่าย *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="วัตถุดิบ/ของสด">วัตถุดิบ / ของสดตลาด</option>
                  <option value="ค่าน้ำแข็ง/แก๊ส">ค่าน้ำแข็ง / แก๊สหุงต้ม</option>
                  <option value="ค่าแรงรายวัน">ค่าจ้างแรงงานรายวัน</option>
                  <option value="ของใช้ในร้าน">ของใช้ / บรรจุภัณฑ์ / กล่อง</option>
                  <option value="จิปาถะ">ค่าใช้จ่ายจิปาถะอื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อรายการรายจ่าย *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ซื้อกุ้งแม่น้ำและผักสดตลาดไท"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">จำนวนเงิน (บาท) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-base text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="เช่น ซื้อ 2 กิโลกรัม มีบิลแนบ"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/30 transition"
                >
                  ✓ บันทึกรายจ่าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
