
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

  // คำนวณข้อมูลสำหรับตารางรายปีแบบละเอียด
  const yearlyData = useMemo(() => {
    const yearAD = targetYear - 543;
    
    return members.map((member, index) => {
      const monthlyInstallment = member.monthlyInstallment || 0;
      const missedBf = member.missedInstallments || 0; // งวดค้างยกมา
      const debtBf = monthlyInstallment * missedBf; // ยอดค้างยกมา (บาท)

      // ดึงประวัติการชำระเงินในปีที่เลือก
      const monthlyPaid = Array(12).fill(0);
      const yearTxs = (member.transactions || []).filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === yearAD;
      });

      yearTxs.forEach(tx => {
        const month = new Date(tx.date).getMonth();
        // รวมยอดชำระเฉพาะหมวดหนี้หลัก (บ้าน + ที่ดิน + สินเชื่อ) ตามจุดประสงค์ของตารางสรุปหนี้
        const totalDebtPayment = (Number(tx.housing) || 0) + (Number(tx.land) || 0) + (Number(tx.generalLoan) || 0);
        monthlyPaid[month] += totalDebtPayment;
      });

      const totalPaidYear = monthlyPaid.reduce((a, b) => a + b, 0);
      
      // ยอดค้างชำระทั้งปี = ยอดค้างยกมา + (ยอดต่องวด * 12) - ยอดชำระรวมปีนี้
      const totalDebtOverall = debtBf + (monthlyInstallment * 12) - totalPaidYear;
      const debtBalanceDisplay = Math.max(0, totalDebtOverall);
      
      // จำนวนงวดที่ค้าง = ยอดค้างสุทธิ / ยอดต่องวด
      const missedCount = Math.ceil(debtBalanceDisplay / (monthlyInstallment || 1));

      // จำนวนงวดที่ชำระ (นับจำนวนเดือนที่ยอดชำระ >= ยอดต่องวด)
      const installmentsPaid = monthlyPaid.filter(v => v >= monthlyInstallment).length;

      // แยกชื่อ-นามสกุล (ถ้ามีช่องว่าง)
      const nameParts = member.name.split(' ');
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
        debtBalanceDisplay,
        missedCount,
        installmentsPaid
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
  
  const getMissedStatusColor = (count: number) => {
    if (count <= 0) return 'bg-[#00FF00] text-black font-bold'; // เขียว (ปกติ)
    if (count <= 36) return 'bg-[#FFFF00] text-black font-bold'; // เหลือง (ค้างบ้าง)
    return 'bg-[#FF6B6B] text-white font-bold'; // แดง (ค้างหนัก)
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in print:p-0">
      
      {/* Header Controller - Web Only */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-[#064e3b] p-3 rounded-2xl text-white shadow-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">สรุปข้อมูลลูกหนี้รายปี</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yearly Debt Tracking Ledger</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อสมาชิก..." 
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"
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

      {/* Yearly Report Table - High Fidelity Design */}
      <div className="bg-white rounded-[1rem] shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1800px] text-[12px]">
            <thead>
              {/* Main Super Header */}
              <tr className="bg-[#E2EFDA] text-slate-700 font-bold border-b border-slate-400">
                <th colSpan={4} className="px-4 py-3 border-r border-slate-400 text-center">ข้อมูลลูกหนี้ / หน่วย</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-24">จำนวนงวดที่ค้าง</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-24">ยอดค้างชำระยกมา</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-24">ยอดชำระต่องวด</th>
                <th colSpan={12} className="px-2 py-3 border-r border-slate-400 text-center">รายละเอียดการชำระเงินรายเดือน (ม.ค. - ธ.ค.)</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-28 bg-[#FFF2CC]">ยอดรวมชำระ</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-28 bg-[#FFF2CC]">ยอดค้างชำระทั้งปี</th>
                <th className="px-2 py-3 border-r border-slate-400 text-center w-20">จำนวนงวดที่ค้าง</th>
                <th className="px-2 py-3 text-center w-20 bg-[#FCE4D6]">งวดที่ชำระ</th>
              </tr>
              {/* Detailed Header Labels */}
              <tr className="bg-white text-slate-500 font-bold uppercase border-b border-slate-400">
                <th className="px-2 py-3 border-r border-slate-400 text-center w-12">ลำดับ</th>
                <th className="px-4 py-3 border-r border-slate-400 text-center min-w-[150px]" colSpan={2}>ชื่อ</th>
                <th className="px-4 py-3 border-r border-slate-400 text-center min-w-[150px]">นามสกุล</th>
                <th className="border-r border-slate-400"></th>
                <th className="border-r border-slate-400"></th>
                <th className="border-r border-slate-400"></th>
                {months.map((m) => (
                  <th key={m} className="px-1 py-3 border-r border-slate-400 text-center w-[75px]">{m}</th>
                ))}
                <th className="border-r border-slate-400 bg-[#FFF2CC]"></th>
                <th className="border-r border-slate-400 bg-[#FFF2CC]"></th>
                <th className="border-r border-slate-400"></th>
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
                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 bg-slate-50">{formatNum(row.debtBf)}</td>
                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 bg-slate-50 font-bold">{formatNum(row.monthlyInstallment)}</td>
                  
                  {/* คอลัมน์เดือน 1-12 */}
                  {row.monthlyPaid.map((val, idx) => (
                    <td key={idx} className={`px-1 py-1 border-r border-slate-400 text-right pr-2 ${val > 0 ? 'text-black font-bold' : 'text-transparent'}`}>
                      {formatNum(val)}
                    </td>
                  ))}

                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 font-bold bg-[#FFF2CC]">{formatNum(row.totalPaidYear)}</td>
                  <td className="px-2 py-1 border-r border-slate-400 text-right pr-4 font-bold bg-[#FFF2CC]">{formatNum(row.debtBalanceDisplay)}</td>
                  
                  {/* ช่องสีสถานะจำนวนงวดที่ค้าง */}
                  <td className={`px-2 py-1 border-r border-slate-400 text-center ${getMissedStatusColor(row.missedCount)}`}>
                    {row.missedCount}
                  </td>
                  
                  {/* งวดที่ชำระ (สีชมพูอ่อน) */}
                  <td className="px-2 py-1 text-center font-bold bg-[#FCE4D6] text-slate-800">
                    {row.installmentsPaid}
                  </td>
                </tr>
              ))}
              
              {/* Empty state */}
              {yearlyData.length === 0 && (
                <tr>
                  <td colSpan={22} className="py-24 text-center text-slate-300">
                    <div className="flex flex-col items-center justify-center">
                       <FileText className="w-16 h-16 mb-4 opacity-10" />
                       <p className="font-black">ไม่พบข้อมูลสมาชิกในปี {targetYear}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button & Footer Info */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-center gap-4">
        <button 
          onClick={() => alert('ฟังก์ชันส่งออก Excel จะพร้อมใช้งานเร็วๆ นี้')}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download className="w-5 h-5" /> ส่งออกเป็นไฟล์ EXCEL (.xlsx)
        </button>
        
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">หมายเหตุ: ข้อมูลอัปเดตแบบเรียลไทม์จากการบันทึกชำระเงิน</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">* ยอดค้างทั้งปี = ยอดค้างยกมา + (ยอดต่องวด x 12) - ยอดชำระจริงในปีนี้</p>
        </div>
      </div>

      {/* Print Styles */}
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
          .bg-[#FFF2CC] { background-color: #FFF2CC !important; }
          .bg-[#FCE4D6] { background-color: #FCE4D6 !important; }
          .bg-[#00FF00] { background-color: #00FF00 !important; }
          .bg-[#FFFF00] { background-color: #FFFF00 !important; }
          .bg-[#FF6B6B] { background-color: #FF6B6B !important; }
          @page { size: landscape; margin: 0.5cm; }
        }
      `}</style>
    </div>
  );
};
