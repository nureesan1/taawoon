
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  FileText, Download, Calendar, Banknote, 
  Search, ChevronLeft, ChevronRight, Printer, Filter
} from 'lucide-react';

export const DailySummary: React.FC = () => {
  const { members, setView } = useStore();
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 543);
  const [searchTerm, setSearchTerm] = useState('');

  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  // คำนวณข้อมูลสำหรับตารางรายปี
  const yearlyData = useMemo(() => {
    const yearAD = targetYear - 543;
    
    return members.map((member, index) => {
      const monthlyInstallment = member.monthlyInstallment || 0;
      const initialMissedCount = member.missedInstallments || 0;
      const initialDebt = monthlyInstallment * initialMissedCount;

      // สร้าง Array เก็บยอดชำระ 12 เดือน
      const monthlyPaid = Array(12).fill(0);
      const yearTxs = (member.transactions || []).filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === yearAD;
      });

      yearTxs.forEach(tx => {
        const month = new Date(tx.date).getMonth();
        // รวมยอดหนี้ 3 ประเภทหลัก
        monthlyPaid[month] += (Number(tx.housing) || 0) + (Number(tx.land) || 0) + (Number(tx.generalLoan) || 0);
      });

      const totalPaidYear = monthlyPaid.reduce((a, b) => a + b, 0);
      // งวดที่ชำระ (นับจำนวนเดือนที่มีการจ่ายเงิน)
      const installmentsPaid = monthlyPaid.filter(v => v >= monthlyInstallment).length;
      
      // ยอดค้างชำระทั้งปี (สูตร: ยอดค้างยกมา + (ยอดต่องวด * 12) - ยอดชำระจริง)
      const yearlyDebtBalance = Math.max(0, initialDebt + (monthlyInstallment * 12) - totalPaidYear);
      
      // จำนวนงวดที่ค้าง (ยอดค้างสุทธิ / ยอดต่องวด)
      const totalMissedCount = Math.ceil(yearlyDebtBalance / (monthlyInstallment || 1));

      return {
        ...member,
        no: index + 1,
        initialDebt,
        monthlyPaid,
        totalPaidYear,
        yearlyDebtBalance,
        totalMissedCount,
        installmentsPaid
      };
    }).filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.memberCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, targetYear, searchTerm]);

  const formatNum = (num: number) => num === 0 ? '' : new Intl.NumberFormat('th-TH').format(num);
  
  const getStatusColor = (count: number) => {
    if (count <= 0) return 'bg-emerald-500 text-white';
    if (count <= 12) return 'bg-green-400 text-white';
    if (count <= 36) return 'bg-yellow-400 text-slate-800';
    return 'bg-red-500 text-white';
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      
      {/* Header & Year Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-[#064e3b] p-3 rounded-2xl text-white">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">สรุปข้อมูลลูกหนี้รายปี</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yearly Debt Summary - {targetYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ..." 
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500"
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

      {/* Yearly Table Container */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              {/* Main Header Labels */}
              <tr className="bg-emerald-50 text-[10px] font-black text-slate-500 uppercase tracking-tighter border-b border-slate-200">
                <th colSpan={3} className="px-4 py-3 border-r border-slate-200 text-center bg-emerald-100/50">ข้อมูลสมาชิก</th>
                <th className="px-2 py-3 border-r border-slate-200 text-center">ค้างเก่า</th>
                <th className="px-2 py-3 border-r border-slate-200 text-center">ค้างยกมา</th>
                <th className="px-2 py-3 border-r border-slate-200 text-center bg-yellow-50">ชำระ</th>
                <th colSpan={12} className="px-2 py-3 border-r border-slate-200 text-center">รายละเอียดการชำระเงินรายเดือน (ม.ค. - ธ.ค.)</th>
                <th className="px-2 py-3 border-r border-slate-200 text-center bg-orange-50">ยอดรวม</th>
                <th className="px-2 py-3 border-r border-slate-200 text-center bg-red-50 text-red-600">ยอดค้าง</th>
                <th colSpan={2} className="px-2 py-3 text-center bg-slate-100">สรุปผล</th>
              </tr>
              {/* Detailed Header Labels */}
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tight border-b border-slate-300 shadow-sm">
                <th className="px-3 py-4 text-center border-r border-slate-200 w-12">ลำดับ</th>
                <th className="px-4 py-4 border-r border-slate-200 min-w-[180px]">ชื่อ-สกุล</th>
                <th className="px-3 py-4 border-r border-slate-200 text-center w-20">รหัส</th>
                <th className="px-2 py-4 border-r border-slate-200 text-center w-16">จำนวนงวดที่ค้าง</th>
                <th className="px-2 py-4 border-r border-slate-200 text-right w-24">ยอดค้างยกมา</th>
                <th className="px-2 py-4 border-r border-slate-200 text-right w-24 bg-yellow-50/50">ยอดชำระต่องวด</th>
                {months.map((m, i) => (
                  <th key={m} className="px-2 py-4 border-r border-slate-200 text-center w-20">{m}({i+1})</th>
                ))}
                <th className="px-2 py-4 border-r border-slate-200 text-right w-24 bg-orange-50/50">ยอดรวมชำระ</th>
                <th className="px-2 py-4 border-r border-slate-200 text-right w-24 bg-red-50/50">ยอดค้างทั้งปี</th>
                <th className="px-2 py-4 border-r border-slate-200 text-center w-16">งวดค้าง</th>
                <th className="px-2 py-4 text-center w-16">งวดที่ชำระ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] font-bold">
              {yearlyData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-all h-12">
                  <td className="px-3 py-2 text-center border-r border-slate-100 text-slate-400">{row.no}</td>
                  <td className="px-4 py-2 border-r border-slate-100 font-black text-slate-800">{row.name}</td>
                  <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-blue-500">{row.memberCode}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-center">{row.missedInstallments || 0}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-right">{formatNum(row.initialDebt)}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-right font-black text-teal-600 bg-yellow-50/30">{formatNum(row.monthlyInstallment)}</td>
                  
                  {/* คอลัมน์เดือน 1-12 */}
                  {row.monthlyPaid.map((val, idx) => (
                    <td key={idx} className={`px-2 py-2 border-r border-slate-100 text-right ${val > 0 ? 'text-slate-900 font-black' : 'text-slate-200'}`}>
                      {formatNum(val)}
                    </td>
                  ))}

                  <td className="px-2 py-2 border-r border-slate-100 text-right font-black text-slate-800 bg-orange-50/30">{formatNum(row.totalPaidYear)}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-right font-black text-red-600 bg-red-50/30">{formatNum(row.yearlyDebtBalance)}</td>
                  
                  {/* สรุปจำนวนงวดที่ค้าง (สีตามความรุนแรง) */}
                  <td className={`px-2 py-2 border-r border-slate-100 text-center font-black ${getStatusColor(row.totalMissedCount)}`}>
                    {row.totalMissedCount}
                  </td>
                  
                  {/* งวดที่ชำระ (เฉดสีเขียวอ่อน) */}
                  <td className="px-2 py-2 text-center font-black bg-teal-100 text-teal-800">
                    {row.installmentsPaid}
                  </td>
                </tr>
              ))}
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

      {/* Footer Instructions (Web Only) */}
      <div className="print:hidden bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-4">
        <div className="p-2 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-200">
          <Download className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">ข้อมูลการชำระเงินรายปี</h3>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            ตารางนี้สรุปยอดชำระจาก **ค่าบ้าน, ค่าที่ดิน และ สินเชื่อทั่วไป** โดยคำนวณตามงวดปฏิทิน มกราคม - ธันวาคม <br/>
            คุณสามารถใช้หน้าจอนี้เพื่อตรวจสอบสถานะหนี้คงเหลือรวมของสมาชิกทุกคน และใช้ในการออกรายงานสรุปยอดปลายปีได้ทันที
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          aside, header, nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          .max-w-7xl { max-width: 100% !important; }
          .shadow-sm, .shadow-xl { box-shadow: none !important; }
          .bg-white { border: none !important; }
          table { font-size: 8pt !important; width: 100% !important; }
          th, td { border: 0.5pt solid #ccc !important; padding: 4pt !important; }
          .rounded-\\[2rem\\], .rounded-3xl { border-radius: 0 !important; }
          .bg-emerald-50, .bg-slate-50 { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
          .overflow-x-auto { overflow: visible !important; }
          @page { size: landscape; margin: 0.5cm; }
        }
      `}</style>
    </div>
  );
};
