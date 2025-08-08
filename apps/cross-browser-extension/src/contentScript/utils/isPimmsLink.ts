export default function isPimmsLink(href: string): boolean {
  return typeof href === 'string' && /^(?:https?:\/\/)?pim\.ms(?:\/|$)/i.test(href);
}