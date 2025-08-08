import React from 'react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center p-6 text-center text-slate-500">
      <div className="mb-4 text-[40px]">🔍</div>
      <div className="mb-3 text-[15px] font-semibold text-slate-700">No links detected</div>
      <div className="max-w-[280px] text-[13px] leading-[1.4] text-slate-600">
        Browse to email marketing platforms or type URLs like{' '}
        <code className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-600 font-medium">
          pimms.io
        </code>{' '}
        or{' '}
        <code className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-600 font-medium">
          resend.com
        </code>
      </div>
    </div>
  );
};

export default EmptyState;
