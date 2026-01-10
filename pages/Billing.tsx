
import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { UserRole, Member } from '../types';
import { Search, Printer, FileText, ChevronDown, Landmark, MapPin, Phone, User } from 'lucide-react';

export const Billing: React.FC = () => {
  const { members, currentUser } = useStore();
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentUser?.memberId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 543);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedMember = useMemo(() => 
    members.find(m => m.id === selectedMemberId), 
    [members, selectedMemberId]
  );

  const filteredSearchMembers = useMemo(() => {
    const clean = searchQuery.toLowerCase().trim();
    if (!clean) return members.slice(0, 5);
    return members.filter(m => 
      m.name.toLowerCase().includes(clean) || 
      m.memberCode.toLowerCase().includes(clean)
    ).slice(0, 10);
  }, [members, searchQuery]);

  // Calculate Monthly Breakdown with specific logic provided by user
  const billingCalculations = useMemo(() => {
    if (!selectedMember) return { installments: [], initialDebt: 0, finalBalance: 0, finalMissed: 0 };
    
    const yearAD = targetYear - 543;
    const installments = [];
    
    const monthlyInstallment = selectedMember.monthlyInstallment || 0;
    const missedBf = selectedMember.missedInstallments || 0;

    // Formula: Initial Debt = Monthly Installment * Missed Installments Brought Forward
    const initialDebt = monthlyInstallment * missedBf;

    const months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    const yearTxs = (selectedMember.transactions || []).filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === yearAD;
    });

    let runningBalance = initialDebt;
    let runningMissed = missedBf;
    
    for (let i = 0; i < 12; i++) {
      const monthIndex = i;
      const txInMonth = yearTxs.filter(tx => new Date(tx.date).getMonth() === monthIndex);
      
      const paidInMonth = txInMonth.reduce((sum, tx) => 
        sum + (Number(tx.housing) || 0) + (Number(tx.land) || 0) + (Number(tx.generalLoan) || 0), 0);
      
      const txDate = txInMonth.length > 0 ? new Date(txInMonth[0].date).toLocaleDateString('th-TH') : '';

      // Formula: Balance = Previous Balance + Monthly Installment - Paid
      const newBalance = runningBalance + monthlyInstallment - paidInMonth;
      
      // Calculate missed installments for this month
      // If payment is less than the installment, missed installments increase
      if (paidInMonth < monthlyInstallment) {
        runningMissed += 1;
      } else if (paidInMonth > monthlyInstallment) {
        // If they pay extra, it could reduce missed installments (simplified logic)
        const extraMonths = Math.floor(paidInMonth / monthlyInstallment) - 1;
        runningMissed = Math.max(0, runningMissed - extraMonths);
      }
      // If paidInMonth == monthlyInstallment, runningMissed stays the same

      installments.push({
        no: i + 1,
        month: `เดือน ${months[i]} ${targetYear}`,
        amount: monthlyInstallment,
        paid: paidInMonth,
        balance: newBalance,
        date: txDate
      });
      
      runningBalance = newBalance;
    }

    return { 
      installments, 
      initialDebt, 
      finalBalance: runningBalance, 
      finalMissed: runningMissed 
    };
  }, [selectedMember, targetYear]);

  const totalPaidYear = billingCalculations.installments.reduce((sum, d) => sum + d.paid, 0);
  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH').format(num);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 print:p-0 print:m-0">
      
      {/* Search Bar - Hidden on Print */}
      {currentUser?.role === UserRole.STAFF && (
        <div className="print:hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full" ref={dropdownRef}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input 
              type="text" 
              placeholder="ค้นหาสมาชิกเพื่อออกใบแจ้งหนี้..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-teal-500 font-bold"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
              onFocus={() => setIsDropdownOpen(true)}
            />
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                {filteredSearchMembers.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => { setSelectedMemberId(m.id); setSearchQuery(m.name); setIsDropdownOpen(false); }}
                    className="w-full text-left px-6 py-3 hover:bg-teal-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                  >
                    <span className="font-bold text-slate-700">{m.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{m.memberCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
            >
                {[0, 1, 2].map(offset => (
                    <option key={offset} value={new Date().getFullYear() + 543 - offset}>ปี {new Date().getFullYear() + 543 - offset}</option>
                ))}
            </select>
            <button 
                onClick={handlePrint}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all"
            >
                <Printer className="w-5 h-5" /> พิมพ์
            </button>
          </div>
        </div>
      )}

      {selectedMember ? (
        <div className="bg-white border-[1px] border-slate-200 shadow-sm print:shadow-none print:border-none overflow-hidden min-h-[1000px] flex flex-col">
          
          {/* Billing Header */}
          <div className="p-8 space-y-4 text-center">
            <div className="flex justify-center mb-2">
               <div className="w-20 h-20 bg-white border border-slate-200 rounded-full flex items-center justify-center p-2 shadow-sm overflow-hidden">
                  <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Logo" className="w-full h-full object-contain" />
               </div>
            </div>
            <h1 className="text-xl font-bold text-slate-800">สหกรณ์เคหสถานบ้านมั่นคงชุมชนตะอาวุน จำกัด</h1>
            <h2 className="text-2xl font-black text-red-600 border-b-2 border-red-600 inline-block px-8 py-1">ใบแจ้งหนี้</h2>
          </div>

          {/* Member Info Section */}
          <div className="px-10 py-4 grid grid-cols-2 gap-y-2 text-sm">
            <div className="flex gap-2"><span className="font-bold">ชื่อสมาชิก :</span> {selectedMember.name}</div>
            <div className="flex gap-2"><span className="font-bold">เรียกเก็บที่ :</span> สหกรณ์เคหสถานบ้านมั่นคงชุมชนตะอาวุน จำกัด</div>
            <div className="flex gap-2"><span className="font-bold">บ้านเลขที่ :</span> {selectedMember.personalInfo?.address || '-'}</div>
            <div className="flex gap-2">42 ถนน นิบบงบารู ต.สะเตงนอก อำเภอเมือง</div>
            <div className="flex gap-2 ml-[68px]">อำเภอเมือง จังหวัดยะลา 95000</div>
            <div className="flex gap-2 ml-[68px]">จังหวัดยะลา 95000</div>
          </div>

          {/* Summary Box */}
          <div className="mx-10 my-4 bg-slate-100 grid grid-cols-3 text-sm border-t border-b border-slate-300">
             <div className="p-3 border-r border-slate-300"><span className="font-bold">ยอดชำระต่องวด :</span> <span className="float-right">{formatTHB(selectedMember.monthlyInstallment || 0)} บาท/เดือน</span></div>
             <div className="p-3 border-r border-slate-300"><span className="font-bold">ยอดรวมต้นปี {targetYear} :</span> <span className="float-right">{formatTHB(billingCalculations.initialDebt)} บาท</span></div>
             <div className="p-3"><span className="font-bold">งวดค้างชำระยกมา :</span> <span className="float-right">{selectedMember.missedInstallments || 0} งวด</span></div>
          </div>

          {/* Table Data */}
          <div className="px-10 flex-1">
            <table className="w-full border-collapse border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-600 text-white">
                  <th className="border border-slate-800 p-2 w-12">ลำดับ</th>
                  <th className="border border-slate-800 p-2 text-left">รายการ</th>
                  <th className="border border-slate-800 p-2 text-right">ยอดชำระ/เดือน</th>
                  <th className="border border-slate-800 p-2 text-right">ชำระแล้ว</th>
                  <th className="border border-slate-800 p-2 text-right">คงเหลือ</th>
                  <th className="border border-slate-800 p-2 text-center">วันที่ชำระ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold bg-slate-50">
                   <td className="border border-slate-800 p-2"></td>
                   <td className="border border-slate-800 p-2">ยอดธนมา ปี {targetYear}</td>
                   <td className="border border-slate-800 p-2"></td>
                   <td className="border border-slate-800 p-2"></td>
                   <td className="border border-slate-800 p-2 text-right">฿ {formatTHB(billingCalculations.initialDebt)}</td>
                   <td className="border border-slate-800 p-2"></td>
                </tr>
                {billingCalculations.installments.map((row) => (
                  <tr key={row.no} className="h-8">
                    <td className="border border-slate-800 p-2 text-center">{row.no}</td>
                    <td className="border border-slate-800 p-2">{row.month}</td>
                    <td className="border border-slate-800 p-2 text-right">฿ {formatTHB(row.amount)}</td>
                    <td className="border border-slate-800 p-2 text-right">{row.paid > 0 ? `฿ ${formatTHB(row.paid)}` : ''}</td>
                    <td className="border border-slate-800 p-2 text-right font-bold">฿ {formatTHB(row.balance)}</td>
                    <td className="border border-slate-800 p-2 text-center text-[10px]">{row.date}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                 <tr className="bg-slate-300 font-bold">
                    <td colSpan={3} className="border border-slate-800 p-2 text-center uppercase">ยอดรวมชำระปีนี้</td>
                    <td className="border border-slate-800 p-2 text-right">฿ {formatTHB(totalPaidYear)}</td>
                    <td className="border border-slate-800 p-2"></td>
                    <td className="border border-slate-800 p-2"></td>
                 </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer Highlights */}
          <div className="mx-10 my-6 bg-orange-50 p-4 border border-orange-200 flex justify-between items-center rounded-xl">
             <div className="text-xl font-black text-red-600 uppercase">ยอดที่ต้องชำระเงิน (สุทธิ) :</div>
             <div className="text-3xl font-black text-red-600">{formatTHB(billingCalculations.finalBalance)} <span className="text-lg font-bold">บาท</span></div>
             <div className="text-3xl font-black text-red-600">{billingCalculations.finalMissed} <span className="text-lg font-bold">งวด</span></div>
          </div>

          {/* Payment Info */}
          <div className="px-10 pb-10 space-y-6">
             <div className="flex gap-6 items-start">
                <div className="w-24 h-24 bg-white border p-2 rounded-2xl flex items-center justify-center shrink-0">
                   <Landmark className="w-16 h-16 text-emerald-700" />
                </div>
                <div className="space-y-1 text-sm">
                   <p className="font-bold text-slate-800">ธนาคารอิสลาม สาขา ถนนภูมาชีพ ยะลา</p>
                   <p className="font-bold text-slate-800">เลขบัญชี : 054-1-06123-2</p>
                   <p className="font-bold text-slate-800">ชื่อบัญชี : สหกรณ์เคหสถานบ้านมั่นคงชุมชนตะอาวุน จำกัด</p>
                   <p className="text-slate-500 text-xs pt-1">หลังจากโอนเงินแล้ว ให้ส่งสลิปมาให้เจ้าหน้าที่การเงินทางไลน์ 0895952329</p>
                   <p className="text-slate-500 text-xs">โทร : 0895952329 น.ส.นูรีซัน ไพเราะ (เจ้าหน้าที่การเงิน)</p>
                </div>
             </div>

             <div className="text-xs text-red-600 font-bold space-y-1 pt-4 border-t border-dashed border-slate-300">
                <p>** โปรดติดต่อเจ้าหน้าที่การเงินภายใน 10 วันทำการหลังได้รับใบแจ้งหนี้</p>
                <p>** หากท่านประสงค์จะขอประนอมหนี้ให้ท่านติดต่อเจ้าหน้าที่การเงินก่อนครบกำหนดตามหนังสือฉบับนี้ด้วย</p>
             </div>
          </div>

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-300">
           <FileText className="w-20 h-20 mb-4 opacity-10" />
           <p className="font-black">กรุณาเลือกสมาชิกเพื่อแสดงใบแจ้งหนี้</p>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          aside, header, nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          .max-w-4xl { max-width: 100% !important; }
          .shadow-sm, .shadow-xl { box-shadow: none !important; }
          .bg-slate-50, .bg-slate-100 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
          .bg-slate-600 { background-color: #475569 !important; -webkit-print-color-adjust: exact; }
          .text-white { color: white !important; -webkit-print-color-adjust: exact; }
          .bg-orange-50 { background-color: #fff7ed !important; -webkit-print-color-adjust: exact; }
          .border { border: 1px solid #000 !important; }
          .border-slate-800 { border-color: #000 !important; }
        }
      `}</style>
    </div>
  );
};
