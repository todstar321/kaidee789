'use client';

import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { Invoice, Expense } from '@/lib/types';
import { formatMoney, formatThaiDate, formatThaiTime } from '@/lib/utils';

export default function AccountingPage({ params }: { params: { storeId: string } }) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Add Expense
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'วัตถุดิบ/ของสด',
    title: '',
    amount: '',
    notes: '',
  });

  const fetchAccounting = async () => {
    try {
      const res = await fetch(`/api/accounting?store_id=${params.storeId}&date=${selectedDate}`);
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setInvoices(data.invoices || []);
        setExpenses(data.expenses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounting();
  }, [params.storeId, selectedDate]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) return;

    try {
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          date: selectedDate,
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
        fetchAccounting();
      } else {
        alert(data.error || 'ลบรายการไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการลบรายการ');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-rose-600" />
            <span>บัญชีสรุปรายรับ-รายจ่าย & กำไรสุทธิ (Daily Profit & Accounting)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            สรุปยอดขาย คำนวณต้นทุนอาหารจากวัตถุดิบ บันทึกค่าใช้จ่ายประจำวัน และคำนวณกำไรสุทธิ
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* 5 Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* 1. Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>ยอดขายรวม</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {formatMoney(summary?.total_revenue || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary?.invoice_count || 0} บิลที่เช็กแล้ว
          </div>
        </div>

        {/* 2. COGS (Cost of goods sold) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>ต้นทุนอาหาร (COGS)</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-extrabold text-rose-600">
            {formatMoney(summary?.total_cogs || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">คำนวณจากราคาต้นทุน</div>
        </div>

        {/* 3. Gross Profit */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>กำไรขั้นต้น</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-blue-600">
            {formatMoney(summary?.gross_profit || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ยอดขาย - ต้นทุนอาหาร</div>
        </div>

        {/* 4. Expenses */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>รายจ่ายประจำวัน</span>
            <Receipt className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-600">
            {formatMoney(summary?.total_expenses || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ของสด แก๊ส ค่าแรง ฯลฯ</div>
        </div>

        {/* 5. Net Profit (Highlighted) */}
        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>กำไรสุทธิประจำวัน</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black ${
            (summary?.net_profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {formatMoney(summary?.net_profit || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">หักรายจ่ายทุกอย่างแล้ว</div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">เงินสด (Cash):</span>
          </div>
          <span className="font-extrabold text-slate-900">{formatMoney(summary?.payment_breakdown?.cash || 0)}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">สแกน PromptPay:</span>
          </div>
          <span className="font-extrabold text-slate-900">{formatMoney(summary?.payment_breakdown?.promptpay || 0)}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-slate-700">บัตรเครดิต:</span>
          </div>
          <span className="font-extrabold text-slate-900">{formatMoney(summary?.payment_breakdown?.card || 0)}</span>
        </div>
      </div>

      {/* 2-Section Content: Daily Invoices & Daily Expenses Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Invoices of the Day */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>ประวัติบิลที่ชำระแล้ว ({invoices.length} บิล)</span>
            </h3>

            {invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                ยังไม่มีการปิดบิลในวันที่ {formatThaiDate(selectedDate)}
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{inv.table_number}</span>
                        <span className="text-[11px] text-slate-400">({inv.id})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        เวลา: {formatThaiTime(inv.paid_at)} | ช่องทาง: <strong className="uppercase text-slate-700">{inv.payment_method}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-slate-900 text-sm">{formatMoney(inv.grand_total)}</div>
                      {inv.discount_amount > 0 && (
                        <span className="text-[10px] text-rose-500">ส่วนลด -{formatMoney(inv.discount_amount)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Daily Expenses Log (โปรแกรมบันทึกรายจ่าย) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>สมุดบันทึกรายจ่ายประจำวัน ({expenses.length} รายการ)</span>
              </h3>

              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>บันทึกรายจ่าย</span>
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                ยังไม่มีการบันทึกรายจ่ายในวันที่ {formatThaiDate(selectedDate)}
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {expenses.map((exp) => (
                  <div key={exp.id} className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{exp.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          {exp.category}
                        </span>
                      </div>
                      {exp.notes && <div className="text-[11px] text-slate-500 mt-0.5">{exp.notes}</div>}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-rose-600 text-sm">-{formatMoney(exp.amount)}</span>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
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
      </div>

      {/* MODAL: ADD EXPENSE */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-base mb-1">บันทึกรายจ่ายประจำวัน</h3>
            <p className="text-[11px] text-slate-500 mb-3">บันทึกค่าใช้จ่ายเพื่อนำไปหักคำนวณกำไรสุทธิ</p>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/30"
                >
                  บันทึกรายจ่าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
