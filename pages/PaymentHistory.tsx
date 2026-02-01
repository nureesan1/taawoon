
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Search, Calendar, Banknote, Landmark, Clock, 
  Trash2, Download, FileText
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

    /** 
     * CRITICAL: Sort by timestamp descending (Newest first)
     * "เรียงวันนี้ให้วันที่ล่าสุดอยู่ข้างบน วันที่เก่าอยู่ข้างล่าง"
     */
    return txs.sort((a, b) => {
      // Prioritize timestamp for precise sorting including time
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
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

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(num);

  const formatThaiDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const year = (d.getFullYear() + 543).toString().slice(-2);
    return `${d.getDate()} ${months[d.getMonth()]} ${year}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header & Date Display */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">ประวัติการชำระเงิน</h2>
        <div className="bg-white px-4 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
          {new Date().toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* Filter Bar - Matches Screenshot style */}
      <div className="bg-slate-100/50 p-6 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm print:hidden">
        <div className="relative flex-1 w-full">
          <input 
            type="text" 
            placeholder="ค้นหาสมาชิก..." 
            className="w-full pl-6 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-sm shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-1 gap-2 w-full">
          <div className="relative flex-1">
             <input 
              type="date" 
              className="w-full px-6 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold shadow-inner"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
             />
          </div>
          <div className="flex items-center text-slate-400 text-[10px] font-black px-1">TO</div>
          <div className="relative flex-1">
             <input 
              type="date" 
              className="w-full px-6 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-xs font-bold shadow-inner"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
             />
          </div>
        </div>
        <button className="p-3 bg-white text-slate-400 hover:text-teal-600 rounded-2xl transition-all border border-slate-200 shadow-sm">
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Transaction Table with Blue Border highlight per screenshot */}
      <div className="bg-white rounded-[2rem] shadow-sm border-2 border-blue-400 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-8 py-6">วันที่ / เวลา</th>
                {currentUser?.role === UserRole.STAFF && <th className="px-8 py-6">สมาชิก</th>}
                <th className="px-8 py-6">รายละเอียด</th>
                <th className="px-8 py-6">วิธีชำระ</th>
                <th className="px-8 py-6 text-right">ยอดชำระ</th>
                {currentUser?.role === UserRole.STAFF && <th className="px-8 py-6 text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map(tx => {
                const breakdown = [];
                if (tx.housing > 0) breakdown.push('บ้าน');
                if (tx.land > 0) breakdown.push('ที่ดิน');
                if (tx.shares > 0) breakdown.push('หุ้น');
                if (tx.savings > 0) breakdown.push('ออม');
                if (tx.welfare > 0) breakdown.push('สวัสดิการ');
                if (tx.generalLoan > 0) breakdown.push('สินเชื่อ');
                if (tx.insurance > 0) breakdown.push('ประกัน');
                if (tx.donation > 0) breakdown.push('บริจาค');

                return (
                  <tr key={tx.id} className="group hover:bg-slate-50/50 transition-all h-24">
                    <td className="px-8 py-4">
                      <div className="font-bold text-slate-700 text-base">
                        {formatThaiDate(tx.date)}
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center gap-1 font-mono mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(tx.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    {currentUser?.role === UserRole.STAFF && (
                      <td className="px-8 py-4">
                        <div className="font-black text-slate-800 text-base">{tx.memberName}</div>
                        <div className="text-xs text-blue-500 font-black uppercase mt-0.5 tracking-tight">{tx.memberCode}</div>
                      </td>
                    )}
                    <td className="px-8 py-4">
                       <div className="flex flex-wrap gap-1">
                          {breakdown.length > 0 ? (
                            breakdown.map((b, i) => (
                              <span key={b} className="text-slate-400 text-xs font-medium italic">
                                {b}{i < breakdown.length - 1 ? ',' : ''}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-xs">เบ็ดเตล็ด</span>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-4">
                       <div className={`flex items-center gap-2 text-sm font-bold ${tx.paymentMethod === 'transfer' ? 'text-blue-500' : 'text-slate-500'}`}>
                          {tx.paymentMethod === 'transfer' ? <Landmark className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                          {tx.paymentMethod === 'transfer' ? 'เงินโอน' : 'เงินสด'}
                       </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <div className="text-xl font-black text-slate-800">
                          {formatTHB(tx.totalAmount)} ฿
                       </div>
                       <div className="text-[10px] text-slate-300 font-bold mt-0.5">โดย</div>
                    </td>
                    {currentUser?.role === UserRole.STAFF && (
                      <td className="px-8 py-4">
                        <div className="flex items-center justify-center">
                           <button 
                             onClick={() => handleDelete(tx.id, tx.memberId, tx.memberName, tx.totalAmount)}
                             className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
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
                      <p className="font-black">ไม่พบประวัติการชำระเงิน</p>
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
