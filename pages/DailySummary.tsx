
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  FileText, Calendar, Search, ChevronLeft, ChevronRight, Printer, Download, UserCheck
} from 'lucide-react';

export const DailySummary: React.FC = () => {
  const { members } = useStore();
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 543);
  const [searchTerm, setSearchTerm] = useState('');

  const months = [
    "ม.ค.(1)", "ก.พ.(2)", "มี.ค.(3)", "เม.ย.(4)", "พ.ค.(5)", "มิ.ย.(6)",
    "ก.ค.(7)", "ส.ค.(8)", "ก.ย.(9)", "ต.ค.(10)", "พ.ย.(11)", "ธ.ค.(12)"
  ];

  // คำนวณข้อมูลสำหรับตารางสรุปรายปี
  const yearlyData = useMemo(() => {
    const yearAD = targetYear - 543;
    
    return members.map((member, index) => {
      const monthlyInstallment = Number(member.monthlyInstallment) || 0;
      const initialMissedCount = Number(member.missedInstallments) || 0;
      const debtBf = monthlyInstallment * initialMissedCount; // ยอดค้างยกมา

      const monthlyPaid = Array(12).fill(0);
      
      // กรองเฉพาะรายการชำระเงินในปีที่เลือก
      const yearTxs = (member.transactions || []).filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === yearAD;
      });

      // รวมยอดชำระเฉพาะหมวดหนี้ (บ้าน, ที่ดิน, สินเชื่อ) ลงรายเดือน
      yearTxs.forEach(tx => {
        const month = new Date(tx.date).getMonth();
        const totalDebtPart = (Number(tx.housing) || 0) + (Number(tx.land) || 0) + (Number(tx.generalLoan) || 0);
        monthlyPaid[month] += totalDebtPart;
      });

      const totalPaidYear = monthlyPaid.reduce((a, b) => a + b, 0);
      
      // คำนวณยอดค้างชำระสุทธิ (ยกมา + ที่ต้องจ่ายปีนี้ - ที่จ่ายแล้ว)
      const expectedTotal = debtBf + (monthlyInstallment * 12);
      const yearlyDebtBalance = Math.max(0, expectedTotal - totalPaidYear);
      
      // จำนวนงวดที่ค้างหลังจบปี
      const finalMissedCount = Math.ceil(yearlyDebtBalance / (monthlyInstallment || 1));

      // จำนวนงวดที่ชำระ (นับจำนวนเดือนที่มียอดจ่าย >= ยอดต่องวด)
      const installmentsCount = monthlyPaid.filter(v => v >= monthlyInstallment).length;

      // แยกชื่อนามสกุล
      const nameParts = member.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        ...member,
        no: index + 1,
        firstName,
        lastName,
        initialMissedCount,
        debtBf,
        monthlyPaid,
        totalPaidYear,
        yearlyDebtBalance,
        finalMissedCount,
        installmentsCount
      };
    }).filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.memberCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, targetYear, searchTerm]);

  const formatNum = (num: number) => {
    if (num === 0) return '';
    return new Intl.NumberFormat('th-TH').format(num);
  };
  
  const getMissedBadgeColor = (count: number) => {
    if (count <= 0) return 'bg-[#00B050] text-white'; // เขียวเข้ม
    if (count <= 36) return 'bg-[#FFFF00] text-black'; // เหลือง
    return 'bg-[#FF0000] text-white'; // แดง
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in print:p-0">
      
      {/* Search & Controller (Hidden on Print) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-[#064e3b] p-3 rounded-2xl text-white shadow-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">ระบบสรุปยอดลูกหนี้รายปี</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ข้อมูล ณ 31 ธันวาคม {targetYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อหรือรหัส..." 
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
             <button onClick={() => setTargetYear(targetYear - 1)} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
             <span className="px-4 font-black text-slate-700 text-sm">{targetYear}</span>
             <button onClick={() => setTargetYear(targetYear + 1)} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={() => window.print()} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-black transition-all shadow-md">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Ledger Table (Excel Style) */}
      <div className="bg-white rounded-[1rem] shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1800px] text-[12px]">
            <thead>
              {/* Top Level Header */}
              <tr className="bg-[#E2EFDA] text-slate-700 font-bold border-b border-slate-400">
                <th colSpan={4} className="px-4 py-3 border-r border-slate-400 text-center">ชื่อลูกหนี้ / หน่วย</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-24">จำนวนงวดที่ค้าง</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-28">ยอดค้างชำระยกมา</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-24">ยอดชำระต่องวด</th>
                {months.map((m) => (
                  <th key={m} className="px-1 py-3 border-r border-slate-400 text-center w-[75px]">{m}</th>
                ))}
                <th className="px-2 py-3 border-r border-slate-400 text-center w-28 bg-[#FFF2CC]">ยอดรวมชำระ</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-32 bg-[#FFF2CC]">ยอดค้างชำระทั้งปี</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-20">จำนวนงวดที่ค้าง</th>
                <th className="px-2 py-3 text-center w-20 bg-[#FCE4D6]">งวดที่ชำระ</th>
              </tr>
              {/* Detailed Labels */}
              <tr className="bg-white text-slate-500 font-bold uppercase border-b border-slate-400">
                <th className="px-2 py-2 border-r border-slate-400 text-center">ลำดับ</th>
                <th className="px-4 py-2 border-r border-slate-400 text-center" colSpan={2}>ชื่อ</th>
                <th className="px-4 py-2 border-r border-slate-400 text-center">นามสกุล</th>
                <th className="border-r border-slate-400"></th>
                <th className="border-r border-slate-400 text-center">ยกมา</th>
                <th className="border-r border-slate-400"></th>
                {months.map((_, i) => <th key={i} className="border-r border-slate-400"></th>)}
                <th className="border-r border-slate-400 bg-[#FFF2CC]"></th>
                <th className="border-r border-slate-400 bg-[#FFF2CC]"></th>
                <th className="border-r border-slate-400"></th>
                <th className="bg-[#FCE4D6]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {yearlyData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-all h-10 border-b border-slate-300">
                  <td className="px-2 py-1 text-center border-r border-slate-400 font-medium text-slate-400">{row.no}</td>
                  <td className="px-4 py-1 border-r border-slate-400 font-bold text-slate-800" colSpan={2}>{row.firstName}</td>
                  <td className="px-4 py-1 border-r border-slate-400 font-bold text-slate-800">{row.lastName}</td>
                  
                  <td className="px-2 py-1 border-r border-slate-400 text-center bg-slate-50">{row.initialMissedCount}</td>
                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 bg-slate-50 font-mono">{formatNum(row.debtBf)}</td>
                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 bg-slate-50 font-bold">{formatNum(row.monthlyInstallment)}</td>
                  
                  {/* Monthly Columns (Calculated from Real Transactions) */}
                  {row.monthlyPaid.map((val, idx) => (
                    <td key={idx} className={`px-1 py-1 border-r border-slate-400 text-right pr-2 font-mono ${val > 0 ? 'text-black font-black bg-blue-50/20' : 'text-slate-100'}`}>
                      {formatNum(val)}
                    </td>
                  ))}

                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 font-black bg-[#FFF2CC]">{formatNum(row.totalPaidYear)}</td>
                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 font-black bg-[#FFF2CC] text-red-600">{formatNum(row.yearlyDebtBalance)}</td>
                  
                  {/* Status Indicator (Color coded per screenshot) */}
                  <td className={`px-2 py-1 border-r border-slate-400 text-center font-black ${getMissedBadgeColor(row.finalMissedCount)}`}>
                    {row.finalMissedCount}
                  </td>
                  
                  {/* Paid Count (Pink background) */}
                  <td className="px-2 py-1 text-center font-black bg-[#FCE4D6] text-slate-800">
                    {row.installmentsCount}
                  </td>
                </tr>
              ))}
              
              {yearlyData.length === 0 && (
                <tr>
                  <td colSpan={22} className="py-32 text-center text-slate-300">
                    <div className="flex flex-col items-center justify-center">
                       <FileText className="w-16 h-16 mb-4 opacity-10" />
                       <p className="font-black text-lg">ไม่พบข้อมูลสมาชิกในปี {targetYear}</p>
                       <p className="text-xs">กรุณาตรวจสอบการเลือกปี หรือลองค้นหาด้วยคำอื่น</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info (Web Only) */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-6 rounded-[2rem] text-white">
        <div className="flex items-center gap-4">
           <div className="bg-emerald-500 p-3 rounded-2xl">
              <Download className="w-6 h-6" />
           </div>
           <div>
              <h3 className="font-bold text-sm uppercase tracking-widest">การออกรายงาน</h3>
              <p className="text-[10px] text-slate-400">คุณสามารถใช้ปุ่มพิมพ์ที่มุมขวาบนเพื่อบันทึกเป็น PDF หรือพิมพ์ลงกระดาษขนาด A4 ในแนวนอนได้ทันที</p>
           </div>
        </div>
        <button className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black text-sm hover:bg-slate-100 transition-all shadow-lg active:scale-95">
          ส่งออกเป็น EXCEL (.xlsx)
        </button>
      </div>

      <style>{`
        @media print {
          body { background: white !important; font-family: 'Sarabun', sans-serif !important; }
          aside, header, nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          .max-w-7xl { max-width: 100% !important; }
          .shadow-2xl, .shadow-sm { box-shadow: none !important; }
          .rounded-\\[1rem\\], .rounded-[2rem] { border-radius: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1pt solid #000 !important; }
          th, td { border: 0.5pt solid #000 !important; padding: 2pt !important; -webkit-print-color-adjust: exact; }
          .bg-[#E2EFDA] { background-color: #E2EFDA !important; }
          .bg-[#FFF2CC] { background-color: #FFF2CC !important; }
          .bg-[#FCE4D6] { background-color: #FCE4D6 !important; }
          .bg-[#00B050] { background-color: #00B050 !important; }
          .bg-[#FFFF00] { background-color: #FFFF00 !important; }
          .bg-[#FF0000] { background-color: #FF0000 !important; }
          @page { size: landscape; margin: 0.5cm; }
        }
      `}</style>
    </div>
  );
};
