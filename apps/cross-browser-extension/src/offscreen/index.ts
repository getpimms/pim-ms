// Offscreen document script: performs cross-origin fetches and returns results
import { APP_DOMAIN } from "@dub/utils";

const API_URL = `${APP_DOMAIN}/api/links`;

let cachedWorkspaceSlug: string | null = null;
let lastWorkspaceFetchTs = 0;
const WORKSPACE_CACHE_MS = 5 * 60 * 1000;

async function getDefaultWorkspaceSlug(): Promise<string | null> {
  const now = Date.now();
  if (cachedWorkspaceSlug && now - lastWorkspaceFetchTs < WORKSPACE_CACHE_MS) {
    return cachedWorkspaceSlug;
  }
  try {
    const meRes = await fetch(`${APP_DOMAIN}/api/me`, { credentials: 'include' });
    
    // Detect auth errors and signal cache invalidation
    if (meRes.status === 401 || meRes.status === 403) {
      console.log('[OFFSCREEN][ME] Auth error detected, signaling cache invalidation');
      chrome.runtime.sendMessage({ 
        type: 'PIMMS_AUTH_ERROR', 
        requestId: 'workspace-fetch', 
        status: meRes.status,
        source: 'me' 
      });
    }
    
    if (meRes.ok) {
      const me = await meRes.json().catch(() => null as any);
      const slug = (me?.defaultWorkspace as string | null) || null;
      if (slug) {
        cachedWorkspaceSlug = slug;
        lastWorkspaceFetchTs = now;
        return slug;
      }
    }
  } catch {}
  try {
    const wsRes = await fetch(`${APP_DOMAIN}/api/workspaces`, { credentials: 'include' });
    if (wsRes.ok) {
      const list = await wsRes.json().catch(() => [] as any[]);
      const slug = (Array.isArray(list) && list.length > 0 && list[0]?.slug) ? list[0].slug as string : null;
      if (slug) {
        cachedWorkspaceSlug = slug;
        lastWorkspaceFetchTs = now;
        return slug;
      }
    }
  } catch {}
  return null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;
  // Only process requests forwarded by the background to avoid double-processing
  if (message.type === 'PIMMS_SHORTEN_REQUEST' && (message.forwarded === true || message._from === 'background')) {
    const { href, requestId, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = message as any;
    console.log('[OFFSCREEN] Received PIMMS_SHORTEN_REQUEST', { href, requestId });
    (async () => {
      try {
        console.log('[OFFSCREEN] Fetching PIMMS API...', API_URL);
        const slug = await getDefaultWorkspaceSlug();
        const url = slug ? `${API_URL}?projectSlug=${encodeURIComponent(slug)}` : API_URL;
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: href,
            utm_source: utm_source ?? null,
            utm_medium: utm_medium ?? null,
            utm_campaign: utm_campaign ?? null,
            utm_term: utm_term ?? null,
            utm_content: utm_content ?? null,
          })
        });
        console.log('[OFFSCREEN] Fetch done', res.status);
        
        // Detect auth errors and signal cache invalidation
        if (res.status === 401 || res.status === 403) {
          console.log('[OFFSCREEN][SHORTEN] Auth error detected, signaling cache invalidation');
          chrome.runtime.sendMessage({ 
            type: 'PIMMS_AUTH_ERROR', 
            requestId, 
            status: res.status,
            source: 'shorten' 
          });
        }
        
        const data = await res.json().catch(() => ({}));
        const shortened = data?.shortLink || data?.short_url || data?.shortUrl || data?.link || data?.url;
        console.log('[OFFSCREEN] Parsed response', { shortened, data });
        chrome.runtime.sendMessage({
          type: 'PIMMS_SHORTEN_RESULT',
          requestId,
          ok: res.ok,
          status: res.status,
          data: res.ok ? { shortened, raw: data } : { error: data }
        });
        console.log('[OFFSCREEN] Dispatched PIMMS_SHORTEN_RESULT');
      } catch (error) {
        console.error('[OFFSCREEN] Error during fetch', error);
        chrome.runtime.sendMessage({
          type: 'PIMMS_SHORTEN_RESULT',
          requestId,
          ok: false,
          status: 0,
          data: { error: String(error) }
        });
      }
    })();
    return false; // async
  }
  if (message.type === 'PIMMS_ANALYTICS_REQUEST' && (message.forwarded === true || message._from === 'background')) {
    const { requestId, utm_source, utm_medium, utm_campaign } = message as any;
    (async () => {
      try {
        const qs = new URLSearchParams();
        // if (utm_source) qs.set('utm_source', utm_source);
        // if (utm_medium) qs.set('utm_medium', utm_medium);
        if (utm_campaign) qs.set('utm_campaign', utm_campaign);
        const slug = await getDefaultWorkspaceSlug();
        if (slug) qs.set('projectSlug', slug);
        const url = `${APP_DOMAIN}/api/analytics?${qs.toString()}`;
        const res = await fetch(url, { credentials: 'include' });
        console.log('[OFFSCREEN][ANALYTICS] Fetch done', res.status);
        
        // Detect auth errors and signal cache invalidation
        if (res.status === 401 || res.status === 403) {
          console.log('[OFFSCREEN][ANALYTICS] Auth error detected, signaling cache invalidation');
          chrome.runtime.sendMessage({ 
            type: 'PIMMS_AUTH_ERROR', 
            requestId, 
            status: res.status,
            source: 'analytics' 
          });
        }
        
        const data = await res.json().catch(() => ({} as any));
        let totals = (data?.totals || data?.summary || {}) as any;
        if (!totals || (typeof totals === 'object' && Object.keys(totals).length === 0)) {
          // Support flat responses: clicks, leads, sales, saleAmount at top-level
          totals = {
            clicks: Number(data?.clicks ?? 0),
            leads: Number(data?.leads ?? 0),
            sales: Number(data?.sales ?? 0),
            saleAmount: Number(data?.saleAmount ?? 0),
          };
        }
        const timeseries = (data?.timeseries || data?.series || data?.timeSeries || []) as any[];
        console.log('[OFFSCREEN][ANALYTICS] Parsed response', { totals, timeseriesLen: Array.isArray(timeseries) ? timeseries.length : 'n/a' });
        chrome.runtime.sendMessage({ type: 'PIMMS_ANALYTICS_RESULT', requestId, ok: res.ok, totals, timeseries });
      } catch (e) {
        chrome.runtime.sendMessage({ type: 'PIMMS_ANALYTICS_RESULT', requestId, ok: false, error: String(e) });
      }
    })();
    return false;
  }
  if (message.type === 'CHECK_AUTH' && (message.forwarded === true || message._from === 'background')) {
    const { requestId } = message as any;
    (async () => {
      try {
        const res = await fetch(`${APP_DOMAIN}/api/me`, { credentials: 'include', cache: 'no-store' });
        
        // Detect auth errors and signal cache invalidation for CHECK_AUTH too
        if (res.status === 401 || res.status === 403) {
          console.log('[OFFSCREEN][CHECK_AUTH] Auth error detected, signaling cache invalidation');
          chrome.runtime.sendMessage({ 
            type: 'PIMMS_AUTH_ERROR', 
            requestId, 
            status: res.status,
            source: 'check_auth' 
          });
        }
        
        let user: any = null;
        if (res.ok) {
          user = await res.json().catch(() => null);
        }
        chrome.runtime.sendMessage({ type: 'CHECK_AUTH_RESULT', requestId, ok: res.ok, user });
      } catch (e) {
        chrome.runtime.sendMessage({ type: 'CHECK_AUTH_RESULT', requestId, ok: false, error: String(e) });
      }
    })();
    return false;
  }
  if (message.type === 'PIMMS_WORKSPACE_REQUEST' && (message.forwarded === true || message._from === 'background')) {
    const { requestId, workspaceSlug } = message as any;
    (async () => {
      try {
        const res = await fetch(`${APP_DOMAIN}/api/workspaces/${encodeURIComponent(workspaceSlug)}`, { 
          credentials: 'include', 
          cache: 'no-store' 
        });
        
        // Detect auth errors and signal cache invalidation
        if (res.status === 401 || res.status === 403) {
          console.log('[OFFSCREEN][WORKSPACE] Auth error detected, signaling cache invalidation');
          chrome.runtime.sendMessage({ 
            type: 'PIMMS_AUTH_ERROR', 
            requestId, 
            status: res.status,
            source: 'workspace' 
          });
        }
        
        let workspace: any = null;
        if (res.ok) {
          workspace = await res.json().catch(() => null);
        }
        chrome.runtime.sendMessage({ type: 'PIMMS_WORKSPACE_RESULT', requestId, ok: res.ok, workspace });
      } catch (e) {
        chrome.runtime.sendMessage({ type: 'PIMMS_WORKSPACE_RESULT', requestId, ok: false, error: String(e) });
      }
    })();
    return false;
  }
  return false;
});


