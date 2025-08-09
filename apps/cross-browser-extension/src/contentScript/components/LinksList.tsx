import React from 'react';
import { LinkData } from '../../types';
import { cn } from '@dub/utils';
import isPimmsLink from '../utils/isPimmsLink';
import { formatUrl } from '../utils/formatUrl';
import LinkLogo from './LinkLogo';


interface LinksListProps {
  links: LinkData[];
  onLinkClick: (link: LinkData) => void;
  onLinkHover: (link: LinkData) => void;
  onLinkUnhover: (link: LinkData) => void;
}

const LinksList: React.FC<LinksListProps> = ({ links, onLinkClick, onLinkHover, onLinkUnhover }) => {

  return (
    <div className="h-[340px] overflow-y-auto">
      {links.map((link) => {
        const { domainPart, pathAndParams } = formatUrl(link.href);
        const isShortened = isPimmsLink(link.href);

        return (
          <div
            key={link.id}
            onClick={() => onLinkClick(link)}
            onMouseEnter={() => onLinkHover(link)}
            onMouseLeave={() => onLinkUnhover(link)}
            className={cn(
              "group flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2.5 text-sm",
              "transition-colors duration-150 hover:bg-neutral-50 cursor-pointer"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-inset ring-[#cfe0ff]">
                <LinkLogo href={link.href} className="h-6 w-6 rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono text-[13px]">
                  <span className="truncate">
                    <span className="font-semibold text-[#3971ff]">{domainPart}</span>
                    <span className="text-neutral-800">{pathAndParams}</span>
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[12px] text-neutral-500">
                  <span className="opacity-70">↳</span>
                  <span className="truncate">{link.text || link.href}</span>
                </div>
              </div>
            </div>
            {isShortened && (
              <span
                className="ml-2 inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700"
                title="Already shortened"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8.5 12.086 5.707 9.293a1 1 0 10-1.414 1.414l3.5 3.5a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                Shortened
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LinksList;
