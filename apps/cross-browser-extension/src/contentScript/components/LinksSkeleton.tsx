import React from 'react';

const LinksSkeleton: React.FC = () => {
  return (
    <div className="h-[340px] overflow-hidden p-2">
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            {/* Avatar skeleton */}
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-neutral-200"></div>
            
            {/* Content skeleton */}
            <div className="flex-1 space-y-1.5">
              {/* URL skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-3 w-16 bg-blue-200 rounded"></div>
                <div className="h-3 w-32 bg-neutral-200 rounded"></div>
              </div>
              
              {/* Text skeleton */}
              <div className="flex items-center gap-1">
                <div className="h-2 w-3 bg-neutral-200 rounded"></div>
                <div className="h-2 w-24 bg-neutral-200 rounded"></div>
              </div>
            </div>
            
            {/* Badge skeleton (sometimes) */}
            {i % 3 === 0 && (
              <div className="h-4 w-12 bg-green-200 rounded"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinksSkeleton;
