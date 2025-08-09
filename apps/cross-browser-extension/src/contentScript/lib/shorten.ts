import { EMAIL_MARKETING_DOMAINS } from "../../types";
import { retryWithBackoff } from "../../utils/retry";

export async function sendChromeMessage(message: any, timeoutMs: number = 4000): Promise<{ __error?: string; __timeout?: boolean; resp?: any }> {
  return new Promise((resolve) => {
    let done = false;
    const timer = window.setTimeout(() => {
      if (!done) { done = true; resolve({ __timeout: true }); }
    }, timeoutMs);
    try {
      chrome.runtime.sendMessage(message, (resp) => {
        if (done) return;
        window.clearTimeout(timer);
        const err = chrome.runtime.lastError?.message;
        if (err) resolve({ __error: err }); else resolve({ resp });
      });
    } catch (e: any) {
      if (done) return;
      window.clearTimeout(timer);
      resolve({ __error: String(e?.message || e) });
    }
  });
}

export function extractUtmForCurrentHost(href: string) {
  let urlObj: URL | null = null;
  try {
    urlObj = new URL(href.startsWith("http") ? href : `https://${href}`);
  } catch {
    // Invalid URL, continue with empty params
  }
  
  const params = urlObj?.searchParams;
  const host = window.location.hostname.toLowerCase();
  const cfg = EMAIL_MARKETING_DOMAINS.find(d => host === d.domain || host.endsWith(`.${d.domain}`));
  
  // Extract campaign ID from current page URL
  let campaignFromUrl: string | null = null;
  if (cfg?.broadcastIdRegex) {
    try {
      const match = new RegExp(cfg.broadcastIdRegex, 'i').exec(window.location.href);
      if (match?.[1]) campaignFromUrl = match[1];
    } catch {}
  }
  
  // Fallback: look for UUID in broadcasts path
  if (!campaignFromUrl) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const broadcastIndex = pathParts.findIndex(p => p.toLowerCase() === 'broadcasts');
    const candidate = broadcastIndex >= 0 ? pathParts[broadcastIndex + 1] : undefined;
    if (candidate && /^[0-9a-f-]{36}$/i.test(candidate)) {
      campaignFromUrl = candidate;
    }
  }
  
  const truncate = (str: string | null | undefined) => str?.slice(0, 190) ?? null;
  
  return {
    utm_source: truncate(params?.get('utm_source') ?? cfg?.defaultUtmSource ?? null),
    utm_medium: truncate(params?.get('utm_medium') ?? cfg?.defaultUtmMedium ?? null),
    utm_campaign: truncate(params?.get('utm_campaign') ?? campaignFromUrl),
    utm_term: truncate(params?.get('utm_term')),
    utm_content: truncate(params?.get('utm_content')),
  };
}


function runtimeValid() {
  try { return Boolean(chrome?.runtime?.id); } catch { return false; }
}

async function retryMessage(message: any): Promise<void> {
  await retryWithBackoff(async () => {
    const res = await sendChromeMessage(message);
    if (res.__error || res.__timeout) {
      const msg = res.__error || "Request timed out";
      if (/context invalidated/i.test(msg) || !runtimeValid()) {
        throw new Error("Extension context invalidated");
      }
      throw new Error(msg);
    }
  }, {
    maxAttempts: 3,
    initialDelay: 200,
    maxDelay: 1000,
  });
}

async function ensureOffscreenContext() {
  await retryMessage({ type: "ENSURE_OFFSCREEN" });
}

export async function shortenViaOffscreen(href: string, timeoutMs: number = 7000): Promise<{ ok: boolean; shortened?: string; status?: number; error?: string; requestId: string }>{
  if (!runtimeValid()) {
    throw new Error("Extension context invalidated");
  }
  await ensureOffscreenContext();

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } = extractUtmForCurrentHost(href);
  const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  await retryMessage({
    type: "PIMMS_SHORTEN_REQUEST",
    href,
    requestId,
    _from: "content",
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
  });

  return new Promise((resolve) => {
    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      try { chrome.runtime.onMessage.removeListener(onResult as any); } catch {}
      resolve({ ok: false, error: "Timed out waiting for result", requestId });
    }, timeoutMs);

    const onResult = (message: any) => {
      if (done) return;
      if (!message || message.type !== "PIMMS_SHORTEN_RESULT" || message.requestId !== requestId) return;
      done = true;
      window.clearTimeout(timer);
      try { chrome.runtime.onMessage.removeListener(onResult as any); } catch {}
      const shortened = message.ok ? (message.data?.shortened as string | undefined) : undefined;
      resolve({ ok: !!message.ok, shortened, status: message.status, error: message.error, requestId });
    };
    chrome.runtime.onMessage.addListener(onResult as any);
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  }
}


