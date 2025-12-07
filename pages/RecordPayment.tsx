
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, CheckCircle2, User, Search, Calendar, ChevronDown } from 'lucide-react';
import { Member } from '../types';

export const RecordPayment: React.FC = () => {
  const { members, addTransaction, currentUser } = useStore();
  
  // State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Searchable Dropdown State
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form Data - Using strings to support better input experience (decimals, large numbers)
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
  const filteredMembers = searchQuery.trim() === '' 
    ? members.slice(0, 10) // Show first 10 if empty
    : members.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.memberCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.personalInfo?.idCard?.includes(searchQuery)
      );

  // Close dropdown when clicking outside
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
    
    // Validate number format (allow digits and one decimal point)
    // This allows typing "100." or large numbers without browser constraints
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

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
            // Reset Form
            setSelectedMember(null);
            setSearchQuery('');
            setFormData({
                land: '', housing: '', shares: '', savings: '', 
                welfare: '', insurance: '', donation: '', generalLoan: '',
                others: '', othersNote: ''
            });
        }, 2000);
    }
  };

  const formatTHB = (num: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

  const InputField = ({ label, field, color = "slate", placeholder = "0.00" }: { label: string, field: keyof typeof formData, color?: string, placeholder?: string }) => {
    const value = formData[field];
    const isFilled = field !== 'othersNote' && getNumericValue(value as string) > 0;

    return (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
          {field === 'othersNote' ? (
             <input
                type="text"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none transition-all"
                value={value}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={placeholder}
            />
          ) : (
            <div className="relative">
                <input
                type="text"
                inputMode="decimal"
                className={`w-full p-3 pl-3 pr-10 border rounded-lg focus:ring-2 focus:outline-none transition-all font-medium
                    ${isFilled ? `border-${color}-500 bg-${color}-50 ring-${color}-200 text-${color}-700` : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200 text-slate-700'}`}
                value={value}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={placeholder}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
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
            <p className="text-slate-500 text-lg">ยอดเงิน {formatTHB(totalAmount)}</p>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ระบบรับชำระเงิน</h1>
        <p className="text-slate-500">บันทึกรายการรับเงินจากสมาชิก</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Card 1: Member & Date Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20">
            {/* Member Search Dropdown */}
            <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" />
                    ชื่อสมาชิก
                </label>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all cursor-pointer"
                        placeholder="ค้นหาชื่อ หรือ รหัสสมาชิก..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsDropdownOpen(true);
                            if (selectedMember) setSelectedMember(null); // Clear selection if typing
                        }}
                        onClick={() => setIsDropdownOpen(true)}
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <ChevronDown className={`w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown List */}
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

            {/* Date Picker */}
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
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                />
            </div>
        </div>

        {/* Card 2: Payment Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-700">รายการชำระเงิน</h2>
                {selectedMember && (
                    <div className="text-xs text-slate-500">
                        กำลังบันทึกให้: <span className="font-bold text-teal-600">{selectedMember.name}</span>
                    </div>
                )}
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                {/* 1. ที่ดิน */}
                <InputField label="1. ค่าที่ดิน (Land)" field="land" color="red" />
                
                {/* 2. บ้าน */}
                <InputField label="2. ค่าบ้าน (Housing)" field="housing" color="red" />

                {/* 3. หุ้น */}
                <InputField label="3. ค่าหุ้น (Shares)" field="shares" color="emerald" />

                {/* 4. เงินฝาก */}
                <InputField label="4. เงินฝาก (Savings)" field="savings" color="emerald" />

                {/* 5. สวัสดิการ */}
                <InputField label="5. ค่าสวัสดิการ (Welfare)" field="welfare" color="blue" />

                {/* 6. ประกันดินบ้าน */}
                <InputField label="6. ค่าประกันดินบ้าน (Insurance)" field="insurance" color="blue" />

                {/* 7. บริจาคบริหาร */}
                <InputField label="7. ค่าบริจาคบริหาร (Donation)" field="donation" color="blue" />

                {/* 8. สินเชื่อทั่วไป */}
                <InputField label="8. สินเชื่อทั่วไป (General Loan)" field="generalLoan" color="amber" />

                {/* 9. อื่นๆ */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                    <InputField label="9. อื่นๆ (ระบุยอดเงิน)" field="others" color="slate" />
                    <InputField label="รายละเอียด (ระบุค่าใช้จ่าย)" field="othersNote" placeholder="เช่น ค่าธรรมเนียมแรกเข้า" />
                </div>

            </div>
            
            {/* Footer Summary */}
            <div className="bg-slate-800 text-white p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">ยอดรวมสุทธิ</p>
                    <p className="text-4xl font-bold">{formatTHB(totalAmount)}</p>
                </div>
                <button 
                    type="submit"
                    disabled={!selectedMember || totalAmount === 0}
                    className="w-full md:w-auto px-8 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold shadow-lg shadow-teal-900/50 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                    <Save className="w-5 h-5" />
                    บันทึกรายการ
                </button>
            </div>
        </div>

      </form>
    </div>
  );
};
