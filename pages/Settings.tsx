
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Save, Database, RotateCcw, Link, Link2Off, Loader2, 
  Globe, Trash2, AlertCircle, HelpCircle, CheckCircle2, 
  ExternalLink, Info, MessageCircle, Copy
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { config, updateConfig, resetConfig, refreshData, initDatabase, testConnection, connectionStatus, errorMessage } = useStore();
  const [formData, setFormData] = useState(config);
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";

  const handleSave = () => {
    updateConfig(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    refreshData();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formData.scriptUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleHardReset = () => {
    if (confirm('ต้องการล้างค่าการตั้งค่าทั้งหมดและเริ่มใหม่หรือไม่?')) {
      resetConfig();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">ตั้งค่าระบบ</h1>
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border transition-all ${connectionStatus === 'connected' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
           {connectionStatus === 'connected' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
           {connectionStatus === 'checking' ? 'กำลังตรวจสอบ...' : connectionStatus === 'connected' ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}
        </div>
      </div>

      {/* Target Sheet Card */}
      <div className="bg-[#064e3b] rounded-[2.5rem] p-8 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Database className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-2 text-teal-300">
            <Link className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Primary Google Sheet</span>
          </div>
          <div>
            <p className="text-xs text-teal-100/60 mb-2 font-bold uppercase tracking-widest">Target Sheet ID:</p>
            <p className="text-xl font-mono font-black break-all bg-white/5 p-4 rounded-2xl border border-white/10">{TARGET_SHEET_ID}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${TARGET_SHEET_ID}`, '_blank')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl text-xs font-black transition-all border border-white/10"
            >
              <ExternalLink className="w-4 h-4" /> ดูไฟล์ Google Sheet
            </button>
            <button 
              onClick={() => window.open(`https://script.google.com/home`, '_blank')}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 px-6 py-3 rounded-2xl text-xs font-black transition-all"
            >
              <Globe className="w-4 h-4" /> เปิด Google Apps Script
            </button>
          </div>
        </div>
      </div>

      {/* LINE Integration Card */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">LINE Messaging API (Webhook)</h3>
            <p className="text-[10px] text-slate-400 font-bold">ใช้ Webhook URL นี้ไปตั้งค่าใน LINE Developers เพื่อเปิดระบบเช็คยอดหนี้ผ่าน LINE</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Webhook URL สำหรับ LINE</span>
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-xs font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-all"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopied ? 'คัดลอกแล้ว' : 'คัดลอก URL'}
              </button>
            </div>
            <p className="text-[11px] font-mono text-slate-600 break-all bg-white p-3 rounded-xl border border-slate-100 shadow-inner">
              {formData.scriptUrl}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl space-y-3">
            <p className="text-blue-900 font-black text-xs flex items-center gap-2 uppercase tracking-widest">
              <HelpCircle className="w-4 h-4" /> ขั้นตอนการเชื่อมต่อ LINE Bot
            </p>
            <ol className="text-[10px] text-blue-700 space-y-2 list-decimal ml-5 font-bold">
              <li>สร้าง Provider และ Channel ใน <span className="text-blue-900 underline">LINE Developers Console</span></li>
              <li>ไปที่เมนู <span className="text-blue-900">Messaging API</span> แล้วคัดลอก <span className="text-blue-900">Channel Access Token</span></li>
              <li>นำโทเคนไปใส่ในโค้ด Apps Script ที่ตัวแปร <span className="font-mono bg-blue-100 px-1">LINE_ACCESS_TOKEN</span> แล้วกดบันทึกและ Deploy ใหม่</li>
              <li>คัดลอก Webhook URL ด้านบนไปวางในช่อง <span className="text-blue-900">Webhook URL</span> ของ LINE และกด <span className="text-blue-900">Verify</span> และ <span className="text-blue-900 font-black">เปิด Use Webhook</span></li>
            </ol>
          </div>
        </div>
      </div>

      {/* API Config Card */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-6">
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
            <Info className="w-3.5 h-3.5" /> Google Script Web App URL
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={formData.scriptUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, scriptUrl: e.target.value }))}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-teal-500 font-mono text-xs transition-all shadow-inner"
            />
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
        <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2.5rem] space-y-4">
           <h3 className="font-black text-amber-800 flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
             <Database className="w-5 h-5" /> Database Sync
           </h3>
           <p className="text-[10px] text-amber-700 font-bold leading-relaxed">ใช้เมื่อต้องการสร้างหัวตาราง (Headers) ใหม่ใน Google Sheets หรือซิงค์โครงสร้างข้อมูล</p>
           <button 
             onClick={() => { if(confirm('สร้างหัวตารางใหม่ใน Google Sheet ใช่หรือไม่?')) initDatabase(); }} 
             className="w-full py-4 bg-white border-2 border-amber-200 text-amber-600 rounded-2xl font-black text-sm hover:bg-amber-100 transition-all shadow-sm active:scale-95"
           >
             ตั้งค่าฐานข้อมูล (Init)
           </button>
        </div>

        <div className="bg-red-50 border border-red-100 p-8 rounded-[2.5rem] space-y-4">
           <h3 className="font-black text-red-800 flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
             <RotateCcw className="w-5 h-5" /> Hard Reset
           </h3>
           <p className="text-[10px] text-red-700 font-bold leading-relaxed">ล้างการตั้งค่า Web URL และค่าที่บันทึกไว้ในเบราว์เซอร์ทั้งหมด</p>
           <button 
             onClick={handleHardReset} 
             className="w-full py-4 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-all shadow-sm active:scale-95"
           >
             <Trash2 className="w-4 h-4" /> ล้างค่าระบบ
           </button>
        </div>
      </div>
    </div>
  );
};
