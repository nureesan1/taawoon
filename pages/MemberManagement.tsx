
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Member } from '../types';
import { Search, Pencil, Trash2, UserPlus, FileSpreadsheet, Download } from 'lucide-react';
import { EditMemberInfoModal } from './EditMemberInfoModal';

export const MemberManagement: React.FC = () => {
  const { members, deleteMember, setView } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.memberCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.personalInfo?.idCard && String(m.personalInfo.idCard).includes(searchTerm))
  );

  const handleDelete = async (member: Member) => {
    if (confirm(`คุณต้องการลบสมาชิก "${member.name}" ใช่หรือไม่?\nข้อมูลทั้งหมดรวมถึงประวัติการเงินจะถูกลบถาวร`)) {
       await deleteMember(member.id);
    }
  };

  const handleExport = () => {
    // Simple CSV Export Logic
    const headers = ["รหัสสมาชิก", "ชื่อ-สกุล", "เลขบัตรประชาชน", "เบอร์โทร", "ที่อยู่", "ประเภท", "วันที่สมัคร"];
    const csvContent = [
        headers.join(","),
        ...filteredMembers.map(m => [
            m.memberCode,
            `"${m.name}"`,
            `"${m.personalInfo?.idCard || ''}"`,
            `"${m.personalInfo?.phone || ''}"`,
            `"${m.personalInfo?.address || ''}"`,
            m.memberType === 'associate' ? 'สมาชิกสมทบ' : 'สมาชิกสามัญ',
            m.joinedDate || ''
        ].join(","))
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `members_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาสมาชิก (ชื่อ, รหัส, เลขบัตร)"
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
            >
                <Download className="w-4 h-4" />
                ส่งออก CSV
            </button>
            <button 
                onClick={() => setView('register_member')}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-medium text-sm"
            >
                <UserPlus className="w-4 h-4" />
                เพิ่มสมาชิกใหม่
            </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">รหัส</th>
                <th className="px-6 py-4">ชื่อ-สกุล</th>
                <th className="px-6 py-4">เลขบัตรประชาชน</th>
                <th className="px-6 py-4">เบอร์โทร</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">วันที่สมัคร</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500">{member.memberCode}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{member.name}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono">{member.personalInfo?.idCard || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">{member.personalInfo?.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${member.memberType === 'associate' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>
                        {member.memberType === 'associate' ? 'สมาชิกสมทบ' : 'สมาชิกสามัญ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{member.joinedDate ? new Date(member.joinedDate).toLocaleDateString('th-TH') : '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setSelectedMemberId(member.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-600 rounded-md transition-colors font-medium text-xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          แก้ไข
                        </button>
                        <button 
                          onClick={() => handleDelete(member)}
                          className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="ลบสมาชิก"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    ไม่พบข้อมูลสมาชิก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>แสดง {filteredMembers.length} รายการ</span>
        </div>
      </div>

      {selectedMemberId && (
        <EditMemberInfoModal 
          memberId={selectedMemberId} 
          onClose={() => setSelectedMemberId(null)} 
        />
      )}
    </div>
  );
};
