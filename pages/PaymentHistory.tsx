
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Search, History, Calendar, Banknote, Landmark, Clock, 
  Trash2, Download, FileText, AlertTriangle
} from 'lucide-react';
import { UserRole } from '../types';

export const PaymentHistory: React.FC = () => {
  const { members, currentUser, deleteTransaction } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // Get all transactions flattened, with member details
  const allTransactions = useMemo(() => {
    let txs = members.flatMap(member => 
      (member.transactions || []).map(tx => ({
        ...tx,
        memberName: member.name,
        memberCode: member.memberCode,
        memberId: member.id
      }))
    );

    // If member role, filter to only their own transactions
    if (currentUser?.role === UserRole.MEMBER) {
      txs = txs.filter(tx => tx.memberId === currentUser.memberId);
    }

    return txs.sort((a, b) => b.timestamp - a.timestamp);
  }, [members, currentUser]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const matchesSearch = 
        tx.memberName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        tx.memberCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDate = 
        (!dateFilter.start || tx.date >= dateFilter.start) &&
        (!dateFilter.end || tx.date <= dateFilter.end);

      return matchesSearch && matchesDate;
    });
  }, [allTransactions, searchTerm, dateFilter]);

  const handleDelete = async (txId: string, mId: string, memberName: string, amount: number) => {
    if (confirm(`⚠️ ยืนยันการลบรายการชำระเงินของ "${memberName}" ยอดเงิน ${amount.toLocaleString()} ฿ ใช่หรือไม่?\n\n*ระบบจะทำการคืนยอดหนี้ให้กับสมาชิกโดยอัตโนมัติ*`)) {
      await deleteTransaction(txId, mId);
    }
  };

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-teal-50 rounded-2xl text-teal-600">
            <History className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">ประวัติการเงิน</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Payment Transaction Logs</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">จำนวนรายการ</p>
          <p className="text-2xl font-black text-slate-800">{filteredTransactions.length}</p>
        </div>
        <div className="bg-[#064e3b] rounded-3xl p-6 text-white shadow-lg text-center">
          <p className="text-[10px] font-black text-teal-300 uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
          <p className="text-2xl font-black">
            {formatTHB(filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0))}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        {currentUser?.role === UserRole.STAFF && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหาสมาชิก..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-1 gap-2 w-full">
          <div className="relative flex-1">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
              type="date" 
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
             />
          </div>
          <div className="flex items-center text-slate-300 text-xs font-black px-2">TO</div>
          <div className="relative flex-1">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
              type="date" 
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
             />
          </div>
        </div>
        <button className="p-3 bg-slate-50 text-slate-400 hover:text-teal-600 rounded-xl transition-all border border-slate-100">
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-8 py-5">วันที่ / เวลา</th>
                {currentUser?.role === UserRole.STAFF && <th className="px-8 py-5">สมาชิก</th>}
                <th className="px-8 py-5">รายละเอียด</th>
                <th className="px-8 py-5">วิธีชำระ</th>
                <th className="px-8 py-5 text-right">ยอดชำระ</th>
                {currentUser?.role === UserRole.STAFF && <th className="px-8 py-5 text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map(tx => {
                const breakdown = [];
                if (tx.housing > 0) breakdown.push('บ้าน');
                if (tx.land > 0) breakdown.push('ดิน');
                if (tx.shares > 0) breakdown.push('หุ้น');
                if (tx.savings > 0) breakdown.push('ออม');
                if (tx.welfare > 0) breakdown.push('สวัสดิการ');
                if (tx.generalLoan > 0) breakdown.push('สินเชื่อ');
                if (tx.insurance > 0) breakdown.push('ประกัน');
                if (tx.donation > 0) breakdown.push('บริจาค');

                return (
                  <tr key={tx.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-700">
                        {new Date(tx.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-300 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(tx.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    {currentUser?.role === UserRole.STAFF && (
                      <td className="px-8 py-5">
                        <div className="font-black text-slate-800">{tx.memberName}</div>
                        <div className="text-[10px] text-teal-600 font-bold uppercase">{tx.memberCode}</div>
                      </td>
                    )}
                    <td className="px-8 py-5">
                       <div className="flex flex-wrap gap-1">
                          {breakdown.map(b => (
                            <span key={b} className="bg-teal-50 text-teal-700 text-[9px] px-2 py-0.5 rounded-md border border-teal-100 font-black uppercase">
                              {b}
                            </span>
                          ))}
                          {breakdown.length === 0 && <span className="text-slate-300 italic text-xs">เบ็ดเตล็ด</span>}
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className={`flex items-center gap-2 text-[10px] font-black ${tx.paymentMethod === 'transfer' ? 'text-blue-600' : 'text-slate-500'}`}>
                          {tx.paymentMethod === 'transfer' ? <Landmark className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                          {tx.paymentMethod === 'transfer' ? 'เงินโอน' : 'เงินสด'}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="text-lg font-black text-slate-800">
                          {tx.totalAmount.toLocaleString()} ฿
                       </div>
                       <div className="text-[9px] text-slate-300 uppercase font-bold tracking-tighter">โดย {tx.recordedBy}</div>
                    </td>
                    {currentUser?.role === UserRole.STAFF && (
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center">
                           <button 
                             onClick={() => handleDelete(tx.id, tx.memberId, tx.memberName, tx.totalAmount)}
                             className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                             title="ลบรายการและคืนยอดหนี้"
                           >
                              <Trash2 className="w-5 h-5" />
                           </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={currentUser?.role === UserRole.STAFF ? 6 : 4} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <FileText className="w-16 h-16 mb-4 opacity-10" />
                      <p className="font-black">ไม่พบประวัติการชำระเงินในช่วงเวลานี้</p>
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
