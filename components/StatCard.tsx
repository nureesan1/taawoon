
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  colorClass?: string;
  valueColorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subValue, 
  icon, 
  colorClass = "bg-white",
  valueColorClass = "text-slate-800"
}) => {
  return (
    <div className={`${colorClass} rounded-xl shadow-sm p-6 border border-slate-100 flex items-start justify-between transition-transform hover:-translate-y-1`}>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className={`text-2xl font-bold ${valueColorClass}`}>{value}</h3>
        {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
      </div>
      <div className="p-3 bg-slate-50 rounded-lg text-teal-600">
        {icon}
      </div>
    </div>
  );
};
