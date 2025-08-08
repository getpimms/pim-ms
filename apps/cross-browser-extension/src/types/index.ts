export interface LinkData {
  href: string;
  text: string;
  domain: string;
  element: HTMLElement;
  id: string;
  isTextUrl: boolean;
}

export type PanelState = 'links' | 'hovered';

export interface EmailMarketingDomainConfig {
  domain: string; // base domain (e.g. resend.com)
  // CSS selectors that define the roots where we should scan for links.
  // If empty or missing, we scan the whole document body.
  rootSelectors?: string[];
  // XPath for the analytics page container where we should inject PIMMS analytics block
  analyticsPageXPath?: string;
  // Optional regex (as string) that must match window.location.href for analytics block injection.
  // Example for resend.com analytics pages: "^https?:\\/\\/(?:www\\.)?resend\\.com\\/broadcasts\\/[0-9a-fA-F-]{36}$"
  analyticsPageUrlPattern?: string;
  // Optional CSS selector that must be present before we show any analytics UI (including skeletons).
  // Used to wait for the host app's analytics view to finish mounting (e.g. a header inside the container).
  analyticsReadySelector?: string;
  // Optional regex to extract a campaign/email/broadcast ID from current URL (first capturing group)
  broadcastIdRegex?: string;
  // Default UTM values injected when creating links for this domain
  defaultUtmSource?: string;
  defaultUtmMedium?: string;
}

export interface PimmsEventListeners {
  mouseEnter: (e: MouseEvent) => void;
  mouseLeave: () => void;
  click: (e: MouseEvent) => void;
}

export interface ChromeMessage {
  type: string;
  [key: string]: any;
}

// Centralized list of supported email marketing domains (deduplicated)
// Unified email marketing domains configuration
export const EMAIL_MARKETING_DOMAINS: EmailMarketingDomainConfig[] = [
  {
    domain: 'resend.com',
    rootSelectors: ['.emailEditor', '.editorSelection'],
    analyticsPageUrlPattern: '^https?:\\/\\/(?:www\\.)?resend\\.com\\/broadcasts\\/[0-9a-fA-F-]{36}$',
    analyticsReadySelector: '.scrollContainer h1',
    broadcastIdRegex: '^https?:\\/\\/(?:www\\.)?resend\\.com\\/broadcasts\\/([0-9a-fA-F-]{36})$',
    defaultUtmSource: 'resend.com',
    defaultUtmMedium: 'email'
  },
  // Add more domains here with precise scoping and behaviors as needed
];
