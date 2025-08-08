// Offscreen document script: performs cross-origin fetches and returns results

const API_URL = 'https://api.pimms.io/links';
const API_KEY = 'pimms_mgLHUgFHTxDzC0ZuDQkSsnzL';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;
  // Only process requests forwarded by the background to avoid double-processing
  if (message.type === 'PIMMS_SHORTEN_REQUEST' && (message.forwarded === true || message._from === 'background')) {
    const { href, requestId, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = message as any;
    console.log('[OFFSCREEN] Received PIMMS_SHORTEN_REQUEST', { href, requestId });
    (async () => {
      try {
        console.log('[OFFSCREEN] Fetching PIMMS API...', API_URL);
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
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
        const url = `https://api.pimms.io/analytics?${qs.toString()}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
        console.log('[OFFSCREEN][ANALYTICS] Fetch done', res.status);
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
  return false;
});


