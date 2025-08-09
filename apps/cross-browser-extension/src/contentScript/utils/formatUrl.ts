export interface FormattedUrl {
  protocol: string;
  domainPart: string;
  pathAndParams: string;
}

export function formatUrl(href: string): FormattedUrl {
  try {
    const url = new URL(href);
    return {
      protocol: url.protocol + '//',
      domainPart: url.hostname,
      pathAndParams: url.pathname + url.search + url.hash
    };
  } catch {
    return {
      protocol: '',
      domainPart: href,
      pathAndParams: ''
    };
  }
}
