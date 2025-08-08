import React from 'react';
import { LinkData } from '../../types';

interface HoveredLinkProps {
  link: LinkData;
}

const HoveredLink: React.FC<HoveredLinkProps> = ({ link }) => {
  const handleShortenClick = () => {
    console.log('🔗 Shorten button clicked for:', link.href);
    // TODO: Implement PIMMS shortening
  };

  const formatUrl = (href: string) => {
    const url = new URL(href);
    const protocol = url.protocol + '//';
    const domainPart = url.hostname;
    const pathAndParams = url.pathname + url.search + url.hash;
    
    return { protocol, domainPart, pathAndParams };
  };

  const { protocol, domainPart, pathAndParams } = formatUrl(link.href);

  return (
    <div className="p-4 h-[320px] flex flex-col">
      {/* Link Info */}
      <div className="card flex-1 mb-4">
        <div className="mb-3 text-[14px] font-semibold text-slate-900 break-words">
          {link.text}
        </div>
        
        <div className="text-[11px] font-mono break-all">
          <span className="text-slate-600">{protocol}</span>
          <span className="text-primary font-medium">{domainPart}</span>
          <span className="text-slate-700">{pathAndParams}</span>
        </div>
      </div>

      {/* Shorten Button */}
      <button onClick={handleShortenClick} className="btn-primary">
        Shorten with PIMMS
      </button>
    </div>
  );
};

export default HoveredLink;
