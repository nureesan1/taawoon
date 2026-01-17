
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, Database, RotateCcw, Link, Link2Off, Loader2, Globe, Trash2, AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { config, updateConfig, resetConfig, refreshData, initDatabase, testConnection, connectionStatus, errorMessage } = useStore();
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
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${connectionStatus === 'connected' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
           {connectionStatus === 'connected' ? <CheckCircle2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
           {connectionStatus === 'checking' ? 'กำลังตรวจสอบ...' : connectionStatus.toUpperCase()}
        </div>
      </div>

      {connectionStatus === 'disconnected' && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-black text-red-800 uppercase tracking-wide">การเชื่อมต่อล้มเหลว (CONNECTION FAILED)</p>
              <p className="text-xs text-red-600 font-bold leading-relaxed">{errorMessage || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}</p>
            </div>
          </div>
          
          <div className="bg-white/50 p-4 rounded-2xl border border-red-200/50">
            <h4 className="text-[11px] font-black text-red-900 mb-2 flex items-center gap-2 uppercase">
              <HelpCircle className="w-3.5 h-3.5" /> วิธีแก้ไขปัญหา "Load failed" / "Failed to fetch"
            </h4>
            <ul className="text-[10px] text-red-700 space-y-2 list-decimal ml-4 font-bold">
              <li>เปิดไฟล์ Google Apps Script ของคุณ</li>
              <li>กดปุ่ม <span className="text-red-900">"Deploy"</span> (สีน้ำเงินมุมขวาบน) &gt; <span className="text-red-900">"New Deployment"</span></li>
              <li>เลือกประเภทเป็น <span className="text-red-900">"Web App"</span></li>
              <li>ตั้งค่า <span className="text-red-900">"Execute as"</span> เป็น <span className="text-red-900">"Me"</span></li>
              <li>ตั้งค่า <span className="text-red-900">"Who has access"</span> เป็น <span className="text-red-900">"Anyone"</span> (สำคัญมาก!)</li>
              <li>กด Deploy แล้วคัดลอก <span className="text-red-900">Web App URL</span> (ที่ลงท้ายด้วย /exec) มาวางด้านล่างนี้</li>
            </ul>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-6">
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Google Script Web App URL</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={formData.scriptUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, scriptUrl: e.target.value }))}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-teal-500 font-mono text-xs transition-all"
            />
            <button 
              onClick={() => window.open(formData.scriptUrl, '_blank')} 
              className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
              title="ทดสอบเปิด URL"
            >
              <Globe className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-bold">** ต้องเป็น URL ที่ได้จากการกดปุ่ม Deploy และลงท้ายด้วย <span className="text-teal-600">/exec</span> เท่านั้น</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
           <button 
             onClick={handleSave} 
             className="flex-1 bg-teal-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 active:scale-95"
           >
              <Save className="w-5 h-5" /> {isSaved ? 'บันทึกสำเร็จ' : 'บันทึกการตั้งค่า'}
           </button>
           <button 
             onClick={async () => { setIsTesting(true); await testConnection(); setIsTesting(false); }} 
             disabled={isTesting}
             className="px-8 py-4 border-2 border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center gap-2"
           >
              {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ทดสอบการเชื่อมต่อ'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl space-y-3">
           <h3 className="font-black text-amber-800 flex items-center gap-2 uppercase text-xs tracking-wider">
             <Database className="w-5 h-5" /> Database Setup
           </h3>
           <p className="text-[10px] text-amber-700 font-bold leading-relaxed">ใช้ปุ่มนี้เมื่อเชื่อมต่อกับ Sheet ใหม่เป็นครั้งแรก เพื่อให้ระบบสร้างหัวตาราง (Headers) ที่จำเป็นให้โดยอัตโนมัติ</p>
           <button 
             onClick={() => { if(confirm('สร้างหัวตารางใหม่? ข้อมูลเดิมจะไม่หาย แต่จะมีการเพิ่มแถวหัวตารางใหม่')) initDatabase(); }} 
             className="w-full py-3 bg-white border border-amber-200 text-amber-600 rounded-xl font-black text-sm hover:bg-amber-100/50 transition-colors"
           >
             เริ่มต้นฐานข้อมูล
           </button>
        </div>

        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl space-y-3">
           <h3 className="font-black text-red-800 flex items-center gap-2 uppercase text-xs tracking-wider">
             <Trash2 className="w-5 h-5" /> Emergency Reset
           </h3>
           <p className="text-[10px] text-red-700 font-bold leading-relaxed">หากแอปทำงานผิดปกติหรือเชื่อมต่อไม่สำเร็จหลังจากแก้ไข URL ให้ใช้ปุ่มนี้เพื่อล้างข้อมูลที่เก็บไว้ในเครื่อง</p>
           <button 
             onClick={handleHardReset} 
             className="w-full py-3 bg-white border border-red-200 text-red-600 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-100/50 transition-colors"
           >
             <RotateCcw className="w-4 h-4" /> ล้างข้อมูลและเริ่มใหม่
           </button>
        </div>
      </div>
    </div>
  );
};
