
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Save, Database, RotateCcw, Link, Link2Off, Loader2, 
  Globe, Trash2, AlertCircle, HelpCircle, CheckCircle2, 
  ExternalLink, Info, MessageCircle, Copy, ArrowRightLeft,
  ArrowRight
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { config, updateConfig, resetConfig, refreshData, initDatabase, testConnection, connectionStatus } = useStore();
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
    <div className="max-w-4xl mx-auto space-y-6 p-4 animate-in fade-in duration-500 font-['Sarabun']">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">ตั้งค่าการเชื่อมต่อระบบ</h1>
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border transition-all ${connectionStatus === 'connected' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
           {connectionStatus === 'connected' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
           {connectionStatus === 'checking' ? 'กำลังตรวจสอบ...' : connectionStatus === 'connected' ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}
        </div>
      </div>

      {/* Connection Flow Diagram */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-6">
        <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-teal-600" />
            แผนผังการเชื่อมต่อ (Connection Flow)
        </h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="flex flex-col items-center gap-2 text-center w-32">
                <div className="w-16 h-16 bg-[#06C755] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <MessageCircle className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black">LINE Official</span>
            </div>
            <ArrowRight className="hidden md:block text-slate-300 w-6 h-6" />
            <div className="flex flex-col items-center gap-2 text-center w-32">
                <div className="w-16 h-16 bg-[#FF6F00] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Globe className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black">Dialogflow</span>
            </div>
            <ArrowRight className="hidden md:block text-slate-300 w-6 h-6" />
            <div className="flex flex-col items-center gap-2 text-center w-32">
                <div className="w-16 h-16 bg-[#4285F4] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Database className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black">Google Apps Script</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-3">
                <p className="text-emerald-900 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> ขั้นตอนใน LINE
                </p>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-bold">
                    คัดลอก <strong>Webhook URL จาก Dialogflow</strong> ไปวางใน LINE Developers Messaging API แล้วกด <span className="bg-white px-2 py-0.5 rounded border">Verify</span>
                </p>
            </div>
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-3">
                <p className="text-blue-900 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 bg-blue-500 rounded-full"></div> ขั้นตอนใน Dialogflow
                </p>
                <p className="text-[11px] text-blue-700 leading-relaxed font-bold">
                    คัดลอก <strong>Apps Script URL (ด้านล่าง)</strong> ไปวางในเมนู Fulfillment ของ Dialogflow แล้วกด <span className="bg-white px-2 py-0.5 rounded border">Save</span>
                </p>
            </div>
        </div>
      </div>

      {/* Apps Script Web App URL Card */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Google Apps Script Web App URL</h3>
            <p className="text-[10px] text-slate-400 font-bold">ใช้ URL นี้ไปวางในช่อง Fulfillment ของ Dialogflow</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apps Script URL (สำหรับ Fulfillment)</span>
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-all"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopied ? 'คัดลอกแล้ว' : 'คัดลอก URL'}
              </button>
            </div>
            <input 
              type="text" 
              value={formData.scriptUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, scriptUrl: e.target.value }))}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-mono text-[11px] text-slate-600 shadow-inner"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-50">
           <button 
             onClick={handleSave} 
             className="flex-1 bg-[#064e3b] text-white py-5 rounded-3xl font-black shadow-xl shadow-teal-900/10 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
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

      {/* Target Sheet Card */}
      <div className="bg-[#064e3b] rounded-[2.5rem] p-8 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Database className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-2 text-teal-300">
            <Link className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Primary Google Sheet ID</span>
          </div>
          <div>
            <p className="text-xl font-mono font-black break-all bg-white/5 p-4 rounded-2xl border border-white/10">{TARGET_SHEET_ID}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${TARGET_SHEET_ID}`, '_blank')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl text-xs font-black transition-all border border-white/10"
            >
              <ExternalLink className="w-4 h-4" /> ดูไฟล์ Google Sheet
            </button>
          </div>
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
