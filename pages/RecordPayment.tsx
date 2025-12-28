
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, CheckCircle2, User, Search, Calendar, ChevronDown, Zap, Info, Eraser, Keyboard } from 'lucide-react';
import { Member } from '../types';

export const RecordPayment: React.FC = () => {
  const { members, addTransaction, currentUser, setView } = useStore();
  
  // State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  
  // Searchable Dropdown State
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form Data
  const [formData, setFormData] = useState({
    land: '',
    housing: '',
    shares: '',
    savings: '',
    welfare: '',
    insurance: '',
    donation: '',
    generalLoan: '',
    others: '',
    othersNote: ''
  });

  // Filter Members for Dropdown
  const cleanSearch = searchQuery.trim().toLowerCase();
  const filteredMembers = cleanSearch === '' 
    ? members.slice(0, 15) 
    : members.filter(m => 
        m.name.toLowerCase().includes(cleanSearch) || 
        m.memberCode.toLowerCase().includes(cleanSearch) ||
        (m.personalInfo?.idCard && String(m.personalInfo.idCard).includes(cleanSearch))
      ).slice(0, 30);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setSearchQuery(member.name);
    setIsDropdownOpen(false);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    if (field === 'othersNote') {
        setFormData(prev => ({ ...prev, [field]: value }));
        return;
    }
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Smart Parser for Quick Entry
  const handleQuickInputChange = (value: string) => {
    setQuickInput(value);
    // Split by any whitespace or comma
    const parts = value.trim().split(/[\s,]+/).filter(p => p !== '');
    
    if (parts.length > 0) {
      const keys: (keyof typeof formData)[] = [
        'land', 'housing', 'shares', 'savings', 
        'welfare', 'insurance', 'donation', 'generalLoan'
      ];
      
      const newFormData = { ...formData };
      parts.forEach((val, idx) => {
        if (idx < keys.length) {
          const num = val.replace(/,/g, '');
          if (!isNaN(parseFloat(num))) {
            newFormData[keys[idx]] = num;
          }
        }
      });
      setFormData(newFormData);
    }
  };

  const handleClearForm = () => {
    if (confirm('ล้างข้อมูลที่กรอกไว้ทั้งหมด?')) {
      setQuickInput('');
      setFormData({
        land: '', housing: '', shares: '', savings: '', 
        welfare: '', insurance: '', donation: '', generalLoan: '',
        others: '', othersNote: ''
      });
    }
  }

  const getNumericValue = (val: string) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const totalAmount = Object.entries(formData)
    .filter(([key]) => key !== 'othersNote')
    .reduce((sum, [, val]) => sum + getNumericValue(val as string), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
        alert("กรุณาเลือกสมาชิก");
        return;
    }
    if (totalAmount === 0) {
        alert("กรุณาระบุยอดเงินอย่างน้อย 1 รายการ");
        return;
    }

    if (!confirm(`ยืนยันการรับชำระเงินรวม ${new Intl.NumberFormat('th-TH').format(totalAmount)} บาท?`)) return;

    const success = await addTransaction({
      memberId: selectedMember.id,
      date: transactionDate,
      land: getNumericValue(formData.land),
      housing: getNumericValue(formData.housing),
      shares: getNumericValue(formData.shares),
      savings: getNumericValue(formData.savings),
      welfare: getNumericValue(formData.welfare),
      insurance: getNumericValue(formData.insurance),
      donation: getNumericValue(formData.donation),
      generalLoan: getNumericValue(formData.generalLoan),
      others: getNumericValue(formData.others),
      othersNote: formData.othersNote,
      totalAmount,
      recordedBy: currentUser?.name || 'Unknown'
    });
    
    if (success) {
        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            // Redirect to summary page so user can see the new item
            setView('daily_summary');
        }, 1500);
    }
  };

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

  const InputField = ({ label, field, color = "slate", placeholder = "0.00" }: { label: string, field: keyof typeof formData, color?: string, placeholder?: string }) => {
    const value = formData[field];
    const isFilled = field !== 'othersNote' && getNumericValue(value as string) > 0;

    return (
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</label>
          {field === 'othersNote' ? (
             <input
                type="text"
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none transition-all text-sm"
                value={value}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={placeholder}
            />
          ) : (
            <div className="relative">
                <input
                type="text"
                inputMode="decimal"
                className={`w-full p-2.5 pl-3 pr-8 border rounded-lg focus:ring-2 focus:outline-none transition-all font-bold text-base
                    ${isFilled ? `border-${color}-500 bg-${color}-50 ring-${color}-100 text-${color}-700` : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100 text-slate-700'}`}
                value={value}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={placeholder}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs">฿</span>
            </div>
          )}
        </div>
    );
  };

  if (isSuccess) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">บันทึกเรียบร้อย</h2>
            <p className="text-red-600 text-3xl font-bold">ยอดเงิน {formatTHB(totalAmount)}</p>
            <p className="text-slate-400 mt-4 animate-pulse">กำลังไปยังหน้าสรุปรายงาน...</p>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-2">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ระบบรับชำระเงิน</h1>
          <p className="text-slate-500 text-sm">บันทึกรายการรับเงินจากสมาชิก</p>
        </div>
        <button 
          type="button"
          onClick={handleClearForm}
          className="text-slate-400 hover:text-red-500 flex items-center gap-1.5 text-xs font-medium transition-colors"
        >
          <Eraser className="w-3.5 h-3.5" />
          ล้างข้อมูลทั้งหมด
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-30">
            <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" />
                    เลือกสมาชิก
                </label>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all cursor-pointer"
                        placeholder="พิมพ์ชื่อ, รหัส หรือ เลขบัตร..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsDropdownOpen(true);
                            if (selectedMember) setSelectedMember(null);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <ChevronDown className={`w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50">
                        {filteredMembers.length > 0 ? (
                            filteredMembers.map(member => (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => handleSelectMember(member)}
                                    className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-slate-50 last:border-0 transition-colors flex justify-between items-center group"
                                >
                                    <div>
                                        <p className="font-bold text-slate-700 group-hover:text-teal-700">{member.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">{member.memberCode} | {member.personalInfo?.idCard}</p>
                                    </div>
                                    {selectedMember?.id === member.id && <CheckCircle2 className="w-5 h-5 text-teal-500" />}
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-sm">ไม่พบรายชื่อสมาชิก</div>
                        )}
                    </div>
                )}
            </div>
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    วันที่ชำระ
                </label>
                <input 
                    type="date"
                    required
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all font-medium"
                />
            </div>
        </div>

        {/* Smart Quick Entry Box */}
        <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-5 space-y-3 relative z-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-indigo-900">ช่องกรอกข้อมูลด่วน (Quick Entry / Paste)</h3>
                </div>
                <div className="group relative">
                    <Info className="w-4 h-4 text-indigo-300 cursor-help" />
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-800 text-white text-[10px] p-3 rounded-lg shadow-xl leading-relaxed z-50">
                        <p className="font-bold mb-1 border-b border-slate-600 pb-1">ลำดับการวางข้อมูล (คั่นด้วยวรรค หรือ Tab):</p>
                        <ol className="list-decimal list-inside space-y-0.5 opacity-90">
                            <li>ค่าที่ดิน</li><li>ค่าบ้าน</li><li>ค่าหุ้น</li><li>เงินฝาก</li>
                            <li>สวัสดิการ</li><li>ประกัน</li><li>บริจาค</li><li>สินเชื่อ</li>
                        </ol>
                    </div>
                </div>
            </div>
            <div className="relative">
                <input 
                    type="text"
                    placeholder="วางข้อมูลจาก Excel หรือพิมพ์ตัวเลขเว้นวรรค เช่น '100 200 500 ...'"
                    className="w-full p-4 pl-12 bg-white border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-mono text-indigo-700 shadow-sm"
                    value={quickInput}
                    onChange={(e) => handleQuickInputChange(e.target.value)}
                />
                <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 w-5 h-5" />
            </div>
            <p className="text-[10px] text-indigo-400 italic">* ระบบจะกระจายตัวเลขลงในช่องด้านล่างให้อัตโนมัติตามลำดับ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-700 text-sm">รายการชำระเงินรายข้อ</h2>
                {selectedMember && (
                    <div className="text-[11px] text-slate-500 bg-teal-50 px-2 py-1 rounded-full border border-teal-100">
                        กำลังบันทึกให้: <span className="font-bold text-teal-700">{selectedMember.name}</span>
                    </div>
                )}
            </div>
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                <InputField label="1. ค่าที่ดิน (Land)" field="land" color="red" />
                <InputField label="2. ค่าบ้าน (Housing)" field="housing" color="red" />
                <InputField label="3. ค่าหุ้น (Shares)" field="shares" color="emerald" />
                <InputField label="4. เงินฝาก (Savings)" field="savings" color="emerald" />
                <InputField label="5. สวัสดิการ (Welfare)" field="welfare" color="blue" />
                <InputField label="6. ประกันดินบ้าน (Insurance)" field="insurance" color="blue" />
                <InputField label="7. บริจาคบริหาร (Donation)" field="donation" color="blue" />
                <InputField label="8. สินเชื่อทั่วไป (Loan)" field="generalLoan" color="amber" />
                <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                    <div className="md:col-span-1">
                        <InputField label="9. อื่นๆ (ระบุยอดเงิน)" field="others" color="slate" />
                    </div>
                    <div className="md:col-span-2">
                        <InputField label="รายละเอียด (ระบุค่าใช้จ่าย)" field="othersNote" placeholder="เช่น ค่าธรรมเนียมแรกเข้า" />
                    </div>
                </div>
            </div>
            <div className="bg-slate-800 text-white p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">ยอดรวมรับชำระสุทธิ</p>
                    <p className="text-4xl font-bold text-red-500">{formatTHB(totalAmount)}</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button 
                        type="submit"
                        disabled={!selectedMember || totalAmount === 0}
                        className="flex-1 md:flex-none px-10 py-4 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold shadow-lg shadow-teal-900/50 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-lg"
                    >
                        <Save className="w-5 h-5" />
                        ยืนยันบันทึก
                    </button>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
};
