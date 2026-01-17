
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "กำลังประมวลผล..." }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300 border border-slate-100">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-teal-100 rounded-full"></div>
          <Loader2 className="w-16 h-16 text-teal-600 animate-spin absolute top-0 left-0" />
        </div>
        <p className="text-slate-800 font-black text-lg tracking-tight">{message}</p>
        <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-[0.2em]">Please wait a moment</p>
      </div>
    </div>
  );
};
