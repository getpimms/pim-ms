export interface LinkData {
  href: string;
  text: string;
  domain: string;
  element: HTMLElement;
  id: string;
  isTextUrl: boolean;
}

export type PanelState = 'links' | 'hovered';

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
export const EMAIL_MARKETING_DOMAINS: string[] = [
  'resend.com',
  'lemlist.com',
  'pimms.io',
  'mailchimp.com',
  'sendgrid.com',
  'constantcontact.com',
  'campaignmonitor.com',
  'aweber.com',
  'getresponse.com',
  'convertkit.com',
  'drip.com',
  'activecampaign.com',
  'mailerlite.com',
  'sendinblue.com',
  'klaviyo.com',
  'omnisend.com',
  'mailjet.com',
  'sparkpost.com',
  'postmark.com',
  'mandrill.com',
  'amazon.ses',
  'smtp.com',
  'socketlabs.com',
  'mailgun.com'
];
