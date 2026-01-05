
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, Database, ShieldAlert, CheckCircle2, RefreshCw, Wand2, RotateCcw } from 'lucide-react';

export const Settings: React.FC = () => {
  const { config, updateConfig, resetConfig, refreshData, initDatabase } = useStore();
  const [formData, setFormData] = useState(config);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateConfig(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    
    if (formData.useGoogleSheets && formData.scriptUrl) {
        refreshData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>
          <p className="text-slate-500">จัดการการเชื่อมต่อฐานข้อมูล</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-700">การเชื่อมต่อฐานข้อมูล (Database Connection)</h2>
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
                    เมื่อเปิดใช้งาน ระบบจะดึงและบันทึกข้อมูลไปยัง Google Sheets ผ่าน Apps Script แทนการเก็บข้อมูลชั่วคราวบนเครื่อง
                </p>
             </div>
          </div>

          {formData.useGoogleSheets && (
            <div className="space-y-4 pl-9 animate-in slide-in-from-top-2 fade-in">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Google Apps Script Web App URL</label>
                    <input 
                        type="text" 
                        value={formData.scriptUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, scriptUrl: e.target.value }))}
                        placeholder="https://script.google.com/macros/s/..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all outline-none font-mono text-sm"
                    />
                    <p className="text-xs text-slate-400">
                        *URL นี้จะได้จากการ Deploy Google Apps Script เป็น Web App (Access: Anyone)
                    </p>
                </div>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100 flex gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold mb-1">คำแนะนำการแก้ไขปัญหา</p>
                        <ol className="list-decimal pl-4 space-y-1 opacity-90">
                            <li>ตรวจสอบว่า URL ถูกต้องและลงท้ายด้วย <code>/exec</code></li>
                            <li>หากแก้โค้ดใน Apps Script ต้อง Deploy เป็น <strong>"New Version"</strong> เสมอ</li>
                            <li>หากข้อมูลไม่โชว์ ให้กดปุ่ม <strong>"Initialize Database"</strong> ด้านล่าง</li>
                        </ol>
                    </div>
                </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4">
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-lg hover:bg-teal-700 font-medium shadow-md shadow-teal-200 active:scale-95 transition-all"
            >
                {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {isSaved ? 'บันทึกเรียบร้อย' : 'บันทึกการตั้งค่า'}
            </button>
            
            {formData.useGoogleSheets && (
                <>
                <button 
                    onClick={refreshData}
                    className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    ดึงข้อมูลใหม่
                </button>
                <button 
                    onClick={initDatabase}
                    className="flex items-center gap-2 px-4 py-2.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-100"
                >
                    <Wand2 className="w-4 h-4" />
                    Initialize Database
                </button>
                </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
