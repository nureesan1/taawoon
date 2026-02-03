
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  FileText, Calendar, Search, ChevronLeft, ChevronRight, Printer, Download
} from 'lucide-react';

export const DailySummary: React.FC = () => {
  const { members } = useStore();
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 543);
  const [searchTerm, setSearchTerm] = useState('');

  const months = [
    "ม.ค.(1)", "ก.พ.(2)", "มี.ค.(3)", "เม.ย.(4)", "พ.ค.(5)", "มิ.ย.(6)",
    "ก.ค.(7)", "ส.ค.(8)", "ก.ย.(9)", "ต.ค.(10)", "พ.ย.(11)", "ธ.ค.(12)"
  ];

  // คำนวณข้อมูลสำหรับตารางรายปีโดยดึงจากประวัติการชำระเงินจริง
  const yearlyData = useMemo(() => {
    const yearAD = targetYear - 543;
    
    return members.map((member, index) => {
      const monthlyInstallment = Number(member.monthlyInstallment) || 0;
      const initialMissedCount = Number(member.missedInstallments) || 0;
      const debtBf = monthlyInstallment * initialMissedCount; // ยอดค้างยกมา

      // สร้าง Array เก็บยอดชำระ 12 เดือน (เริ่มที่ 0)
      const monthlyPaid = Array(12).fill(0);
      
      // ดึงประวัติการชำระเงินเฉพาะปีที่เลือก
      const yearTxs = (member.transactions || []).filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === yearAD;
      });

      // รวมยอดชำระลงในแต่ละเดือน (เฉพาะหมวดหนี้: บ้าน + ที่ดิน + สินเชื่อ)
      yearTxs.forEach(tx => {
        const month = new Date(tx.date).getMonth();
        const paymentForDebt = (Number(tx.housing) || 0) + (Number(tx.land) || 0) + (Number(tx.generalLoan) || 0);
        monthlyPaid[month] += paymentForDebt;
      });

      const totalPaidYear = monthlyPaid.reduce((a, b) => a + b, 0);
      
      // คำนวณยอดค้างชำระทั้งปีตามสูตร Excel: (ยกมา + ยอดต้องจ่ายปีนี้) - จ่ายจริง
      const totalExpectedThisYear = debtBf + (monthlyInstallment * 12);
      const yearlyDebtBalance = Math.max(0, totalExpectedThisYear - totalPaidYear);
      
      // จำนวนงวดที่ค้าง
      const finalMissedCount = Math.ceil(yearlyDebtBalance / (monthlyInstallment || 1));

      // งวดที่ชำระ (นับจำนวนเดือนที่มีการชำระเงินเข้ามา)
      const installmentsPaidCount = monthlyPaid.filter(v => v > 0).length;

      // แยกชื่อและนามสกุล
      const nameParts = member.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        ...member,
        no: index + 1,
        firstName,
        lastName,
        debtBf,
        monthlyPaid,
        totalPaidYear,
        yearlyDebtBalance,
        finalMissedCount,
        installmentsPaidCount
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
  
  const getStatusColor = (count: number) => {
    if (count <= 0) return 'bg-[#00FF00] text-black'; // เขียว
    if (count <= 36) return 'bg-[#FFFF00] text-black'; // เหลือง
    return 'bg-[#FF6B6B] text-white'; // แดง
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in print:p-0">
      
      {/* ส่วนควบคุม (Web Only) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-[#064e3b] p-3 rounded-2xl text-white shadow-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">รายงานสรุปยอดลูกหนี้รายปี</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yearly Debt Tracking Ledger</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นชื่อสมาชิก..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
             <button onClick={() => setTargetYear(targetYear - 1)} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
             <span className="px-4 font-black text-slate-700 text-sm">ปี {targetYear}</span>
             <button onClick={() => setTargetYear(targetYear + 1)} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={() => window.print()} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-black transition-all shadow-md">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ตารางสรุปรายปี - High Fidelity Excel Style */}
      <div className="bg-white rounded-[0.5rem] shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1800px] text-[12px]">
            <thead>
              {/* ส่วนหัวชั้นบนสุด */}
              <tr className="bg-[#E2EFDA] text-slate-700 font-bold border-b border-slate-400">
                <th colSpan={4} className="px-4 py-3 border-r border-slate-400 text-center bg-[#C6E0B4]">ข้อมูลลูกหนี้ / หน่วย</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-24">จำนวนงวดที่ค้าง</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-28">ยอดค้างชำระยกมา</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-24">ยอดชำระต่องวด</th>
                <th colSpan={12} className="px-2 py-3 border-r border-slate-400 text-center bg-[#D9E1F2]">รายละเอียดการชำระเงินรายเดือน ({targetYear})</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-28 bg-[#FFF2CC]">ยอดรวมชำระ</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-32 bg-[#FFF2CC] text-red-600">ยอดค้างชำระทั้งปี</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-20 bg-[#FFFF00] text-black">จำนวนงวดที่ค้าง</th>
                <th className="px-2 py-3 text-center w-20 bg-[#FCE4D6]">งวดที่ชำระ</th>
              </tr>
              {/* หัวตารางรายละเอียด */}
              <tr className="bg-white text-slate-500 font-bold uppercase border-b border-slate-400">
                <th className="px-2 py-2 border-r border-slate-400 text-center w-12">ลำดับ</th>
                <th className="px-4 py-2 border-r border-slate-400 text-center" colSpan={2}>ชื่อ</th>
                <th className="px-4 py-2 border-r border-slate-400 text-center">นามสกุล</th>
                <th className="border-r border-slate-400"></th>
                <th className="border-r border-slate-400"></th>
                <th className="border-r border-slate-400"></th>
                {months.map((m) => (
                  <th key={m} className="px-1 py-2 border-r border-slate-400 text-center w-[75px]">{m}</th>
                ))}
                <th className="border-r border-slate-400 bg-[#FFF2CC]"></th>
                <th className="border-r border-slate-400 bg-[#FFF2CC]"></th>
                <th className="border-r border-slate-400 bg-[#FFFF00]"></th>
                <th className="bg-[#FCE4D6]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {yearlyData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-all h-10 border-b border-slate-300">
                  <td className="px-2 py-1 text-center border-r border-slate-400 font-medium">{row.no}</td>
                  <td className="px-4 py-1 border-r border-slate-400 font-bold text-slate-800" colSpan={2}>{row.firstName}</td>
                  <td className="px-4 py-1 border-r border-slate-400 font-bold text-slate-800">{row.lastName}</td>
                  
                  <td className="px-2 py-1 border-r border-slate-400 text-center bg-slate-50">{row.missedInstallments}</td>
                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 bg-slate-50 font-mono">{formatNum(row.debtBf)}</td>
                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 bg-slate-50 font-bold">{formatNum(row.monthlyInstallment)}</td>
                  
                  {/* คอลัมน์เดือน 1-12 - ดึงจากยอดจ่ายจริง */}
                  {row.monthlyPaid.map((val, idx) => (
                    <td key={idx} className={`px-1 py-1 border-r border-slate-400 text-right pr-2 font-mono ${val > 0 ? 'text-black font-black bg-blue-50/30' : 'text-slate-100'}`}>
                      {val > 0 ? formatNum(val) : '-'}
                    </td>
                  ))}

                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 font-black bg-[#FFF2CC]">{formatNum(row.totalPaidYear)}</td>
                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 font-black bg-[#FFF2CC] text-red-600">{formatNum(row.yearlyDebtBalance)}</td>
                  
                  {/* ช่องสถานะงวดที่ค้าง */}
                  <td className={`px-2 py-1 border-r border-slate-400 text-center font-black ${getStatusColor(row.finalMissedCount)}`}>
                    {row.finalMissedCount}
                  </td>
                  
                  {/* งวดที่ชำระ (สีส้มอ่อน) */}
                  <td className="px-2 py-1 text-center font-black bg-[#FCE4D6] text-slate-800">
                    {row.installmentsPaidCount}
                  </td>
                </tr>
              ))}
              
              {yearlyData.length === 0 && (
                <tr>
                  <td colSpan={22} className="py-24 text-center text-slate-300">
                    <div className="flex flex-col items-center justify-center">
                       <FileText className="w-16 h-16 mb-4 opacity-10" />
                       <p className="font-black">ไม่พบข้อมูลสมาชิก</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Instructions (Web Only) */}
      <div className="print:hidden flex justify-between items-center pt-4">
        <button 
          onClick={() => alert('กำลังเตรียมไฟล์สำหรับการส่งออก...')}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download className="w-5 h-5" /> ดาวน์โหลดข้อมูลรายปี (.xlsx)
        </button>
        <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
          * ข้อมูลจะคำนวณอัตโนมัติจาก "ประวัติการชำระเงิน" และ "ยอดต่องวด" ที่บันทึกในระบบ
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; font-size: 8pt !important; }
          aside, header, nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          .max-w-7xl { max-width: 100% !important; }
          .shadow-sm, .shadow-2xl { box-shadow: none !important; }
          .rounded-\\[2rem\\], .rounded-[1rem] { border-radius: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1pt solid #000 !important; }
          th, td { border: 0.5pt solid #000 !important; padding: 2pt !important; -webkit-print-color-adjust: exact; }
          .bg-[#E2EFDA] { background-color: #E2EFDA !important; }
          .bg-[#C6E0B4] { background-color: #C6E0B4 !important; }
          .bg-[#FFF2CC] { background-color: #FFF2CC !important; }
          .bg-[#FCE4D6] { background-color: #FCE4D6 !important; }
          .bg-[#D9E1F2] { background-color: #D9E1F2 !important; }
          .bg-[#00FF00] { background-color: #00FF00 !important; }
          .bg-[#FFFF00] { background-color: #FFFF00 !important; }
          .bg-[#FF6B6B] { background-color: #FF6B6B !important; }
          @page { size: landscape; margin: 0.5cm; }
        }
      `}</style>
    </div>
  );
};
