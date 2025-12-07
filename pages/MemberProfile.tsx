import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { User, Calendar, MapPin, Phone, CreditCard, Save, AlertCircle } from 'lucide-react';

export const MemberProfile: React.FC = () => {
  const { currentUser, getMember, updateMember } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Local state for form fields
  const [formData, setFormData] = useState({
    name: '',
    idCard: '',
    // dob: '', // Removed
    address: '',
    phone: ''
  });

  const member = currentUser?.memberId ? getMember(currentUser.memberId) : undefined;

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        idCard: member.personalInfo?.idCard || '',
        // dob: member.personalInfo?.dateOfBirth || '',
        address: member.personalInfo?.address || '',
        phone: member.personalInfo?.phone || ''
      });
    }
  }, [member]);

  if (!member) return <div>Member data not found.</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member.id) return;

    const success = await updateMember(member.id, {
      name: formData.name,
      personalInfo: {
        ...member.personalInfo!,
        address: formData.address,
        phone: formData.phone,
        // dateOfBirth: formData.dob // Removed
      }
    });

    if (success) {
        setSuccessMsg('บันทึกข้อมูลสำเร็จ');
        setIsEditing(false);
        setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">ข้อมูลส่วนตัว</h1>
           <p className="text-slate-500">จัดการข้อมูลประวัติสมาชิกของคุณ</p>
        </div>
        {!isEditing && (
            <button 
                onClick={() => setIsEditing(true)}
                className="bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors shadow-sm font-medium"
            >
                แก้ไขข้อมูล
            </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Read Only / Vital Info */}
            <div className="space-y-2 md:col-span-2">
               <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-orange-800">ข้อมูลสมาชิก</h3>
                    <p className="text-xs text-orange-600 mt-1">รหัสสมาชิก: <span className="font-mono font-bold text-orange-700">{member.memberCode}</span></p>
                    <p className="text-xs text-orange-600">ประเภท: {member.memberType === 'associate' ? 'สมาชิกสมทบ' : 'สมาชิกสามัญ'}</p>
                  </div>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">ชื่อ-นามสกุล</label>
              <div className="relative">
                <input 
                  disabled={!isEditing}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  type="text" 
                  className={`w-full pl-10 p-3 rounded-lg border transition-all outline-none 
                    ${isEditing ? 'bg-slate-50 border-slate-200 focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100' : 'bg-slate-50 border-transparent text-slate-600'}`}
                />
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">เลขบัตรประชาชน</label>
              <div className="relative">
                <input 
                  disabled
                  value={formData.idCard}
                  type="text" 
                  className="w-full pl-10 p-3 bg-slate-100 border border-transparent rounded-lg text-slate-500 font-mono"
                />
                <CreditCard className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-slate-400">*ไม่สามารถแก้ไขได้</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">เบอร์โทรศัพท์</label>
              <div className="relative">
                <input 
                  disabled={!isEditing}
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  type="tel" 
                  className={`w-full pl-10 p-3 rounded-lg border transition-all outline-none 
                    ${isEditing ? 'bg-slate-50 border-slate-200 focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100' : 'bg-slate-50 border-transparent text-slate-600'}`}
                />
                <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Date of Birth Removed */}

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-600">ที่อยู่ปัจจุบัน</label>
              <div className="relative">
                <textarea 
                  disabled={!isEditing}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full pl-10 p-3 rounded-lg border transition-all outline-none resize-none
                    ${isEditing ? 'bg-slate-50 border-slate-200 focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100' : 'bg-slate-50 border-transparent text-slate-600'}`}
                />
                <MapPin className="w-5 h-5 text-slate-400 absolute left-3 top-6" />
              </div>
            </div>

         </div>

         {isEditing && (
             <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                 <button 
                    type="button"
                    onClick={() => {
                        setIsEditing(false);
                        // Reset to original data
                        setFormData({
                            name: member.name,
                            idCard: member.personalInfo?.idCard || '',
                            // dob: member.personalInfo?.dateOfBirth || '',
                            address: member.personalInfo?.address || '',
                            phone: member.personalInfo?.phone || ''
                        });
                    }}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                 >
                    ยกเลิก
                 </button>
                 <button 
                    type="submit"
                    className="flex items-center gap-2 bg-sky-500 text-white px-6 py-2 rounded-lg hover:bg-sky-600 font-medium shadow-md shadow-sky-200 active:scale-95 transition-all"
                 >
                    <Save className="w-4 h-4" />
                    บันทึกการเปลี่ยนแปลง
                 </button>
             </div>
         )}
      </form>
    </div>
  );
};