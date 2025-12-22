import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
      {title && (
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
        </div>
      )}
      <div className="p-4 md:p-5">
        {children}
      </div>
    </div>
  );
};