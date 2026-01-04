
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Plus, Search, TrendingUp, TrendingDown, Wallet, Banknote, 
  Landmark, Filter, Calendar, Trash2, Edit2, CheckCircle2,
  ChevronDown, ChevronUp, FileText, Info, Sparkles
} from 'lucide-react';
import { LedgerTransaction, TransactionType, PaymentMethod } from '../types';

const CATEGORIES = {
  income: ['รายได้', 'รายได้น้ำประปา', 'ขายสินค้า', 'ค่าบริการ', 'อื่นๆ'],
  expense: [
    'เบี้ยประชุม', 'ค่าน้ำมัน', 'ค่าเช่า', 'ค่าน้ำ', 'ค่าไฟ', 
    'ค่าอินเทอร์เน็ต', 'ค่าเดินทาง', 'ค่าวัสดุ', 'ค่าแรง', 
    'ค่าจ้างพนักงาน', 'อื่นๆ'
  ]
};

export const FinancialTracker: React.FC = () => {
  const { ledger, addLedgerItem, deleteLedgerItem, currentUser } = useStore();
  
  // States
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: new Date().toISOString().split('T')[0] });

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'income' as TransactionType,
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'cash' as PaymentMethod,
    note: ''
  });

  // Calculations
  const filteredLedger = useMemo(() => {
    return ledger.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesDate = (!dateRange.start || item.date >= dateRange.start) && 
                          (!dateRange.end || item.date <= dateRange.end);
      return matchesSearch && matchesType && matchesDate;
    });
  }, [ledger, searchTerm, filterType, dateRange]);

  const summary = useMemo(() => {
    return filteredLedger.reduce((acc, item) => {
      if (item.type === 'income') {
        acc.income += item.amount;
        if (item.paymentMethod === 'cash') acc.cashIncome += item.amount;
        else acc.transferIncome += item.amount;
      } else {
        acc.expense += item.amount;
        if (item.paymentMethod === 'cash') acc.cashExpense += item.amount;
        else acc.transferExpense += item.amount;
      }
      return acc;
    }, { income: 0, expense: 0, cashIncome: 0, transferIncome: 0, cashExpense: 0, transferExpense: 0 });
  }, [filteredLedger]);

  const netProfit = summary.income - summary.expense;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) return;
    
    const success = await addLedgerItem({
      date: formData.date,
      type: formData.type,
      category: formData.category,
      description: formData.description || formData.category,
      amount: Number(formData.amount),
      paymentMethod: formData.paymentMethod,
      recordedBy: currentUser?.name || 'Admin',
      note: formData.note
    });

    if (success) {
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        category: '',
        description: '',
        amount: '',
        paymentMethod: 'cash',
        note: ''
      });
    }
  };

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Helper Persona Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 p-6 rounded-[2rem] text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
            <Sparkles className="w-8 h-8 text-yellow-300" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">ผู้ช่วยอัจฉริยะด้านการเงิน</h2>
            <p className="text-teal-100 text-xs font-bold opacity-80 uppercase tracking-widest mt-0.5">Financial Smart Assistant</p>
          </div>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">ยินดีต้อนรับ</p>
          <p className="font-bold">{currentUser?.name}</p>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
          title="รายรับรวม" 
          value={formatTHB(summary.income)} 
          subText={`เงินสด: ${formatTHB(summary.cashIncome)} | โอน: ${formatTHB(summary.transferIncome)}`}
          icon={<TrendingUp className="w-6 h-6" />}
          colorClass="bg-emerald-50 text-emerald-700 border-emerald-100"
        />
        <SummaryCard 
          title="รายจ่ายรวม" 
          value={formatTHB(summary.expense)} 
          subText={`เงินสด: ${formatTHB(summary.cashExpense)} | โอน: ${formatTHB(summary.transferExpense)}`}
          icon={<TrendingDown className="w-6 h-6" />}
          colorClass="bg-red-50 text-red-700 border-red-100"
        />
        <SummaryCard 
          title="กำไร/คงเหลือสุทธิ" 
          value={formatTHB(netProfit)} 
          subText="รายรับ - รายจ่าย"
          icon={<Wallet className="w-6 h-6" />}
          colorClass={netProfit >= 0 ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100"}
        />
      </div>

      {/* Main Actions & Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหารายการ..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">ทุกประเภท</option>
            <option value="income">เฉพาะรายรับ</option>
            <option value="expense">เฉพาะรายจ่าย</option>
          </select>
        </div>

        <button 
          onClick={() => setShowForm(!showForm)}
          className="w-full lg:w-auto flex items-center justify-center gap-2 bg-[#064e3b] text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-teal-900/10 hover:bg-black transition-all active:scale-95"
        >
          {showForm ? <ChevronUp className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? "ปิดแบบฟอร์ม" : "บันทึกรายการใหม่"}
        </button>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="bg-white rounded-3xl shadow-xl border border-teal-100 overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className={`px-6 py-4 flex items-center gap-2 border-b ${formData.type === 'income' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <Plus className={`w-5 h-5 ${formData.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`} />
            <h3 className={`font-black uppercase tracking-widest text-sm ${formData.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>
              บันทึก {formData.type === 'income' ? 'รายรับ' : 'รายจ่าย'} ใหม่
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">วันที่</label>
              <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">ประเภท</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button type="button" onClick={() => setFormData({...formData, type: 'income', category: ''})} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${formData.type === 'income' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500'}`}>รายรับ</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'expense', category: ''})} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${formData.type === 'expense' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500'}`}>รายจ่าย</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">หมวดหมู่</label>
              <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold">
                <option value="">-- เลือกหมวดหมู่ --</option>
                {CATEGORIES[formData.type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">รายละเอียดเพิ่มเติม</label>
              <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="ระบุรายละเอียดรายการ..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">จำนวนเงิน (บาท)</label>
              <input type="number" required min="0.01" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-black text-teal-700 text-xl" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">วิธีชำระเงิน</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'cash'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-2 ${formData.paymentMethod === 'cash' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><Banknote className="w-3 h-3" /> เงินสด</button>
                <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'transfer'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-2 ${formData.paymentMethod === 'transfer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Landmark className="w-3 h-3" /> เงินโอน</button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">หมายเหตุ</label>
              <input type="text" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} placeholder="ข้อมูลเพิ่มเติมสำหรับอ้างอิง..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>

            <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t border-slate-50">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl text-slate-400 font-bold hover:bg-slate-50 transition-all">ยกเลิก</button>
              <button type="submit" className="px-12 py-3 bg-teal-600 text-white rounded-xl font-black shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all active:scale-95">บันทึกรายการ</button>
            </div>
          </form>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-800">ประวัติรายการ</h3>
          <span className="text-xs font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            {filteredLedger.length} รายการที่พบ
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">วันที่</th>
                <th className="px-8 py-5">รายการ / หมวดหมู่</th>
                <th className="px-8 py-5">วิธีชำระ</th>
                <th className="px-8 py-5 text-right">จำนวนเงิน</th>
                <th className="px-8 py-5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLedger.map(item => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-4">
                    <div className="font-bold text-slate-700">{new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</div>
                    <div className="text-[10px] text-slate-300 font-mono tracking-tighter">{new Date(item.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="font-black text-slate-800 leading-tight">{item.description}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${item.type === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {item.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">{item.category}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className={`flex items-center gap-2 font-bold text-xs ${item.paymentMethod === 'transfer' ? 'text-blue-600' : 'text-slate-500'}`}>
                      {item.paymentMethod === 'transfer' ? <Landmark className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                      {item.paymentMethod === 'transfer' ? 'เงินโอน' : 'เงินสด'}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className={`text-lg font-black ${item.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString()} ฿
                    </div>
                    {item.note && <div className="text-[10px] text-slate-400 italic font-medium">{item.note}</div>}
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center justify-center gap-2">
                       <button onClick={() => { if(confirm('ลบรายการนี้ใช่หรือไม่?')) deleteLedgerItem(item.id); }} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <FileText className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-black">ไม่พบข้อมูลรายการ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; value: string; subText: string; icon: React.ReactNode; colorClass: string }> = ({ title, value, subText, icon, colorClass }) => (
  <div className={`p-6 rounded-[2rem] border shadow-sm ${colorClass} transition-transform hover:-translate-y-1`}>
    <div className="flex justify-between items-start mb-4">
      <p className="text-xs font-black uppercase tracking-widest opacity-70">{title}</p>
      <div className="p-2.5 bg-white/50 rounded-xl shadow-inner">{icon}</div>
    </div>
    <h3 className="text-3xl font-black tracking-tighter mb-1">{value}</h3>
    <p className="text-[10px] font-bold opacity-60 flex items-center gap-1">
      <Info className="w-3 h-3" /> {subText}
    </p>
  </div>
);
