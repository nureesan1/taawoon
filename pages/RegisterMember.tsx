
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  User, CreditCard, Upload, Save, RotateCcw, ArrowLeft, CheckCircle2, 
  MapPin, Phone, FileSpreadsheet, AlertCircle, Loader2, Wallet
} from 'lucide-react';

type TabMode = 'single' | 'bulk';

export const RegisterMember: React.FC = () => {
  const { addMember, setView, members, refreshData, config } = useStore();
  const [mode, setMode] = useState<TabMode>('single');
  
  // --- SINGLE MODE STATE ---
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idCard: '',
    address: '',
    phone: '',
    joinedDate: new Date().toISOString().split('T')[0],
    memberType: 'ordinary' as 'ordinary' | 'associate',
    initialShares: 0,
    paymentMethod: 'cash',
    // New Fields
    savingsBalance: 0,
    housingLoanBalance: 0,
    landLoanBalance: 0,
    generalLoanBalance: 0
  });

  // --- BULK MODE STATE ---
  const [bulkText, setBulkText] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });

  const [isSuccess, setIsSuccess] = useState(false);

  // Auto Generate Code Helper
  const getNextMemberCode = (offset = 0) => {
    const maxId = members.reduce((max, m) => {
        const num = parseInt(m.memberCode.replace('M-', '')) || 0;
        return num > max ? num : max;
    }, 0);
    const nextId = maxId + 1 + offset;
    return `M-${nextId.toString().padStart(3, '0')}`;
  };

  // --- HANDLERS FOR SINGLE MODE ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.idCard.length !== 13) {
      alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
      return;
    }

    const success = await addMember({
      name: `${formData.firstName} ${formData.lastName}`,
      memberCode: getNextMemberCode(),
      accumulatedShares: Number(formData.initialShares),
      savingsBalance: Number(formData.savingsBalance),
      housingLoanBalance: Number(formData.housingLoanBalance),
      landLoanBalance: Number(formData.landLoanBalance),
      generalLoanBalance: Number(formData.generalLoanBalance),
      personalInfo: {
        idCard: formData.idCard,
        address: formData.address,
        phone: formData.phone
      },
      memberType: formData.memberType,
      joinedDate: formData.joinedDate
    });

    if (success) {
        if (config.useGoogleSheets) await refreshData();
        showSuccess();
    }
  };

  // --- HANDLERS FOR BULK MODE ---
  
  // 1. Logic to Parse Text -> Objects
  const parseRows = (text: string) => {
    const rows = text.trim().split('\n');
    return rows.map((row, index) => {
      // Expected columns: 
      // 0:Name, 1:Surname, 2:ID Card, 3:Phone, 4:Address, 5:Type, 
      // 6:Shares, 7:Savings, 8:HousingDebt, 9:LandDebt, 10:GeneralDebt
      const cols = row.split('\t').map(c => c.trim());
      
      const firstName = cols[0] || '';
      const lastName = cols[1] || '';
      const idCard = cols[2]?.replace(/[^0-9]/g, '') || ''; // Auto clean ID
      const phone = cols[3] || '-';
      const address = cols[4] || '-';
      const typeInput = cols[5] || '1';
      
      // Financials
      const shares = parseFloat(cols[6]?.replace(/,/g, '')) || 0;
      const savings = parseFloat(cols[7]?.replace(/,/g, '')) || 0;
      const housing = parseFloat(cols[8]?.replace(/,/g, '')) || 0;
      const land = parseFloat(cols[9]?.replace(/,/g, '')) || 0;
      const general = parseFloat(cols[10]?.replace(/,/g, '')) || 0;

      // Validation Logic
      // Require Name, Surname, and 13-digit ID
      const isValid = firstName && lastName && idCard.length === 13;
      
      return {
        id: index,
        firstName,
        lastName,
        idCard,
        phone,
        address,
        memberType: typeInput === '2' ? 'associate' : 'ordinary',
        initialShares: shares,
        savingsBalance: savings,
        housingLoanBalance: housing,
        landLoanBalance: land,
        generalLoanBalance: general,
        isValid,
        error: !isValid ? 'ข้อมูลไม่ครบ หรือเลขบัตรไม่ถูกต้อง (ต้องมี 13 หลัก)' : ''
      };
    });
  };

  // 2. Logic to Save Data to DB
  const executeSave = async (rowsToSave: any[]) => {
    setIsProcessing(true);
    setProcessProgress({ current: 0, total: rowsToSave.length });

    try {
        let successCount = 0;
        
        // Calculate starting ID offset
        const currentMaxId = members.reduce((max, m) => {
            const num = parseInt(m.memberCode.replace('M-', '')) || 0;
            return num > max ? num : max;
        }, 0);

        for (let i = 0; i < rowsToSave.length; i++) {
          const row = rowsToSave[i];
          const nextId = currentMaxId + 1 + i;
          const memberCode = `M-${nextId.toString().padStart(3, '0')}`;

          const success = await addMember({
            name: `${row.firstName} ${row.lastName}`,
            memberCode: memberCode, 
            accumulatedShares: row.initialShares,
            savingsBalance: row.savingsBalance,
            housingLoanBalance: row.housingLoanBalance,
            landLoanBalance: row.landLoanBalance,
            generalLoanBalance: row.generalLoanBalance,
            personalInfo: {
              idCard: row.idCard,
              address: row.address,
              phone: row.phone
            },
            memberType: row.memberType as 'ordinary' | 'associate',
            joinedDate: new Date().toISOString().split('T')[0]
          });

          if (success) successCount++;
          setProcessProgress({ current: i + 1, total: rowsToSave.length });
        }

        if (config.useGoogleSheets) {
            await refreshData();
        }
        
        if (successCount > 0) {
          showSuccess();
          // Clear form after success
          setBulkText('');
          setParsedData([]);
        } else {
            alert("บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ");
        }

    } catch (e) {
        console.error(e);
        alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
        setIsProcessing(false);
    }
  };

  // 3. Combined Handler: Verify & Save
  const handleVerifyAndSave = async () => {
    if (!bulkText.trim()) return;

    // Parse
    const rows = parseRows(bulkText);
    setParsedData(rows); // Update UI

    const validRows = rows.filter(d => d.isValid);
    const hasErrors = rows.some(d => !d.isValid);

    if (validRows.length === 0) {
         // No valid data at all
         return;
    }

    if (hasErrors) {
        // If there are errors, stop and let user see the table
        // They can either fix the text or click "Save Valid Only" in the footer
        return;
    }

    // If ALL rows are valid, save immediately
    if (confirm(`ข้อมูลถูกต้องครบถ้วน ${validRows.length} รายการ\nยืนยันการบันทึกลงฐานข้อมูล?`)) {
        await executeSave(validRows);
    }
  };

  // 4. Fallback Handler (Save only valid rows despite errors)
  const handleForceSave = async () => {
    const validRows = parsedData.filter(d => d.isValid);
    if (validRows.length === 0) return;

    if (confirm(`มีข้อมูลถูกต้อง ${validRows.length} รายการ (จากทั้งหมด ${parsedData.length})\nยืนยันบันทึกเฉพาะรายการที่ถูกต้อง?`)) {
        await executeSave(validRows);
    }
  };

  const showSuccess = () => {
    setIsSuccess(true);
    setTimeout(() => {
        setIsSuccess(false);
        setView('dashboard');
    }, 2000);
  };

  const handleClear = () => {
    if (confirm('ต้องการล้างข้อมูลทั้งหมดหรือไม่?')) {
        setFormData({
            firstName: '',
            lastName: '',
            idCard: '',
            address: '',
            phone: '',
            joinedDate: new Date().toISOString().split('T')[0],
            memberType: 'ordinary',
            initialShares: 0,
            paymentMethod: 'cash',
            savingsBalance: 0,
            housingLoanBalance: 0,
            landLoanBalance: 0,
            generalLoanBalance: 0
        });
        setBulkText('');
        setParsedData([]);
    }
  };

  if (isSuccess) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">บันทึกข้อมูลสำเร็จ</h2>
            <p className="text-slate-500">ระบบได้เพิ่มสมาชิกใหม่เรียบร้อยแล้ว</p>
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">เพิ่มสมาชิกใหม่</h1>
            <p className="text-slate-500 text-sm">ลงทะเบียนสมาชิกเข้าสู่ระบบ</p>
          </div>
        </div>

        <div className="bg-slate-100 p-1 rounded-lg flex">
          <button 
            onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'single' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            เพิ่มทีละคน
          </button>
          <button 
            onClick={() => setMode('bulk')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === 'bulk' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            เพิ่มแบบกลุ่ม (Excel)
          </button>
        </div>
      </div>

      {mode === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          
          {/* Section A: Personal Info */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-sky-50 px-6 py-4 border-b border-sky-100 flex items-center gap-2">
              <User className="w-5 h-5 text-sky-500" />
              <h2 className="font-semibold text-slate-700">ข้อมูลส่วนตัวสมาชิก (Personal Information)</h2>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">ชื่อ</label>
                <input 
                  required
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none" 
                  placeholder="ระบุชื่อจริง"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">นามสกุล</label>
                <input 
                  required
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none" 
                  placeholder="ระบุนามสกุล"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">เลขบัตรประชาชน (13 หลัก)</label>
                <div className="relative">
                  <input 
                    required
                    name="idCard"
                    value={formData.idCard}
                    onChange={handleChange}
                    type="text" 
                    maxLength={13}
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none font-mono tracking-wider" 
                    placeholder="X-XXXX-XXXXX-XX-X"
                  />
                  <CreditCard className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">เบอร์โทรศัพท์</label>
                <div className="relative">
                  <input 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    type="tel" 
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none" 
                    placeholder="08X-XXX-XXXX"
                  />
                  <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-600">ที่อยู่ตามทะเบียนบ้าน</label>
                <div className="relative">
                  <textarea 
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none resize-none" 
                    placeholder="บ้านเลขที่, หมู่, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์"
                  />
                  <MapPin className="w-5 h-5 text-slate-400 absolute left-3 top-6" />
                </div>
              </div>
            </div>
          </section>

          {/* Section B: Coop Info */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-sky-50 px-6 py-4 border-b border-sky-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-sky-500" />
              <h2 className="font-semibold text-slate-700">ข้อมูลสมาชิกสหกรณ์ (Cooperative Information)</h2>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">วันที่สมัครสมาชิก</label>
                <input 
                  required
                  name="joinedDate"
                  value={formData.joinedDate}
                  onChange={handleChange}
                  type="date" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 block mb-2">ประเภทสมาชิก</label>
                <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-3 border rounded-lg transition-all
                        ${formData.memberType === 'ordinary' ? 'bg-sky-50 border-sky-400 text-sky-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input 
                            type="radio" 
                            name="memberType" 
                            value="ordinary"
                            checked={formData.memberType === 'ordinary'}
                            onChange={(e) => handleRadioChange('memberType', e.target.value)}
                            className="hidden" 
                        />
                        <span className="font-medium">สมาชิกสามัญ</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-3 border rounded-lg transition-all
                        ${formData.memberType === 'associate' ? 'bg-sky-50 border-sky-400 text-sky-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input 
                            type="radio" 
                            name="memberType" 
                            value="associate"
                            checked={formData.memberType === 'associate'}
                            onChange={(e) => handleRadioChange('memberType', e.target.value)}
                            className="hidden" 
                        />
                        <span className="font-medium">สมาชิกสมทบ</span>
                    </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">เงินค่าหุ้นเริ่มต้น (บาท)</label>
                <input 
                  required
                  name="initialShares"
                  value={formData.initialShares === 0 ? '' : formData.initialShares}
                  onChange={handleChange}
                  type="number" 
                  min="0"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none font-medium text-sky-700" 
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 block mb-2">ช่องทางชำระค่าธรรมเนียม</label>
                <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-lg w-full hover:bg-slate-50 transition-colors">
                        <input 
                            type="radio" 
                            name="paymentMethod" 
                            value="cash"
                            checked={formData.paymentMethod === 'cash'}
                            onChange={(e) => handleRadioChange('paymentMethod', e.target.value)}
                            className="w-4 h-4 text-sky-500 focus:ring-sky-400" 
                        />
                        <span className="text-slate-700">เงินสด</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-lg w-full hover:bg-slate-50 transition-colors">
                        <input 
                            type="radio" 
                            name="paymentMethod" 
                            value="transfer"
                            checked={formData.paymentMethod === 'transfer'}
                            onChange={(e) => handleRadioChange('paymentMethod', e.target.value)}
                            className="w-4 h-4 text-sky-500 focus:ring-sky-400" 
                        />
                        <span className="text-slate-700">เงินโอน</span>
                    </label>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Initial Balance (New) */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-sky-50 px-6 py-4 border-b border-sky-100 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-sky-500" />
              <h2 className="font-semibold text-slate-700">ข้อมูลยอดคงเหลือเริ่มต้น (Initial Balances)</h2>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">เงินฝากคงเหลือ</label>
                <input 
                  name="savingsBalance"
                  value={formData.savingsBalance === 0 ? '' : formData.savingsBalance}
                  onChange={handleChange}
                  type="number" 
                  min="0"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none font-medium text-emerald-600" 
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">หนี้ค่าบ้านคงเหลือ</label>
                <input 
                  name="housingLoanBalance"
                  value={formData.housingLoanBalance === 0 ? '' : formData.housingLoanBalance}
                  onChange={handleChange}
                  type="number" 
                  min="0"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none font-medium text-red-600" 
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">หนี้ที่ดินคงเหลือ</label>
                <input 
                  name="landLoanBalance"
                  value={formData.landLoanBalance === 0 ? '' : formData.landLoanBalance}
                  onChange={handleChange}
                  type="number" 
                  min="0"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none font-medium text-red-600" 
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">สินเชื่อทั่วไปคงเหลือ</label>
                <input 
                  name="generalLoanBalance"
                  value={formData.generalLoanBalance === 0 ? '' : formData.generalLoanBalance}
                  onChange={handleChange}
                  type="number" 
                  min="0"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all outline-none font-medium text-amber-600" 
                  placeholder="0.00"
                />
              </div>
            </div>
          </section>

          {/* Section C: Documents */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-sky-50 px-6 py-4 border-b border-sky-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-sky-500" />
              <h2 className="font-semibold text-slate-700">เอกสารประกอบ (Documents)</h2>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-sky-300 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-sky-100 transition-colors">
                    <CreditCard className="w-6 h-6 text-sky-500" />
                </div>
                <p className="font-medium text-slate-600 text-sm">สำเนาบัตรประชาชน</p>
                <p className="text-xs text-slate-400 mt-1">Click to upload or drag file</p>
              </div>
              
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-sky-300 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-sky-100 transition-colors">
                    <User className="w-6 h-6 text-sky-500" />
                </div>
                <p className="font-medium text-slate-600 text-sm">รูปถ่ายสมาชิก</p>
                <p className="text-xs text-slate-400 mt-1">Optional</p>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-sky-300 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-sky-100 transition-colors">
                    <MapPin className="w-6 h-6 text-sky-500" />
                </div>
                <p className="font-medium text-slate-600 text-sm">สำเนาทะเบียนบ้าน</p>
                <p className="text-xs text-slate-400 mt-1">Click to upload</p>
              </div>
            </div>
          </section>

          {/* Single Mode Buttons */}
          <div className="flex gap-4 pt-4">
              <button 
                  type="button" 
                  onClick={handleClear}
                  className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
              >
                  <RotateCcw className="w-4 h-4" />
                  ล้างข้อมูล
              </button>
              <button 
                  type="submit" 
                  className="flex-[2] py-3.5 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 shadow-lg shadow-sky-200 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                  <Save className="w-5 h-5" />
                  บันทึกข้อมูลสมาชิก
              </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Bulk Instruction */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-teal-50 rounded-lg">
                        <FileSpreadsheet className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">คำแนะนำการเพิ่มข้อมูลแบบกลุ่ม (Copy & Paste)</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            คัดลอกข้อมูลจาก Excel แล้วนำมาวางในช่องด้านล่าง โดยไม่ต้องคัดลอกหัวตารางมา
                        </p>
                    </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-sm font-mono border border-slate-200 overflow-x-auto">
                    <p className="font-bold text-slate-700 mb-2">ลำดับคอลัมน์ (เรียงตามแนวนอน):</p>
                    <div className="flex items-center gap-2 text-slate-600 whitespace-nowrap text-xs md:text-sm">
                        <span className="bg-white px-2 py-1 border rounded">ชื่อจริง</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded">นามสกุล</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded">เลขบัตรประชาชน</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded">เบอร์โทร</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded">ที่อยู่</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded">ประเภท (1,2)</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded border-teal-200 bg-teal-50">ค่าหุ้น</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded border-emerald-200 bg-emerald-50">เงินฝาก</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded border-red-200 bg-red-50">หนี้บ้าน</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded border-red-200 bg-red-50">หนี้ที่ดิน</span>
                        <span>→</span>
                        <span className="bg-white px-2 py-1 border rounded border-amber-200 bg-amber-50">สินเชื่อทั่วไป</span>
                    </div>
                </div>
            </div>

            {/* Input Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <textarea
                    className="w-full h-48 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm whitespace-pre"
                    placeholder={`ตัวอย่าง:\nสมชาย\tใจดี\t1103700123456\t0812345678\t123 หมู่ 1\t1\t100\t500\t100000\t50000\t0`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                />
                <div className="mt-4 flex justify-end gap-3">
                    <button 
                        onClick={handleClear}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        ล้างข้อมูล
                    </button>
                    {isProcessing ? (
                        <button disabled className="px-6 py-2 bg-slate-200 text-slate-500 rounded-lg flex items-center gap-2 cursor-wait">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            กำลังบันทึก...
                        </button>
                    ) : (
                        <button 
                            onClick={handleVerifyAndSave}
                            disabled={!bulkText.trim()}
                            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm font-medium flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            ตรวจสอบและบันทึก
                        </button>
                    )}
                </div>
            </div>

            {/* Preview Table (Only shows if errors exist or user cancelled quick save) */}
            {parsedData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 fade-in">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                           {parsedData.some(d => !d.isValid) ? (
                               <>
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                พบรายการที่ต้องแก้ไข
                               </>
                           ) : (
                               <>
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ผลการตรวจสอบ
                               </>
                           )}
                        </h3>
                        <div className="text-sm">
                            <span className="text-green-600 font-medium">{parsedData.filter(d => d.isValid).length} ผ่าน</span>
                            <span className="mx-2">/</span>
                            <span className="text-red-500 font-medium">{parsedData.filter(d => !d.isValid).length} ไม่ผ่าน</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="px-4 py-3">สถานะ</th>
                                    <th className="px-4 py-3">ชื่อ-สกุล</th>
                                    <th className="px-4 py-3">เลขบัตรฯ</th>
                                    <th className="px-4 py-3 text-right text-teal-600">ค่าหุ้น</th>
                                    <th className="px-4 py-3 text-right text-emerald-600">เงินฝาก</th>
                                    <th className="px-4 py-3 text-right text-red-600">หนี้บ้าน</th>
                                    <th className="px-4 py-3 text-right text-red-600">หนี้ที่ดิน</th>
                                    <th className="px-4 py-3 text-right text-amber-600">สินเชื่อ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsedData.map((row, i) => (
                                    <tr key={i} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                                        <td className="px-4 py-2">
                                            {row.isValid ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <div className="group relative cursor-help">
                                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                                    <div className="absolute left-6 top-0 w-max bg-slate-800 text-white text-xs px-2 py-1 rounded hidden group-hover:block z-10">
                                                        {row.error}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">{row.firstName} {row.lastName}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{row.idCard}</td>
                                        <td className="px-4 py-2 text-right">{row.initialShares}</td>
                                        <td className="px-4 py-2 text-right">{row.savingsBalance}</td>
                                        <td className="px-4 py-2 text-right">{row.housingLoanBalance}</td>
                                        <td className="px-4 py-2 text-right">{row.landLoanBalance}</td>
                                        <td className="px-4 py-2 text-right">{row.generalLoanBalance}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Fallback Action Bar for partial saves */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                        <button 
                            onClick={handleForceSave}
                            disabled={parsedData.filter(d => d.isValid).length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 shadow-md shadow-sky-200 disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            <Save className="w-4 h-4" />
                            บันทึกรายการที่ผ่าน ({parsedData.filter(d => d.isValid).length})
                        </button>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
