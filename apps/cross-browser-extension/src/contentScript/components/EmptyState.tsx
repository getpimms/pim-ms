import React from 'react';
import Code from './ui/Code';

const EmptyState: React.FC = () => {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center p-6 text-center text-slate-500">
      <div className="mb-4 text-[40px]">🔍</div>
      <div className="mb-3 text-[15px] font-semibold text-slate-700">No links detected</div>
    </div>
  );
};

export default EmptyState;
