import React from 'react';
import { LinkData } from '../../types';

interface LinksListProps {
  links: LinkData[];
  onLinkClick: (link: LinkData) => void;
}

const LinksList: React.FC<LinksListProps> = ({ links, onLinkClick }) => {
  const formatUrl = (href: string, domain: string) => {
    // Extract the parts of the URL
    const url = new URL(href);
    const protocol = url.protocol + '//';
    const domainPart = url.hostname;
    const pathAndParams = url.pathname + url.search + url.hash;
    
    return { protocol, domainPart, pathAndParams };
  };

  return (
    <div className="h-[320px] overflow-y-auto p-2 space-y-1">
      {links.map((link) => {
        const { protocol, domainPart, pathAndParams } = formatUrl(link.href, link.domain);
        
        return (
          <div
            key={link.id}
            onClick={() => onLinkClick(link)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-primary hover:bg-slate-50 hover:shadow-sm"
          >
            {/* Link Text */}
            <div className="mb-2 text-[13px] font-semibold text-slate-900 truncate">
              {link.text}
            </div>

            {/* Merged Domain + URL */}
            <div className="flex items-center text-[11px] font-mono">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              <div className="truncate">
                <span className="text-slate-600">{protocol}</span>
                <span className="text-primary font-medium">{domainPart}</span>
                <span className="text-slate-700">{pathAndParams}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LinksList;
