
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, Database, ShieldAlert, CheckCircle2, RefreshCw, Wand2, RotateCcw, Link, Link2Off, Loader2, AlertCircle } from 'lucide-react';

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
    const ok = await testConnection();
    setIsTesting(false);
    if (ok) alert("เชื่อมต่อสำเร็จ!");
    else alert("เชื่อมต่อไม่สำเร็จ! กรุณาตรวจสอบ URL หรือสิทธิ์การเข้าถึง (Who has access: Anyone)");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>
          <p className="text-slate-500">จัดการการเชื่อมต่อฐานข้อมูล</p>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-700">การเชื่อมต่อ Google Sheets</h2>
          </div>
          <button 
            onClick={() => { if(confirm('ต้องการล้างค่าการเชื่อมต่อเป็นค่าเริ่มต้นหรือไม่?')) resetConfig(); }}
            className="text-xs text-red-500 font-bold flex items-center gap-1 hover:underline"
          >
            <RotateCcw className="w-3 h-3" /> ล้างค่าแคช
          </button>
        </div>
        
        <div className="p-8 space-y-8">
          
          <div className="flex items-start gap-4">
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
                <label htmlFor="useSheets" className="font-semibold text-slate-800 cursor-pointer select-none">
                    ใช้งาน Google Sheets Database
                </label>
                <p className="text-sm text-slate-500 mt-1">
                    เมื่อเปิดใช้งาน ระบบจะเก็บข้อมูลไว้ที่ Google Sheets ถาวร (ผ่าน Apps Script)
                </p>
             </div>
          </div>

          {formData.useGoogleSheets && (
            <div className="space-y-6 pl-9 animate-in slide-in-from-top-2 fade-in">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Google Apps Script Web App URL</label>
                    <input 
                        type="text" 
                        value={formData.scriptUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, scriptUrl: e.target.value }))}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all outline-none font-mono text-sm"
                    />
                    <p className="text-xs text-slate-400">
                        *URL ต้องลงท้ายด้วย <code>/exec</code> เท่านั้น
                    </p>
                </div>

                {connectionStatus === 'disconnected' && formData.scriptUrl && (
                    <div className="bg-red-50 border border-red-100 p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-red-700 font-bold">
                            <AlertCircle className="w-5 h-5" />
                            <span>ไม่สามารถเชื่อมต่อได้ (Failed to fetch)</span>
                        </div>
                        <p className="text-sm text-red-600">กรุณาตรวจสอบขั้นตอนเหล่านี้ใน Google Apps Script:</p>
                        <ol className="list-decimal pl-5 text-xs text-red-600 space-y-1.5 font-medium">
                            <li>ไปที่ <b>Deploy > Manage Deployments</b></li>
                            <li>กดแก้ไข (รูปดินสอ) และเลือก <b>Version: New Version</b> เสมอ</li>
                            <li>สำคัญมาก: ช่อง <b>Who has access</b> ต้องเป็น <b>Anyone</b></li>
                            <li>คัดลอก URL ใหม่จากหน้า Deployment มาวางที่นี่อีกครั้ง</li>
                        </ol>
                    </div>
                )}

                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-100 flex gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold mb-1 text-amber-900">คำแนะนำเพิ่มเติม</p>
                        <p className="text-xs opacity-90">หากเป็นไฟล์ Google Sheets ใหม่ที่ยังไม่มีข้อมูล ให้กดปุ่ม <b>"Reset Headers"</b> ด้านล่างเพื่อเตรียมหัวตาราง</p>
                    </div>
                </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4">
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-teal-600 text-white px-8 py-3 rounded-xl hover:bg-teal-700 font-bold shadow-md shadow-teal-200 active:scale-95 transition-all"
            >
                {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {isSaved ? 'บันทึกเรียบร้อย' : 'บันทึกการตั้งค่า'}
            </button>
            
            {formData.useGoogleSheets && (
                <>
                <button 
                    onClick={handleTest}
                    disabled={isTesting}
                    className="flex items-center gap-2 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-bold text-sm border border-slate-200"
                >
                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    ทดสอบการเชื่อมต่อ
                </button>
                <button 
                    onClick={initDatabase}
                    className="flex items-center gap-2 px-4 py-3 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-amber-200 font-bold text-sm"
                >
                    <Wand2 className="w-4 h-4" />
                    Reset Headers
                </button>
                </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
