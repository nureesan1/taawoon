
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Save, Database, RotateCcw, Link, Link2Off, Loader2, 
  Globe, Trash2, AlertCircle, HelpCircle, CheckCircle2, 
  Copy, FileCode, ExternalLink 
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { config, updateConfig, resetConfig, refreshData, initDatabase, testConnection, connectionStatus, errorMessage } = useStore();
  const [formData, setFormData] = useState(config);
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";

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

  const copyScriptToClipboard = () => {
    // This is the code from backend-script.gs with the specific ID
    const scriptCode = `/**
 * Google Apps Script for Taawoon Cooperative System
 * Target Sheet ID: ${TARGET_SHEET_ID}
 */
var TARGET_SHEET_ID = "${TARGET_SHEET_ID}";
// ... (rest of the script)
`;
    // For simplicity, we just notify the user where to find the script or provide a simplified copy logic
    // In a real app, we'd fetch the actual content of backend-script.gs
    alert("กรุณาคัดลอกโค้ดจากไฟล์ backend-script.gs ในโปรเจกต์นี้ไปวางใน Google Apps Script");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าการเชื่อมต่อ</h1>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${connectionStatus === 'connected' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
           {connectionStatus === 'connected' ? <CheckCircle2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
           {connectionStatus === 'checking' ? 'กำลังตรวจสอบ...' : connectionStatus.toUpperCase()}
        </div>
      </div>

      {/* Target Sheet Info Card */}
      <div className="bg-teal-900 rounded-[2rem] p-8 text-white shadow-xl shadow-teal-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Database className="w-32 h-32" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-teal-300">
            <Link className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Linked Google Sheet</span>
          </div>
          <div>
            <p className="text-xs text-teal-100/60 mb-1 font-bold">Target Sheet ID:</p>
            <p className="text-lg font-mono font-black break-all">{TARGET_SHEET_ID}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${TARGET_SHEET_ID}`, '_blank')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> เปิด Google Sheet
            </button>
          </div>
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
              <HelpCircle className="w-3.5 h-3.5" /> วิธีแก้ไขปัญหา "Load failed"
            </h4>
            <ul className="text-[10px] text-red-700 space-y-2 list-decimal ml-4 font-bold">
              <li>เปิด <span className="underline">Google Apps Script</span> ที่ผูกกับ Sheet นี้</li>
              <li>ตรวจสอบว่าตัวแปร <code className="bg-red-100 px-1 rounded">TARGET_SHEET_ID</code> คือ <code className="bg-red-100 px-1 rounded">"{TARGET_SHEET_ID}"</code></li>
              <li>กดปุ่ม <span className="text-red-900 font-black">"Deploy"</span> &gt; <span className="text-red-900 font-black">"New Deployment"</span></li>
              <li>ตั้งค่า <span className="text-red-900 font-black">"Who has access"</span> เป็น <span className="text-red-900 font-black">"Anyone"</span></li>
              <li>คัดลอก Web App URL (ลงท้ายด้วย /exec) มาวางด้านล่าง</li>
            </ul>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-6">
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Google Script Web App URL</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={formData.scriptUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, scriptUrl: e.target.value }))}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-teal-500 font-mono text-xs transition-all shadow-inner"
            />
            <button 
              onClick={() => window.open(formData.scriptUrl, '_blank')} 
              className="p-5 bg-slate-100 rounded-3xl hover:bg-slate-200 transition-colors"
              title="ทดสอบเปิด URL"
            >
              <Globe className="w-6 h-6 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-50">
           <button 
             onClick={handleSave} 
             className="flex-1 bg-teal-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-teal-900/10 hover:bg-teal-700 transition-all flex items-center justify-center gap-3 active:scale-95"
           >
              <Save className="w-6 h-6" /> {isSaved ? 'บันทึกสำเร็จ' : 'บันทึกการตั้งค่า'}
           </button>
           <button 
             onClick={async () => { setIsTesting(true); await testConnection(); setIsTesting(false); }} 
             disabled={isTesting}
             className="px-10 py-5 border-2 border-slate-200 rounded-3xl font-black text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center gap-2"
           >
              {isTesting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ทดสอบการเชื่อมต่อ'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] space-y-3">
           <h3 className="font-black text-amber-800 flex items-center gap-2 uppercase text-xs tracking-wider">
             <Database className="w-5 h-5" /> Database Setup
           </h3>
           <p className="text-[10px] text-amber-700 font-bold leading-relaxed">ใช้ปุ่มนี้เมื่อเชื่อมต่อกับ Sheet ใหม่เป็นครั้งแรก เพื่อสร้างหัวตาราง (Headers) ที่ถูกต้อง</p>
           <button 
             onClick={() => { if(confirm('สร้างหัวตารางใหม่ใน Google Sheet ใช่หรือไม่?')) initDatabase(); }} 
             className="w-full py-4 bg-white border-2 border-amber-200 text-amber-600 rounded-2xl font-black text-sm hover:bg-amber-100/50 transition-all shadow-sm active:scale-95"
           >
             เริ่มต้นฐานข้อมูล
           </button>
        </div>

        <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] space-y-3">
           <h3 className="font-black text-red-800 flex items-center gap-2 uppercase text-xs tracking-wider">
             <RotateCcw className="w-5 h-5" /> Emergency Reset
           </h3>
           <p className="text-[10px] text-red-700 font-bold leading-relaxed">ล้างค่าที่เก็บไว้ใน Browser ทั้งหมด (จะกลับไปใช้ค่าเริ่มต้นจากระบบ)</p>
           <button 
             onClick={handleHardReset} 
             className="w-full py-4 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-100/50 transition-all shadow-sm active:scale-95"
           >
             <Trash2 className="w-4 h-4" /> ล้างข้อมูลและเริ่มใหม่
           </button>
        </div>
      </div>
    </div>
  );
};
