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
  // Optional regex (as string) that must match window.location.href for onboarding block injection.
  onboardingPageUrlPatterns?: string[];
  // Optional regex (as string) that must match window.location.href for detection block injection.
  detectionPageUrlPattern?: string;
  // Optional regex (as string) that must match window.location.href for analytics block injection.
  // Example for resend.com analytics pages: "^https?:\\/\\/(?:www\\.)?resend\\.com\\/broadcasts\\/[0-9a-fA-F-]{36}$"
  analyticsPageUrlPattern?: string;
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
    onboardingPageUrlPatterns: ['^https?:\/\/(?:www\.)?resend\.com\/broadcasts$', '^https?:\/\/(?:www\.)?resend\.com\/?$'],
    detectionPageUrlPattern: '^https?:\/\/(?:www\.)?resend\.com\/broadcasts\/[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}/editor$',
    rootSelectors: ['.emailEditor', '.editorSelection'],
    // Allow optional trailing segments after the broadcast ID (e.g., /summary, /overview)
    analyticsPageUrlPattern: '^https?:\/\/(?:www\.)?resend\.com\/broadcasts\/[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$',
    // XPath selects the first child inside .scrollContainer; injector will insert after this child
    analyticsPageXPath: "//*[contains(@class,'scrollContainer')][1]/*[2]/*[1]/*",
    broadcastIdRegex: '^https?:\\/\\/(?:www\\.)?resend\\.com\\/broadcasts\\/([0-9a-fA-F-]{36})(?:\/.*)?$',
    defaultUtmSource: 'resend.com',
    defaultUtmMedium: 'email'
  },
  {
    domain: 'brevo.com',
    rootSelectors: ['#canvas'],
    onboardingPageUrlPatterns: ['^https?:\/\/(?:www|app\.)?brevo\.com\/?$', '^https?:\/\/(?:www|app\.)?brevo\.com\/campaigns\/(.*)$'],
    detectionPageUrlPattern: '^https?:\/\/(?:www|app\.)?brevo\.com\/editor\/(.*)$',
    analyticsPageUrlPattern: '^https?:\/\/(?:www|app\.)?brevo\.com\/marketing-reports\/email\/([0-9]{1,})\/overview$',
    analyticsPageXPath: "//*[@id='email_reports']/div/div[2]/div/div",
    broadcastIdRegex: '^https?:\/\/(?:www|app\.)?brevo\.com\/editor\/(.*)$',
    defaultUtmSource: 'brevo.com',
    defaultUtmMedium: 'email'
  },
  // Add more domains here with precise scoping and behaviors as needed
];
