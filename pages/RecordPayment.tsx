
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, CheckCircle2, User, Search, Calendar, ChevronDown, Zap, Info, Eraser, Keyboard, Banknote, Landmark, XCircle } from 'lucide-react';
import { Member } from '../types';

export const RecordPayment: React.FC = () => {
  const { members, addTransaction, currentUser, setView } = useStore();
  
  // State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
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
    // Allow digits and one decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const clearField = (field: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [field]: '' }));
  };

  // Smart Parser for Quick Entry
  const handleQuickInputChange = (value: string) => {
    setQuickInput(value);
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
      setPaymentMethod('cash');
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

    if (!confirm(`ยืนยันการรับชำระเงิน (${paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน'}) รวม ${new Intl.NumberFormat('th-TH').format(totalAmount)} บาท?`)) return;

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
      recordedBy: currentUser?.name || 'Unknown',
      paymentMethod
    });
    
    if (success) {
        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            setView('daily_summary');
        }, 1500);
    }
  };

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

  const InputField = ({ label, field, color = "slate", placeholder = "0.00" }: { label: string, field: keyof typeof formData, color?: string, placeholder?: string }) => {
    const value = formData[field];
    const isFilled = field !== 'othersNote' && getNumericValue(value as string) > 0;

    return (
        <div className="space-y-1.5 group">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-focus-within:text-teal-600 transition-colors">{label}</label>
          {field === 'othersNote' ? (
             <input
                type="text"
                className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-50 focus:border-teal-500 outline-none transition-all text-sm font-medium"
                value={value}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={placeholder}
            />
          ) : (
            <div className="relative">
                <input
                type="text"
                inputMode="decimal"
                className={`w-full p-4 pl-4 pr-10 border rounded-2xl focus:ring-4 focus:outline-none transition-all font-black text-xl
                    ${isFilled ? `border-${color}-500 bg-${color}-50/50 ring-${color}-100 text-${color}-700` : 'border-slate-200 focus:border-teal-500 focus:ring-teal-50 text-slate-700'}`}
                value={value}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={placeholder}
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold ${isFilled ? `text-${color}-400` : 'text-slate-300'}`}>฿</span>
                {isFilled && (
                    <button 
                      type="button" 
                      onClick={() => clearField(field)}
                      className="absolute -top-2 -right-2 bg-white rounded-full shadow-sm text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                )}
            </div>
          )}
        </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between px-4 md:px-0 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">รับชำระเงิน</h1>
          <p className="text-slate-500 font-medium">บันทึกข้อมูลการรับเงินสดและเงินโอนรายวัน</p>
        </div>
        <div className="flex gap-2">
           <button 
              type="button"
              onClick={handleClearForm}
              className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-xs font-black transition-all"
            >
              <Eraser className="w-4 h-4" />
              ล้างข้อมูลทั้งหมด
            </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Selection Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8 space-y-8 relative z-30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Member Search */}
                <div className="space-y-3 relative" ref={dropdownRef}>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <User className="w-4 h-4 text-teal-600" />
                        สมาชิกผู้ชำระเงิน
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full p-5 pl-14 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-teal-50 focus:border-teal-500 outline-none transition-all cursor-pointer font-black text-slate-700 bg-slate-50/30"
                            placeholder="พิมพ์ชื่อ, รหัส หรือ เลขบัตรประชาชน..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsDropdownOpen(true);
                                if (selectedMember) setSelectedMember(null);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                        />
                        <Search className="w-6 h-6 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
                        <ChevronDown className={`w-5 h-5 text-slate-300 absolute right-5 top-1/2 -translate-y-1/2 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-100 max-h-72 overflow-y-auto z-50 animate-in slide-in-from-top-2">
                            {filteredMembers.length > 0 ? (
                                filteredMembers.map(member => (
                                    <button
                                        key={member.id}
                                        type="button"
                                        onClick={() => handleSelectMember(member)}
                                        className="w-full text-left px-6 py-4 hover:bg-teal-50 border-b border-slate-50 last:border-0 transition-colors flex justify-between items-center group"
                                    >
                                        <div>
                                            <p className="font-black text-slate-700 group-hover:text-teal-700">{member.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{member.memberCode} | {member.personalInfo?.idCard}</p>
                                        </div>
                                        {selectedMember?.id === member.id && <CheckCircle2 className="w-6 h-6 text-teal-500" />}
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 font-medium">ไม่พบข้อมูลสมาชิกที่ค้นหา</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Date Picker */}
                <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        วันที่บันทึกรายการ
                    </label>
                    <input 
                        type="date"
                        required
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        className="w-full p-5 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-teal-50 focus:border-teal-500 outline-none transition-all font-black text-slate-700 bg-slate-50/30"
                    />
                </div>
            </div>

            {/* Payment Method - MODERN TOGGLE */}
            <div className="pt-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                    <Banknote className="w-4 h-4 text-teal-600" />
                    วิธีการรับชำระเงิน
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex items-center justify-center gap-4 p-5 rounded-3xl border-2 transition-all font-black text-lg ${paymentMethod === 'cash' ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'}`}
                    >
                        <Banknote className={`w-7 h-7 ${paymentMethod === 'cash' ? 'text-teal-600' : 'text-slate-200'}`} />
                        เงินสด (CASH)
                    </button>
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('transfer')}
                        className={`flex items-center justify-center gap-4 p-5 rounded-3xl border-2 transition-all font-black text-lg ${paymentMethod === 'transfer' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'}`}
                    >
                        <Landmark className={`w-7 h-7 ${paymentMethod === 'transfer' ? 'text-blue-600' : 'text-slate-200'}`} />
                        เงินโอน (TRANSFER)
                    </button>
                </div>
            </div>
        </div>

        {/* Quick Entry Box - REFINED */}
        <div className="bg-indigo-50/40 rounded-[2rem] border border-indigo-100 p-6 md:p-8 space-y-4 relative z-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest">ช่องกรอกข้อมูลด่วน (Quick Entry / Paste)</h3>
                </div>
                <div className="group relative">
                    <Info className="w-6 h-6 text-indigo-300 cursor-help hover:text-indigo-500 transition-colors" />
                    <div className="absolute right-0 bottom-full mb-4 hidden group-hover:block w-80 bg-slate-900 text-white text-[11px] p-5 rounded-3xl shadow-2xl leading-relaxed z-50 border border-slate-700">
                        <p className="font-black mb-3 border-b border-slate-700 pb-2 flex items-center gap-2"><Keyboard className="w-4 h-4 text-teal-400" /> ลำดับข้อมูล (คั่นด้วยช่องว่างหรือ Tab)</p>
                        <ol className="grid grid-cols-2 gap-x-6 gap-y-1 list-decimal list-inside opacity-90 font-medium">
                            <li>ค่าที่ดิน</li><li>ค่าบ้าน</li><li>ค่าหุ้น</li><li>เงินฝาก</li>
                            <li>สวัสดิการ</li><li>ประกัน</li><li>บริจาค</li><li>สินเชื่อ</li>
                        </ol>
                        <p className="mt-3 text-indigo-300 italic font-bold">สามารถคัดลอกทั้งแถวจาก Excel มาวางได้ทันที</p>
                    </div>
                </div>
            </div>
            <div className="relative">
                <input 
                    type="text"
                    placeholder="วางข้อมูลจาก Excel หรือพิมพ์ตัวเลขเว้นวรรค..."
                    className="w-full p-5 pl-14 bg-white border border-indigo-200 rounded-3xl focus:ring-8 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-mono text-indigo-700 shadow-sm text-lg"
                    value={quickInput}
                    onChange={(e) => handleQuickInputChange(e.target.value)}
                />
                <Keyboard className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-200 w-6 h-6" />
            </div>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest text-center">* ระบบจะกระจายตัวเลขลงในช่องด้านล่างให้อัตโนมัติตามลำดับ</p>
        </div>

        {/* Input Grid Section */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-black text-slate-500 text-[11px] uppercase tracking-[0.2em]">รายการชำระเงินรายข้อ</h2>
                {selectedMember && (
                    <div className="text-[10px] font-black text-teal-700 bg-teal-100/50 px-4 py-1.5 rounded-full border border-teal-100 uppercase tracking-widest animate-in fade-in zoom-in">
                        {selectedMember.name}
                    </div>
                )}
            </div>
            
            <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <InputField label="1. ค่าที่ดิน (Land)" field="land" color="red" />
                <InputField label="2. ค่าบ้าน (Housing)" field="housing" color="red" />
                <InputField label="3. ค่าหุ้น (Shares)" field="shares" color="emerald" />
                <InputField label="4. เงินฝาก (Savings)" field="savings" color="emerald" />
                <InputField label="5. สวัสดิการ (Welfare)" field="welfare" color="blue" />
                <InputField label="6. ประกันดินบ้าน (Insurance)" field="insurance" color="blue" />
                <InputField label="7. บริจาคบริหาร (Donation)" field="donation" color="blue" />
                <InputField label="8. สินเชื่อทั่วไป (Loan)" field="generalLoan" color="amber" />
                
                <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mt-4">
                    <div className="md:col-span-1">
                        <InputField label="9. อื่นๆ (ยอดเงิน)" field="others" color="slate" />
                    </div>
                    <div className="md:col-span-2">
                        <InputField label="รายละเอียดการใช้จ่าย" field="othersNote" placeholder="เช่น ค่าธรรมเนียมแรกเข้า, ค่าปรับ..." />
                    </div>
                </div>
            </div>
            
            {/* DARK FOOTER FOR TOTAL */}
            <div className="bg-slate-900 text-white p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left space-y-1">
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.3em]">ยอดรวมรับชำระสุทธิ</p>
                    <div className="flex items-baseline gap-2 justify-center md:justify-start">
                        <p className={`text-5xl font-black tracking-tighter ${paymentMethod === 'transfer' ? 'text-blue-400' : 'text-red-500'}`}>
                            {new Intl.NumberFormat('th-TH').format(totalAmount)}
                        </p>
                        <span className="text-xl font-bold text-slate-600">บาท</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center justify-center md:justify-start gap-2">
                       {paymentMethod === 'cash' ? <Banknote className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                       รับเงินทาง: {paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน'}
                    </p>
                </div>
                
                <button 
                    type="submit"
                    disabled={!selectedMember || totalAmount === 0}
                    className={`w-full md:w-auto px-16 py-6 rounded-[1.5rem] font-black shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed text-2xl uppercase tracking-tight
                        ${paymentMethod === 'transfer' ? 'bg-blue-500 hover:bg-blue-400 shadow-blue-900/40' : 'bg-teal-500 hover:bg-teal-400 shadow-teal-900/40'}`}
                >
                    <Save className="w-8 h-8" />
                    ยืนยันบันทึก
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};
