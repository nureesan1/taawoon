
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Save, CheckCircle2, Search, Calendar, ChevronDown, 
  Trash2, Plus, Printer, Banknote, Landmark, FileText,
  X
} from 'lucide-react';
import { Member } from '../types';

interface ReceiptItem {
  id: string;
  qty: string;
  description: string;
  pricePerUnit: string;
  baht: string;
  satang: string;
}

const DEFAULT_DESCRIPTIONS = [
  "ค่าที่ดิน",
  "ค่าบ้าน",
  "ค่าหุ้น",
  "ฝากออมเพื่อสร้างบ้าน",
  "สวัสดิการ",
  "ประกันภัยบ้าน",
  "บริจาคบริหารสหกรณ์",
  "สินเชื่อทั่วไป",
  "อื่นๆ"
];

const BANK_ACCOUNTS = [
  { label: "ธนาคารอิสลาม เลขที่ 054-1-06123-2", bank: "ธนาคารอิสลาม", accNo: "054-1-06123-2" },
  { label: "ธนาคารอิสลาม เลขที่ 054-1-06120-8", bank: "ธนาคารอิสลาม", accNo: "054-1-06120-8" },
  { label: "ธนาคารอิสลาม เลขที่ 054-1-20613-3", bank: "ธนาคารอิสลาม", accNo: "054-1-20613-3" },
];

// Thai Baht Text Conversion Utility
function thaiBahtText(num: number): string {
  if (num === 0) return "ศูนย์บาทถ้วน";
  const thaiNumbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const thaiUnits = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  
  const convert = (n: string): string => {
    let res = "";
    const len = n.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(n[i]);
      if (digit !== 0) {
        if (i === len - 1 && digit === 1 && len > 1) res += "เอ็ด";
        else if (i === len - 2 && digit === 2) res += "ยี่สิบ";
        else if (i === len - 2 && digit === 1) res += "สิบ";
        else res += thaiNumbers[digit] + thaiUnits[len - i - 1];
      }
    }
    return res;
  };

  const [baht, satang] = num.toFixed(2).split(".");
  let text = convert(baht) + "บาท";
  
  if (parseInt(satang) === 0) {
    text += "ถ้วน";
  } else {
    text += convert(satang) + "สตางค์";
  }
  return text;
}

export const RecordPayment: React.FC = () => {
  const { members, addTransaction, currentUser, setView } = useStore();
  
  // Member Selection
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Receipt Details
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [transferDetails, setTransferDetails] = useState({
    bank: '',
    account: '',
    time: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Items State - Defaulting numeric values to "0" or "00" as requested
  const [items, setItems] = useState<ReceiptItem[]>([
    { id: '1', qty: '0', description: 'ค่าที่ดิน', pricePerUnit: '0', baht: '0', satang: '00' },
    { id: '2', qty: '0', description: 'ค่าบ้าน', pricePerUnit: '0', baht: '0', satang: '00' },
    { id: '3', qty: '0', description: 'ค่าหุ้น', pricePerUnit: '0', baht: '0', satang: '00' },
    { id: '4', qty: '0', description: 'ฝากออมเพื่อสร้างบ้าน', pricePerUnit: '0', baht: '0', satang: '00' },
    { id: '5', qty: '0', description: 'สวัสดิการ', pricePerUnit: '0', baht: '0', satang: '00' },
    { id: '6', qty: '0', description: 'ประกันภัยบ้าน', pricePerUnit: '0', baht: '0', satang: '00' },
    { id: '7', qty: '0', description: 'บริจาคบริหารสหกรณ์', pricePerUnit: '0', baht: '0', satang: '00' },
    { id: '8', qty: '0', description: 'สินเชื่อทั่วไป', pricePerUnit: '0', baht: '0', satang: '00' },
  ]);

  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-calculation
  const totalBaht = useMemo(() => {
    return items.reduce((sum, item) => {
      const val = parseFloat(item.baht.replace(/,/g, ''));
      return isNaN(val) ? sum : sum + val;
    }, 0);
  }, [items]);

  const totalSatang = useMemo(() => {
    return items.reduce((sum, item) => {
      const val = parseFloat(item.satang.replace(/,/g, ''));
      return isNaN(val) ? sum : sum + val;
    }, 0);
  }, [items]);

  const grandTotal = totalBaht + (totalSatang / 100);

  // Handlers
  const addItem = () => {
    const newItem: ReceiptItem = {
      id: Date.now().toString(),
      qty: '0',
      description: '',
      pricePerUnit: '0',
      baht: '0',
      satang: '00'
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ReceiptItem, value: string) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const newItem = { ...item, [field]: value };

      // Logic: If user updates Qty or Price Per Unit, auto-calc Baht
      // (Only if they are numbers and not just empty/dash)
      if (field === 'qty' || field === 'pricePerUnit') {
        const q = parseFloat(newItem.qty.replace(/,/g, ''));
        const p = parseFloat(newItem.pricePerUnit.replace(/,/g, ''));
        if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
          newItem.baht = (q * p).toLocaleString('th-TH');
          newItem.satang = '00';
        }
      }

      return newItem;
    }));
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setSearchQuery(member.name);
    setIsDropdownOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) { alert("กรุณาเลือกสมาชิก"); return; }
    if (grandTotal === 0) { alert("กรุณาระบุยอดเงิน"); return; }

    if (!confirm(`ยืนยันการบันทึกยอดรวม ${grandTotal.toLocaleString()} บาท?`)) return;

    // Map items to transaction format
    const mapping: Record<string, string> = {
        'ค่าที่ดิน': 'land',
        'ค่าบ้าน': 'housing',
        'ค่าหุ้น': 'shares',
        'ฝากออมเพื่อสร้างบ้าน': 'savings',
        'สวัสดิการ': 'welfare',
        'ประกันภัยบ้าน': 'insurance',
        'บริจาคบริหารสหกรณ์': 'donation',
        'สินเชื่อทั่วไป': 'generalLoan'
    };

    const txData: any = {
        land: 0, housing: 0, shares: 0, savings: 0,
        welfare: 0, insurance: 0, donation: 0, generalLoan: 0,
        others: 0, othersNote: ''
    };

    items.forEach(item => {
        const field = mapping[item.description];
        const val = parseFloat(item.baht.replace(/,/g, '')) || 0;
        if (field) {
            txData[field] = val;
        } else if (item.description.trim() !== '') {
            txData.others += val;
            txData.othersNote += `${item.description} `;
        }
    });

    const success = await addTransaction({
      memberId: selectedMember.id,
      date: transactionDate,
      ...txData,
      totalAmount: grandTotal,
      recordedBy: currentUser?.name || 'Unknown',
      paymentMethod,
      bankName: paymentMethod === 'transfer' ? transferDetails.bank : undefined,
      bankAccount: paymentMethod === 'transfer' ? transferDetails.account : undefined
    });

    if (success) {
      setIsSuccess(true);
      // Redirect to daily summary after short delay to show success state
      setTimeout(() => {
        setView('daily_summary');
      }, 1500);
    }
  };

  const filteredMembers = searchQuery.trim() === '' 
    ? members.slice(0, 10) 
    : members.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.memberCode.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 20);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-5xl mx-auto pb-40 px-4 print:p-0">
      
      {/* Web Only Header */}
      <div className="print:hidden mb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-[#064e3b] p-4 rounded-3xl text-white shadow-xl">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">ออกใบเสร็จรับเงิน</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-1">Receipt Generation System</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Member Selection (Web Only) */}
        <div className="print:hidden bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 space-y-6 relative z-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative" ref={dropdownRef}>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">ผู้ชำระเงิน (MEMBER)</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-5 pl-14 border-2 border-slate-50 rounded-3xl focus:border-teal-500 bg-slate-50/50 outline-none font-black text-slate-700 transition-all text-xl"
                  placeholder="ค้นหาสมาชิก..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                  onFocus={() => setIsDropdownOpen(true)}
                />
                <Search className="w-6 h-6 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
              </div>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-72 overflow-y-auto z-[60]">
                  {filteredMembers.map(m => (
                    <button key={m.id} type="button" onClick={() => handleSelectMember(m)} className="w-full text-left px-8 py-5 hover:bg-teal-50 border-b border-slate-50 flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-[#064e3b] group-hover:text-white transition-colors">{m.name.charAt(0)}</div>
                      <div>
                        <p className="font-black text-slate-800 text-lg">{m.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{m.memberCode}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">วันที่ (DATE)</label>
              <div className="relative">
                <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="w-full p-5 pl-14 border-2 border-slate-50 rounded-3xl focus:border-teal-500 bg-slate-50/50 outline-none font-black text-slate-700 transition-all text-xl" />
                <Calendar className="w-6 h-6 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* The Receipt Structure (Matches physical paper) */}
        <div className="bg-white md:shadow-none border-2 border-slate-900 p-8 print:border-none print:shadow-none print:p-0">
          
          <div className="hidden print:block text-center mb-8">
            <h2 className="text-2xl font-black">ใบเสร็จรับเงิน</h2>
            <h3 className="text-xl font-bold mt-1">สหกรณ์เคหสถานบ้านมั่นคงชุมชนตะอาวุน จำกัด</h3>
            <div className="flex justify-between mt-6 text-left">
              <span>ได้รับเงินจาก: {selectedMember?.name || '...................................................'}</span>
              <span>รหัสสมาชิก: {selectedMember?.memberCode || '................'}</span>
              <span>วันที่: {new Date(transactionDate).toLocaleDateString('th-TH')}</span>
            </div>
          </div>

          <div className="text-left mb-6">
             <p className="text-sm font-bold text-slate-600 print:text-black">ตามรายการดังต่อไปนี้</p>
          </div>

          {/* Receipt Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-[2.5px] border-slate-900 print:border-black">
              <thead>
                <tr className="bg-slate-50 print:bg-transparent">
                  <th className="border-2 border-slate-900 print:border-black px-4 py-3 text-sm font-black text-center w-24">จำนวน</th>
                  <th className="border-2 border-slate-900 print:border-black px-4 py-3 text-sm font-black text-left">รายการ</th>
                  <th className="border-2 border-slate-900 print:border-black px-4 py-3 text-sm font-black text-center w-20" title="ยอดต่อหน่วย">@</th>
                  <th className="border-2 border-slate-900 print:border-black px-4 py-3 text-sm font-black text-center w-48" colSpan={2}>
                    จำนวนเงิน
                    <div className="grid grid-cols-2 mt-1 border-t-2 border-slate-900 print:border-black">
                       <span className="text-[10px] py-1 border-r-2 border-slate-900 print:border-black">บาท</span>
                       <span className="text-[10px] py-1">สต.</span>
                    </div>
                  </th>
                  <th className="print:hidden border-2 border-slate-900 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-900 print:divide-black">
                {items.map((item, idx) => (
                  <tr key={item.id} className="group h-12">
                    <td className="border-2 border-slate-900 print:border-black p-1 text-center">
                      <div className="relative h-full flex items-center justify-center">
                        <input 
                          type="text" 
                          value={item.qty} 
                          onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full h-10 px-2 text-center bg-white print:bg-transparent border border-slate-200 print:border-none rounded shadow-inner print:shadow-none outline-none font-bold"
                        />
                      </div>
                    </td>
                    <td className="border-2 border-slate-900 print:border-black p-0">
                      <div className="relative h-full">
                        <select 
                          className="w-full h-full p-3 bg-transparent outline-none font-bold appearance-none print:hidden"
                          value={DEFAULT_DESCRIPTIONS.includes(item.description) ? item.description : "อื่นๆ"}
                          onChange={(e) => {
                             if (e.target.value === "อื่นๆ") updateItem(item.id, 'description', '');
                             else updateItem(item.id, 'description', e.target.value);
                          }}
                        >
                          <option value="">-- เลือกรายการ --</option>
                          {DEFAULT_DESCRIPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        {/* Always show text input for print and when manual entry is needed */}
                        {(!DEFAULT_DESCRIPTIONS.includes(item.description) || window.matchMedia('print').matches) && (
                            <input 
                                type="text" 
                                placeholder="ระบุรายการ..."
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                className="absolute inset-0 w-full h-full p-3 bg-white print:bg-transparent outline-none font-bold"
                            />
                        )}
                        {/* Hidden text for print display when description is selected from list */}
                        <div className="hidden print:block p-3 font-bold">{item.description}</div>
                      </div>
                    </td>
                    <td className="border-2 border-slate-900 print:border-black p-1">
                      <input 
                        type="text" 
                        value={item.pricePerUnit} 
                        onChange={(e) => updateItem(item.id, 'pricePerUnit', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full h-10 text-center bg-white print:bg-transparent border border-slate-200 print:border-none rounded shadow-inner print:shadow-none outline-none font-bold"
                      />
                    </td>
                    <td className="border-2 border-slate-900 print:border-black p-1">
                      <div className="relative h-full flex items-center">
                        <input 
                          type="text" 
                          value={item.baht} 
                          onChange={(e) => updateItem(item.id, 'baht', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full h-10 px-2 text-right bg-white print:bg-transparent border border-slate-200 print:border-none rounded shadow-inner print:shadow-none outline-none font-black text-lg"
                        />
                      </div>
                    </td>
                    <td className="border-2 border-slate-900 print:border-black p-0 w-16">
                      <input 
                        type="text" 
                        maxLength={2}
                        value={item.satang} 
                        onChange={(e) => updateItem(item.id, 'satang', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full h-10 px-2 text-center bg-transparent outline-none font-bold"
                      />
                    </td>
                    <td className="print:hidden p-0 border-none">
                       <button type="button" onClick={() => removeItem(item.id)} className="p-3 text-red-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                         <Trash2 className="w-5 h-5" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white print:bg-transparent border-t-[3px] border-slate-900 print:border-black">
                  <td colSpan={2} className="border-2 border-slate-900 print:border-black px-6 py-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 print:text-black">จำนวนเงินตัวอักษร</p>
                    <p className="text-base font-black text-[#064e3b] print:text-black italic">"{thaiBahtText(grandTotal)}"</p>
                  </td>
                  <td className="border-2 border-slate-900 print:border-black px-4 py-4 text-center font-black text-lg">รวมเงิน</td>
                  <td className="border-2 border-slate-900 print:border-black px-4 py-4 text-right font-black text-2xl border-r-0">
                    {totalBaht.toLocaleString('th-TH')}
                  </td>
                  <td className="border-2 border-slate-900 print:border-black px-4 py-4 text-center font-black text-lg">
                    {totalSatang.toString().padStart(2, '0')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 print:hidden">
             <button type="button" onClick={addItem} className="flex items-center gap-2 text-teal-600 font-black hover:text-teal-700 transition-colors">
                <Plus className="w-5 h-5" /> เพิ่มรายการใหม่
             </button>
          </div>

          {/* Footer of Receipt */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 print:border-none print:bg-transparent print:p-0">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 print:text-black">วิธีการรับชำระเงิน</p>
                   <div className="flex gap-6 print:block">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="radio" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="w-6 h-6 text-teal-600 focus:ring-teal-500" />
                        <span className="font-black text-slate-700 group-hover:text-teal-600">เงินสด (CASH)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="radio" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} className="w-6 h-6 text-blue-600 focus:ring-blue-500" />
                        <span className="font-black text-slate-700 group-hover:text-blue-600">เงินโอน (TRANSFER)</span>
                      </label>
                   </div>
                   
                   {paymentMethod === 'transfer' && (
                     <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 print:block">
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">บัญชีธนาคาร</label>
                              <select 
                                className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 transition-all appearance-none"
                                value={`${transferDetails.bank} ${transferDetails.account}`}
                                onChange={(e) => {
                                  const selected = BANK_ACCOUNTS.find(acc => `${acc.bank} ${acc.accNo}` === e.target.value);
                                  if (selected) {
                                    setTransferDetails({
                                      ...transferDetails,
                                      bank: selected.bank,
                                      account: selected.accNo
                                    });
                                  } else {
                                    setTransferDetails({
                                      ...transferDetails,
                                      bank: '',
                                      account: ''
                                    });
                                  }
                                }}
                              >
                                <option value="">-- เลือกบัญชีธนาคาร --</option>
                                {BANK_ACCOUNTS.map((acc, idx) => (
                                  <option key={idx} value={`${acc.bank} ${acc.accNo}`}>
                                    {acc.label}
                                  </option>
                                ))}
                                <option value="manual">กรอกข้อมูลเอง...</option>
                              </select>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <label className="text-[9px] font-bold text-slate-400">ธนาคาร</label>
                                 <input type="text" placeholder="ระบุธนาคาร..." className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold" value={transferDetails.bank} onChange={(e) => setTransferDetails({...transferDetails, bank: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[9px] font-bold text-slate-400">เลขที่บัญชี/อ้างอิง</label>
                                 <input type="text" placeholder="ระบุเลขที่..." className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold" value={transferDetails.account} onChange={(e) => setTransferDetails({...transferDetails, account: e.target.value})} />
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             </div>

             <div className="flex flex-col justify-end">
                <div className="grid grid-cols-2 gap-10 pt-10">
                   <div className="text-center">
                      <div className="border-b-2 border-slate-900 h-12 flex items-end justify-center font-bold italic mb-2">
                        {currentUser?.name}
                      </div>
                      <p className="text-sm font-bold text-slate-600">ผู้รับเงิน</p>
                   </div>
                   <div className="text-center">
                      <div className="border-b-2 border-slate-900 h-12 mb-2"></div>
                      <p className="text-sm font-bold text-slate-600">ผู้จ่ายเงิน</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Action Buttons (Web Only) - Separated Confirm and Print */}
        <div className="print:hidden flex justify-end gap-6 pt-4">
           <button 
             type="button"
             onClick={handlePrint}
             className="px-10 py-5 rounded-[2.5rem] font-black text-xl shadow-xl flex items-center gap-3 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 group"
           >
             <Printer className="w-6 h-6 group-hover:rotate-6 transition-transform" /> 
             พิมพ์ใบเสร็จ
           </button>
           
           <button 
             type="submit" 
             disabled={isSuccess || !selectedMember || grandTotal <= 0}
             className={`px-14 py-5 rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center gap-4 transition-all active:scale-95 disabled:grayscale disabled:opacity-50
               ${paymentMethod === 'transfer' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/20'}`}
           >
             {isSuccess ? (
               <><CheckCircle2 className="w-8 h-8 animate-bounce" /> บันทึกแล้ว</>
             ) : (
               <><Save className="w-8 h-8" /> ยืนยันการบันทึก</>
             )}
           </button>
        </div>
      </form>

      {/* Styles for Printing */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:border-none { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:text-black { color: black !important; }
          .print\\:divide-black { border-color: black !important; }
          
          .max-w-5xl { 
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          input, select, textarea {
            border: none !important;
            background: none !important;
            box-shadow: none !important;
          }

          @page {
            size: A4;
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
};
