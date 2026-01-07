
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, Database, RotateCcw, Link, Link2Off, Loader2, Globe, Trash2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { config, updateConfig, resetConfig, refreshData, initDatabase, testConnection, connectionStatus } = useStore();
  const [formData, setFormData] = useState(config);
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    updateConfig(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    refreshData();
  };

  const handleHardReset = () => {
    if (confirm('ต้องการล้างค่าการตั้งค่าทั้งหมดและเริ่มใหม่หรือไม่?')) {
      resetConfig();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${connectionStatus === 'connected' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
           {connectionStatus === 'connected' ? <Link className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
           {connectionStatus.toUpperCase()}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6">
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Google Script Web App URL</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={formData.scriptUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, scriptUrl: e.target.value }))}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-teal-500 font-mono text-xs"
            />
            <button onClick={() => window.open(formData.scriptUrl, '_blank')} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200"><Globe className="w-5 h-5 text-slate-500" /></button>
          </div>
          <p className="text-[10px] text-slate-400">** ต้องเป็น URL ที่ได้จากการกดปุ่ม <b>Deploy</b> และลงท้ายด้วย <b>/exec</b> เท่านั้น</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
           <button onClick={handleSave} className="flex-1 bg-teal-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
              <Save className="w-5 h-5" /> {isSaved ? 'บันทึกแล้ว' : 'บันทึกการตั้งค่า'}
           </button>
           <button onClick={async () => { setIsTesting(true); await testConnection(); setIsTesting(false); }} className="px-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50">
              {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ทดสอบเชื่อมต่อ'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl space-y-3">
           <h3 className="font-bold text-amber-800 flex items-center gap-2"><Database className="w-5 h-5" /> เครื่องมือจัดการ Sheet</h3>
           <p className="text-xs text-amber-700">ใช้ปุ่มนี้หากคุณเชื่อมต่อกับ Sheet ใหม่แล้วต้องการให้ระบบสร้างหัวตารางให้โดยอัตโนมัติ</p>
           <button onClick={() => { if(confirm('สร้างหัวตารางใหม่?')) initDatabase(); }} className="w-full py-3 bg-white border border-amber-200 text-amber-600 rounded-xl font-bold text-sm">เริ่มต้นฐานข้อมูล</button>
        </div>

        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl space-y-3">
           <h3 className="font-bold text-red-800 flex items-center gap-2"><Trash2 className="w-5 h-5" /> กรณีเกิดปัญหา</h3>
           <p className="text-xs text-red-700">หากหน้าจอยังค้าง Error เดิม หรือการเชื่อมต่อไม่ยอมอัปเดต ให้ใช้ปุ่มนี้เพื่อล้างค่าทั้งหมด</p>
           <button onClick={handleHardReset} className="w-full py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> ล้างแคชและเริ่มใหม่</button>
        </div>
      </div>
    </div>
  );
};
