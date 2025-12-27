
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Save, User, Phone, MapPin, CreditCard, Calendar, CalendarDays, AlertTriangle } from 'lucide-react';

interface EditMemberInfoModalProps {
  memberId: string;
  onClose: () => void;
}

export const EditMemberInfoModal: React.FC<EditMemberInfoModalProps> = ({ memberId, onClose }) => {
  const { getMember, updateMember } = useStore();
  const member = getMember(memberId);

  const [formData, setFormData] = useState({
    name: '',
    idCard: '',
    phone: '',
    address: '',
    memberType: 'ordinary' as 'ordinary' | 'associate',
    joinedDate: '',
    monthlyInstallment: 0,
    missedInstallments: 0
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        idCard: member.personalInfo?.idCard || '',
        phone: member.personalInfo?.phone || '',
        address: member.personalInfo?.address || '',
        memberType: member.memberType || 'ordinary',
        joinedDate: member.joinedDate || '',
        monthlyInstallment: member.monthlyInstallment || 0,
        missedInstallments: member.missedInstallments || 0
      });
    }
  }, [member]);

  if (!member) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm(`ยืนยันการแก้ไขข้อมูลส่วนตัวของสมาชิก ${member.name}?`)) {
      const success = await updateMember(memberId, {
        name: formData.name,
        memberType: formData.memberType,
        joinedDate: formData.joinedDate,
        monthlyInstallment: Number(formData.monthlyInstallment),
        missedInstallments: Number(formData.missedInstallments),
        personalInfo: {
            ...member.personalInfo!,
            idCard: formData.idCard,
            phone: formData.phone,
            address: formData.address
        }
      });
      if (success) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-teal-600 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-teal-100" />
              แก้ไขข้อมูลสมาชิก
            </h2>
            <p className="text-teal-100 text-sm mt-1">รหัสสมาชิก: {member.memberCode}</p>
          </div>
          <button onClick={onClose} className="text-teal-100 hover:text-white bg-teal-700/50 p-1.5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <form id="edit-info-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">ชื่อ-นามสกุล</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">เลขบัตรประชาชน</label>
                    <div className="relative">
                        <input
                            type="text"
                            name="idCard"
                            value={formData.idCard}
                            onChange={handleChange}
                            maxLength={13}
                            className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                        />
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">เบอร์โทรศัพท์</label>
                    <div className="relative">
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">วันที่สมัคร</label>
                    <div className="relative">
                        <input
                            type="date"
                            name="joinedDate"
                            value={formData.joinedDate}
                            onChange={handleChange}
                            className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">ประเภทสมาชิก</label>
                    <select
                        name="memberType"
                        value={formData.memberType}
                        onChange={handleChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        <option value="ordinary">สมาชิกสามัญ</option>
                        <option value="associate">สมาชิกสมทบ</option>
                    </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">ที่อยู่</label>
                    <div className="relative">
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows={3}
                            className="w-full p-2.5 pl-9 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                        />
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-6" />
                    </div>
                </div>

                {/* New Fields Section */}
                <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-teal-600" />
                        ยอดชำระต่องวด (บาท)
                      </label>
                      <input
                          type="number"
                          name="monthlyInstallment"
                          value={formData.monthlyInstallment}
                          onChange={handleChange}
                          className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-bold text-teal-700"
                      />
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        ผิดชำระหนี้สะสม (งวด)
                      </label>
                      <input
                          type="number"
                          name="missedInstallments"
                          value={formData.missedInstallments}
                          onChange={handleChange}
                          className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-bold text-red-600"
                      />
                  </div>
                </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
                ยกเลิก
            </button>
            <button 
                type="submit" 
                form="edit-info-form"
                className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-md shadow-teal-200 font-medium transition-transform active:scale-95"
            >
                <Save className="w-4 h-4" />
                บันทึกข้อมูล
            </button>
        </div>
      </div>
    </div>
  );
};
