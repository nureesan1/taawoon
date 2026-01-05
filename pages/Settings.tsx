
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, Database, ShieldAlert, CheckCircle2, RefreshCw, Wand2, RotateCcw, Link, Link2Off, Loader2, Info, ExternalLink, Copy, Check, Globe } from 'lucide-react';

export const Settings: React.FC = () => {
  const { config, updateConfig, resetConfig, refreshData, initDatabase, testConnection, connectionStatus } = useStore();
  const [formData, setFormData] = useState(config);
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    updateConfig(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    
    if (formData.useGoogleSheets && formData.scriptUrl) {
        refreshData();
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    await testConnection();
    setIsTesting(false);
  };

  const openTestTab = () => {
    if (formData.scriptUrl) {
      window.open(formData.scriptUrl, '_blank');
    } else {
      alert('กรุณากรอก URL ก่อนทดสอบ');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>
          <p className="text-slate-500">จัดการการเชื่อมต่อฐานข้อมูล Google Sheets</p>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm transition-all ${
          connectionStatus === 'connected' ? 'bg-green-50 border-green-200 text-green-700' : 
          connectionStatus === 'checking' ? 'bg-blue-50 border-blue-200 text-blue-700' :
          'bg-red-50 border-red-200 text-red-700'
        }`}>
          {connectionStatus === 'connected' ? <Link className="w-4 h-4" /> : 
           connectionStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
           <Link2Off className="w-4 h-4" />}
          <span className="text-xs font-black uppercase tracking-widest">
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'checking' ? 'Checking...' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <Database className="w-5 h-5" />
                <h2 className="font-bold">การเชื่อมต่อ API</h2>
              </div>
              <button 
                onClick={() => { if(confirm('ต้องการล้างค่าการเชื่อมต่อเป็นค่าเริ่มต้นหรือไม่?')) { resetConfig(); setFormData(DEFAULT_CONFIG); } }}
                className="text-[10px] text-slate-400 font-bold flex items-center gap-1 hover:text-red-500"
              >
                <RotateCcw className="w-3 h-3" /> คืนค่าพื้นฐาน
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-start gap-4 p-4 bg-teal-50/50 rounded-xl border border-teal-100">
                <div className="pt-1">
                    <input 
                        type="checkbox"
                        id="useSheets"
                        checked={formData.useGoogleSheets}
                        onChange={(e) => setFormData(prev => ({ ...prev, useGoogleSheets: e.target.checked }))}
                        className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                    />
                </div>
                <div>
                    <label htmlFor="useSheets" className="font-bold text-slate-800 cursor-pointer select-none">
                        เปิดใช้งานการเชื่อมต่อ Google Sheets
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                        หากปิดใช้งาน ระบบจะทำงานในโหมด "สาธิต" (ข้อมูลจะไม่ถูกบันทึกถาวร)
                    </p>
                </div>
              </div>

              {formData.useGoogleSheets && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Web App URL</label>
                        <div className="flex gap-2">
                          <input 
                              type="text" 
                              value={formData.scriptUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, scriptUrl: e.target.value }))}
                              placeholder="https://script.google.com/macros/s/.../exec"
                              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-teal-400 outline-none font-mono text-xs transition-all"
                          />
                          <button 
                            type="button"
                            onClick={openTestTab}
                            title="ทดสอบเปิดในแท็บใหม่"
                            className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                          >
                            <Globe className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 ml-1">
                            <Info className="w-3 h-3" />
                            <span>หาก URL ถูกต้อง เมื่อกดปุ่มลูกโลกจะเห็นคำว่า <b>"API is ONLINE"</b></span>
                        </div>
                    </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <button 
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 font-bold shadow-lg shadow-teal-200 active:scale-95 transition-all"
                >
                    {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                    {isSaved ? 'บันทึกสำเร็จ' : 'บันทึกการตั้งค่า'}
                </button>
                
                {formData.useGoogleSheets && (
                    <button 
                        onClick={handleTest}
                        disabled={isTesting}
                        className="flex items-center justify-center gap-2 px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-all font-bold border border-slate-200"
                    >
                        {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        ทดสอบเชื่อมต่อ
                    </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
               <h2 className="font-bold text-slate-700">เครื่องมือจัดการฐานข้อมูล</h2>
            </div>
            <div className="p-6">
                <p className="text-xs text-slate-500 mb-4">กดปุ่มนี้เพื่อสร้างหัวตารางใน Google Sheets ของคุณให้ถูกต้องตามที่ระบบต้องการ</p>
                <button 
                    onClick={() => { if(confirm('คำเตือน: นี่จะเป็นการสร้างหัวตารางใหม่ใน Sheet ของคุณ ต้องการดำเนินการต่อหรือไม่?')) initDatabase(); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-amber-200 font-bold text-sm"
                >
                    <Wand2 className="w-4 h-4" />
                    รีเซ็ตหัวตาราง (Init Database)
                </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#064e3b] to-teal-800 rounded-2xl shadow-xl p-6 text-white">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2 uppercase tracking-tight">
                <Info className="w-5 h-5" /> ขั้นตอนที่ต้องเช็ค
            </h3>
            <ul className="space-y-4 text-xs font-medium">
                <li className="flex gap-3">
                    <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                    <p>คัดลอกโค้ด <b>backend-script.gs</b> ใหม่ล่าสุดไปวางใน Apps Script</p>
                </li>
                <li className="flex gap-3">
                    <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                    <p>กด <b>Deploy > New Deployment</b> (ห้ามใช้ Test Deployment)</p>
                </li>
                <li className="flex gap-3 border-l-2 border-yellow-400 pl-3">
                    <p className="text-yellow-200 font-bold">ในหัวข้อ "Who has access" ต้องเลือกเป็น "Anyone" เท่านั้น</p>
                </li>
                <li className="flex gap-3">
                    <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                    <p>คัดลอก <b>Web App URL</b> มาวางในช่องด้านซ้าย</p>
                </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
             <h3 className="font-bold text-red-600 flex items-center gap-2 mb-3">
                <ShieldAlert className="w-5 h-5" /> วิธีแก้ Failed to fetch
             </h3>
             <div className="space-y-3 text-xs text-slate-500">
                <p>• ลองเปิด <b>Incognito / Private Mode</b> เพื่อทดสอบว่าปลั๊กอินเบราว์เซอร์บล็อกหรือไม่</p>
                <p>• ตรวจสอบว่า URL ลงท้ายด้วย <b>/exec</b> หรือไม่ (ห้ามใช้ URL ที่มีคำว่า /edit)</p>
                <p>• หากแก้โค้ดใน Apps Script ต้องกด <b>Deploy > New Deployment</b> และเลือก <b>Version: New</b> ทุกครั้ง</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_CONFIG = {
  useGoogleSheets: true,
  scriptUrl: ''
};
