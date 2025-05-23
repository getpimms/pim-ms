import { ElementType } from "react";
import {
  Book2Fill,
  BulletListFill,
  ConnectedDotsFill,
  CubeSettingsFill,
  DiamondTurnRightFill,
  FeatherFill,
  Github,
  Go,
  HeadsetFill,
  HeartFill,
  HexadecagonStar,
  Hyperlink,
  LinesY,
  LinkedIn,
  MicrophoneFill,
  Php,
  ProductHunt,
  Python,
  Raycast,
  Ruby,
  Twitter,
  Typescript,
  UsersFill,
  YouTube,
} from "./icons";
import { Elxo } from "./icons/elxo";

export type NavItemChild = {
  title: string;
  description?: string;
  href: string;
  icon: ElementType;
  iconClassName?: string;
};

export type NavItemChildren = (
  | NavItemChild
  | { label: string; items: NavItemChild[] }
)[];

export const FEATURES_LIST = [
  {
    title: "PIMMS Links",
    description: "Short links with superpowers",
    icon: Hyperlink,
    href: "/",
  },
  {
    title: "PIMMS Analytics",
    description: "Powerful real-time analytics",
    icon: LinesY,
    href: "/analytics",
  },
  {
    title: "PIMMS API",
    description: "Programmatic link creation at scale",
    icon: CubeSettingsFill,
    href: "/docs/api-reference/introduction",
  },
  {
    title: "PIMMS Integrations",
    description: "Connect PIMMS with your favorite tools",
    icon: ConnectedDotsFill,
    href: "/docs/integrations",
  },
];

export const CUSTOMER_STORIES = [
  {
    icon: Raycast,
    iconClassName: "group-hover:text-[#FF6363]",
    title: "Raycast",
    description: "Programmatic link sharing",
    href: "/customers/raycast",
  },
  {
    icon: ProductHunt,
    iconClassName: "group-hover:text-[#FF6154]",
    title: "Product Hunt",
    description: "Unlocking new growth",
    href: "/customers/product-hunt",
  },
  {
    icon: Elxo,
    iconClassName: "group-hover:text-[#353D7C]",
    title: "Elxo",
    description: "Overcoming API latency",
    href: "/customers/elxo",
  },
];

export const SDKS = [
  {
    icon: Typescript,
    iconClassName: "py-0.5 group-hover:text-[#3178C6]",
    title: "Typescript",
    href: "/sdks/typescript",
  },
  {
    icon: Python,
    iconClassName:
      "py-0.5 [&_.snake]:transition-colors group-hover:[&_.snake1]:text-[#3776ab] group-hover:[&_.snake2]:text-[#ffd343]",
    title: "Python",
    href: "/sdks/python",
  },
  {
    icon: Go,
    iconClassName: "group-hover:text-[#00ACD7]",
    title: "Go",
    href: "/sdks/go",
  },
  {
    icon: Ruby,
    iconClassName:
      "py-[3px] grayscale brightness-150 transition-[filter] group-hover:grayscale-0 group-hover:brightness-100",
    title: "Ruby",
    href: "/sdks/ruby",
  },
  {
    icon: Php,
    iconClassName:
      "py-[3px] grayscale brightness-150 transition-[filter] group-hover:grayscale-0 group-hover:brightness-100",
    title: "PHP",
    href: "/sdks/php",
  },
];

export const SOLUTIONS: NavItemChildren = [
  {
    icon: DiamondTurnRightFill,
    title: "Marketing Attribution",
    description: "Easily track and measure marketing impact",
    href: "/analytics",
  },
  {
    icon: MicrophoneFill,
    title: "Content Creators",
    description: "Intelligent audience insights and link tracking",
    href: "/solutions/creators",
  },
  {
    icon: UsersFill,
    title: "Affiliate Management",
    description: "Manage affiliates and automate payouts",
    href: "/partners",
  },
  {
    label: "SDKs",
    items: SDKS,
  },
];

export const RESOURCES = [
  {
    icon: Book2Fill,
    title: "Docs",
    description: "Platform documentation",
    href: "/docs/introduction",
  },
  {
    icon: HeadsetFill,
    title: "Help Center",
    description: "Answers to your questions",
    href: "/help",
  },
  {
    icon: FeatherFill,
    title: "Blog",
    description: "Insights and stories",
    href: "/blog",
  },
  {
    icon: BulletListFill,
    title: "Changelog",
    description: "Releases and updates",
    href: "/changelog",
  },
  {
    icon: HeartFill,
    title: "Customers",
    description: "Success stories and use cases",
    href: "/customers",
  },
  {
    icon: HexadecagonStar,
    title: "PIMMS Brand",
    description: "Logos, wordmark, etc.",
    href: "/brand",
  },
];

export const COMPARE_PAGES = [
  { name: "Bitly", slug: "bitly" },
  { name: "Rebrandly", slug: "rebrandly" },
  { name: "Short.io", slug: "short" },
  { name: "Bl.ink", slug: "blink" },
];

export const LEGAL_PAGES = [
  { name: "Privacy", slug: "privacy" },
  { name: "Terms", slug: "terms" },
  { name: "DPA", slug: "dpa" },
  { name: "Subprocessors", slug: "subprocessors" },
  { name: "Report Abuse", slug: "abuse" },
];

export const SOCIAL_LINKS = [
  { name: "X (Twitter)", icon: Twitter, href: "https://x.com/dubdotco" },
  {
    name: "LinkedIn",
    icon: LinkedIn,
    href: "https://www.linkedin.com/company/dubinc",
  },
  {
    name: "GitHub",
    icon: Github,
    href: "https://github.com/dubinc/dub",
  },
  {
    name: "YouTube",
    icon: YouTube,
    href: "https://www.youtube.com/@dubdotco",
  },
];
