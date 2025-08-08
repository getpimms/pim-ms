import React, { useState, useEffect } from 'react';
import LinksList from './components/LinksList';
import HoveredLink from './components/HoveredLink';
import EmptyState from './components/EmptyState';
import { LinkData, PanelState } from '../types';

const App: React.FC = () => {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [panelState, setPanelState] = useState<PanelState>('links');
  const [hoveredLink, setHoveredLink] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for messages from content script
    const messageListener = (message: any) => {
      console.log('🎯 Popup received message:', message);
      
      switch (message.type) {
        case 'LINKS_UPDATED':
          setLinks(message.links || []);
          setLoading(false);
          break;
          
        case 'HOVERED_LINK':
          setHoveredLink(message.link);
          setPanelState('hovered');
          break;
          
        case 'HIDE_HOVERED_LINK':
          setHoveredLink(null);
          setPanelState('links');
          break;
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Request initial links from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_LINKS' });
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const handleLinkClick = (link: LinkData) => {
    console.log('🔗 Popup link clicked:', link.text);
    
    // Send message to content script to scroll and highlight
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SCROLL_TO_LINK',
          linkId: link.id
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <h1 className="m-0 text-[15px] font-semibold text-slate-700">
            {panelState === 'hovered' ? '🎯 Hovered Link' : `🔗 PIMMS Links (${links.length})`}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-slate-25">
        {panelState === 'hovered' && hoveredLink ? (
          <HoveredLink link={hoveredLink} />
        ) : links.length === 0 ? (
          <EmptyState />
        ) : (
          <LinksList links={links} onLinkClick={handleLinkClick} />
        )}
      </div>
    </div>
  );
};

export default App;
