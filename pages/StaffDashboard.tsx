
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Member } from '../types';
import { Search, Plus, UserPlus, DollarSign, Pencil, Trash2, Wallet, Building2, MapPin, Coins, PiggyBank, Calendar, Clock, FileText } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { EditMemberModal } from './EditMemberModal';

export const StaffDashboard: React.FC = () => {
  const { members, setView, deleteMember } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'payment' | 'edit' | null>(null);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.memberCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenPayment = (memberId: string) => {
    setSelectedMemberId(memberId);
    setModalType('payment');
  };

  const handleOpenEdit = (memberId: string) => {
    setSelectedMemberId(memberId);
    setModalType('edit');
  }

  const handleDelete = async (member: Member) => {
    if (confirm(`คุณต้องการลบสมาชิก "${member.name}" ใช่หรือไม่?\nการกระทำนี้ไม่สามารถเรียกคืนได้`)) {
       const success = await deleteMember(member.id);
    }
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedMemberId(null);
  };

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

  // Calculate Totals based on filtered view
  const totals = filteredMembers.reduce((acc, m) => ({
    housing: acc.housing + (m.housingLoanBalance || 0),
    land: acc.land + (m.landLoanBalance || 0),
    general: acc.general + (m.generalLoanBalance || 0),
    savings: acc.savings + (m.savingsBalance || 0),
    shares: acc.shares + (m.accumulatedShares || 0)
  }), { housing: 0, land: 0, general: 0, savings: 0, shares: 0 });

  // Calculate Today's Transactions
  const todayDate = new Date().toISOString().split('T')[0];
  const todayTransactions = members.flatMap(member => 
    member.transactions
      .filter(tx => tx.date === todayDate)
      .map(tx => ({
        ...tx,
        memberName: member.name,
        memberCode: member.memberCode
      }))
  ).sort((a, b) => b.timestamp - a.timestamp);

  const todayTotalAmount = todayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);

  return (
    <div className="space-y-6">

      {/* Daily Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-top-4">
        <div className="bg-indigo-50/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100">
            <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    สรุปยอดรับชำระวันนี้
                    <span className="text-sm font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm">
                        {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
                    </span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">รายการที่บันทึกประจำวัน</p>
            </div>
            <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">ยอดรับรวมทั้งสิ้น</p>
                <p className="text-3xl font-bold text-indigo-600">{formatTHB(todayTotalAmount)}</p>
            </div>
        </div>
        
        {todayTransactions.length > 0 ? (
            <div className="overflow-x-auto max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 font-medium whitespace-nowrap">เวลา</th>
                            <th className="px-6 py-3 font-medium whitespace-nowrap">สมาชิก</th>
                            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">ยอดเงิน</th>
                            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">ผู้บันทึก</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {todayTransactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-6 py-3 text-slate-500 flex items-center gap-2 whitespace-nowrap">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    {new Date(tx.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-6 py-3 font-medium text-slate-700 whitespace-nowrap">
                                    {tx.memberName} <span className="text-slate-400 font-normal text-xs">({tx.memberCode})</span>
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                                    {formatTHB(tx.totalAmount)}
                                </td>
                                <td className="px-6 py-3 text-right text-slate-500 text-xs whitespace-nowrap">
                                    {tx.recordedBy}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <FileText className="w-10 h-10 opacity-20" />
                <p>ยังไม่มีรายการรับชำระเงินในวันนี้</p>
            </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2 mt-6">
         <h2 className="text-lg font-bold text-slate-700">ภาพรวมสถานะการเงิน (Financial Status)</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>
      
      {/* Top Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-4">
         <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
            <div>
               <p className="text-xs text-slate-500 font-bold uppercase mb-1">หนี้ค่าบ้านรวม</p>
               <p className="text-lg font-bold text-red-600">{formatTHB(totals.housing)}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
                <Building2 className="w-4 h-4 text-red-500" />
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
            <div>
               <p className="text-xs text-slate-500 font-bold uppercase mb-1">หนี้ที่ดินรวม</p>
               <p className="text-lg font-bold text-red-600">{formatTHB(totals.land)}</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
                <MapPin className="w-4 h-4 text-orange-500" />
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
            <div>
               <p className="text-xs text-slate-500 font-bold uppercase mb-1">สินเชื่อทั่วไปรวม</p>
               <p className="text-lg font-bold text-red-600">{formatTHB(totals.general)}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
                <Coins className="w-4 h-4 text-amber-500" />
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-teal-100 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
            <div>
               <p className="text-xs text-slate-500 font-bold uppercase mb-1">หุ้นสะสมรวม</p>
               <p className="text-lg font-bold text-teal-700">{formatTHB(totals.shares)}</p>
            </div>
            <div className="p-2 bg-teal-50 rounded-lg">
                <PiggyBank className="w-4 h-4 text-teal-500" />
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
            <div>
               <p className="text-xs text-slate-500 font-bold uppercase mb-1">เงินฝากรวม</p>
               <p className="text-lg font-bold text-emerald-700">{formatTHB(totals.savings)}</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
                <Wallet className="w-4 h-4 text-emerald-500" />
            </div>
         </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาสมาชิก (ชื่อ หรือ รหัส)"
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setView('register_member')}
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
        >
            <UserPlus className="w-4 h-4" />
            เพิ่มสมาชิกใหม่
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">รหัส</th>
                <th className="px-6 py-4">ชื่อ-สกุล</th>
                <th className="px-6 py-4 text-right">หนี้บ้าน</th>
                <th className="px-6 py-4 text-right">หนี้ที่ดิน</th>
                <th className="px-6 py-4 text-right">สินเชื่อทั่วไป</th>
                <th className="px-6 py-4 text-right">หุ้นสะสม</th>
                <th className="px-6 py-4 text-right">เงินฝาก</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500">{member.memberCode}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{member.name}</td>
                  <td className="px-6 py-4 text-right text-red-600">{formatTHB(member.housingLoanBalance)}</td>
                  <td className="px-6 py-4 text-right text-red-600">{formatTHB(member.landLoanBalance)}</td>
                  <td className="px-6 py-4 text-right text-red-600">{formatTHB(member.generalLoanBalance)}</td>
                  <td className="px-6 py-4 text-right text-teal-600">{formatTHB(member.accumulatedShares)}</td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-medium">{formatTHB(member.savingsBalance)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenPayment(member.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-md transition-colors font-medium text-xs"
                          title="บันทึกการชำระเงิน"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          บันทึกยอด
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(member.id)}
                          className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          title="แก้ไขข้อมูล/ยอดคงเหลือ"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(member)}
                          className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="ลบสมาชิก"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    ไม่พบข้อมูลสมาชิก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMemberId && modalType === 'payment' && (
        <PaymentModal 
          memberId={selectedMemberId} 
          onClose={handleCloseModal} 
        />
      )}

      {selectedMemberId && modalType === 'edit' && (
        <EditMemberModal 
          memberId={selectedMemberId} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
};
