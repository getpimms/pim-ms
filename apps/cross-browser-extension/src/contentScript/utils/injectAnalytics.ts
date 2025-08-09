import { APP_DOMAIN } from "@dub/utils";
import { EmailMarketingDomainConfig, EMAIL_MARKETING_DOMAINS } from "../../types";
import { logger } from "../../utils/logger";

async function waitForXPath(xpath: string, timeoutMs: number = 3000, intervalMs: number = 100): Promise<HTMLElement | null> {
  const start = Date.now();
  try {
    const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const el = res.singleNodeValue as HTMLElement | null;
    if (el) return el;
  } catch {}
  return new Promise((resolve) => {
    const id = window.setInterval(() => {
      if (Date.now() - start >= timeoutMs) {
        clearInterval(id);
        resolve(null);
        return;
      }
      try {
        const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const el = res.singleNodeValue as HTMLElement | null;
        if (el) {
          clearInterval(id);
          resolve(el);
        }
      } catch {}
    }, intervalMs);
  });
}

function prepareAnalyticsRequest(hostname: string, defaultSource?: string, defaultMedium?: string) {
  const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const hostLower = hostname.toLowerCase();
  const domainCfg = EMAIL_MARKETING_DOMAINS.find(d => hostLower === d.domain || hostLower.endsWith(`.${d.domain}`));
  
  let utm_campaign: string | null = null;
  if (domainCfg?.broadcastIdRegex) {
    try {
      const match = new RegExp(domainCfg.broadcastIdRegex, 'i').exec(window.location.href);
      if (match?.[1]) utm_campaign = match[1];
    } catch {}
  }
  
  return {
    requestId,
    utm_source: domainCfg?.defaultUtmSource ?? defaultSource ?? null,
    utm_medium: domainCfg?.defaultUtmMedium ?? defaultMedium ?? null,
    utm_campaign
  };
}

type Metrics = {
  clicks: number;
  leads: number;
  sales: number; // in cents as totalAmount? We'll pass dollars already computed
  revenue: number; // dollars
  revenuePerClick: number;
  clickToLeadRate: number; // percentage 0-100
  leadToSaleRate: number; // percentage 0-100
  avgOrderValue: number; // dollars
  recentVisitors: number;
};

const formatMoney = (n: number): string => `$${Math.round(n)}`;

function createUserHeaderHTML(user: any, workspace: any): string {
  if (!user) return '';
  
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part: string) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const displayName = workspace?.name || user.name || 'User';
  const secondaryText = workspace?.name ? user.name : (user.email || '');
  const dashboardUrl = workspace?.slug 
    ? `${APP_DOMAIN}/${workspace.slug}` 
    : `${APP_DOMAIN}/dashboard`;

  return `
    <div style="border-top:1px solid #e5e7eb;padding-top:8px;margin-bottom:8px;">
      <div onclick="window.open('${dashboardUrl}', '_blank', 'noopener,noreferrer')" 
           style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px;border-radius:8px;transition:background-color 120ms;text-decoration:none;" 
           onmouseover="this.style.backgroundColor='#f3f4f6'" 
           onmouseout="this.style.backgroundColor='transparent'"
           title="Open Dashboard">
        <div style="position:relative;flex-shrink:0;">
          ${user.image 
            ? `<img src="${user.image}" alt="${user.name}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;border:1px solid #e5e7eb;" />`
            : `<div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:500;">${getInitials(user.name || 'U')}</div>`
          }
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:500;color:#111827;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${displayName}
          </div>
          ${secondaryText ? `<div style="font-size:10px;color:#6b7280;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${secondaryText}</div>` : ''}
        </div>
        <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#9ca3af;flex-shrink:0;" aria-hidden="true">
          <path d="M7 13l6-6"/>
          <path d="M9 7h4v4"/>
          <path d="M5 5h6a4 4 0 0 1 4 4v6" opacity=".3"/>
        </svg>
      </div>
    </div>
  `;
}

function createPreviewBlock(metrics?: Partial<Metrics>, userData?: { user: any, workspace: any } | null): HTMLElement {
  const block = document.createElement("div");
  block.id = "pimms-analytics-block";
  block.style.cssText =
    "position:relative;margin:12px 0;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.04);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#111827;";
  const clicks = metrics?.clicks ?? 11;
  const leads = metrics?.leads ?? 2;
  const revenue = metrics?.revenue ?? 71;
  const sales = metrics?.sales ?? revenue; // dollars shown
  const recentVisitors = metrics?.recentVisitors ?? 0;
  const rpc = metrics?.revenuePerClick ?? 6.4;
  const c2l = metrics?.clickToLeadRate ?? 18;
  const l2s = metrics?.leadToSaleRate ?? 50;
  const aov = metrics?.avgOrderValue ?? 71;
  block.innerHTML = `
    <style>
      #pimms-analytics-block .pimms-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:8px; }
      #pimms-analytics-block .card { padding:10px; border-radius:10px; }
      #pimms-analytics-block .card-title { display:flex; align-items:center; gap:6px; font-size:12px; }
      #pimms-analytics-block .dot { display:inline-block; width:6px; height:6px; border-radius:9999px; }
      #pimms-analytics-block .card-value { margin-top:4px; font-weight:700; font-size:16px; }
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div style="font-weight:600;font-size:14px;">PIMMS Analytics (Beta)</div>
      <div style="display:flex;align-items:center;gap:8px;opacity:0.9;">
        <svg viewBox="0 0 1000 199" xmlns="http://www.w3.org/2000/svg" aria-label="PIMMS" focusable="false" style="height:12px;display:block;">
          <path d="M885.631 54.9919C885.631 59.966 888.466 63.9269 894.136 66.8746C899.805 69.638 906.843 71.5724 915.25 72.6777C923.657 73.7831 932.845 75.5332 942.816 77.9282C952.786 80.3232 961.975 83.2708 970.382 86.7711C978.788 90.2714 985.826 96.0746 991.496 104.181C997.165 112.287 1000 122.327 1000 134.302C1000 154.014 992.082 169.673 976.247 181.28C960.411 192.702 939.883 198.413 914.664 198.413C888.857 198.413 867.743 192.702 851.321 181.28C834.899 169.858 825.221 153.001 822.289 130.709H885.338C886.316 138.631 889.444 144.803 894.722 149.224C900.001 153.461 906.843 155.58 915.25 155.58C930.89 155.58 938.71 150.79 938.71 141.21C938.71 136.973 936.56 133.473 932.259 130.709C928.153 127.762 922.679 125.459 915.837 123.801C909.19 122.143 901.76 120.577 893.549 119.103C885.534 117.629 877.42 115.603 869.209 113.024C861.194 110.444 853.765 107.22 846.922 103.352C840.275 99.4828 834.801 93.956 830.5 86.7711C826.394 79.5862 824.342 71.0197 824.342 61.0714C824.342 43.2013 831.673 28.5553 846.336 17.1332C860.998 5.71105 881.135 0 906.746 0C930.01 0 949.756 5.43472 965.983 16.3041C982.209 27.1736 991.594 43.3856 994.135 64.9402H930.206C927.469 50.202 918.769 42.8329 904.106 42.8329C898.632 42.8329 894.136 43.9382 890.617 46.149C887.293 48.3597 885.631 51.3073 885.631 54.9919Z" fill="#111827" />
          <path d="M554.693 193.864V5.95238H632.112L664.37 99.9083L674.341 135.004L684.311 99.9083L716.569 5.95238H792.228V193.864H732.405L736.217 69.2345L720.674 120.358L695.161 193.864H651.76L625.661 119.252L610.705 69.7871L614.517 193.864H554.693Z" fill="#111827" />
          <path d="M289.083 193.864V5.95238H366.502L398.759 99.9083L408.73 135.004L418.701 99.9083L450.958 5.95238H526.618V193.864H466.794L470.606 69.2345L455.064 120.358L429.551 193.864H386.15L360.05 119.252L345.094 69.7871L348.906 193.864H289.083Z" fill="#111827" />
          <path d="M205.152 193.864V5.95238H264.975V193.864H205.152Z" fill="#111827" />
          <path d="M7.93649 193.162V5.25048H91.8068C117.809 5.25048 138.141 11.0536 152.803 22.66C167.662 34.0821 175.091 50.1098 175.091 70.7433C175.091 91.3768 167.662 107.497 152.803 119.103C138.141 130.525 118.004 136.236 92.3934 136.236H67.7601V193.162H7.93649ZM90.6338 49.465H67.7601V92.0216H89.1676C105.59 92.0216 113.801 84.9288 113.801 70.7433C113.801 56.5578 106.078 49.465 90.6338 49.465Z" fill="#111827" />
        </svg>
      </div>
    </div>
    ${userData ? createUserHeaderHTML(userData.user, userData.workspace) : ''}
    <!-- Footer action -->
    <div class="pimms-cards">
      <!-- Clicks card (blue) -->
      <div class="card" style="border:1px solid #C2D4FF;background:linear-gradient(135deg,#EBF1FF,#EFF1FF);">
        <div class="card-title" style="color:#00237A;">
          <span class="dot" style="background:#3870FF"></span>
          <span>Clicks</span>
        </div>
        <div class="card-value" style="color:#00237A;">${clicks}</div>
      </div>
      <!-- Leads card (orange) -->
      <div class="card" style="border:1px solid #FFB85C;background:linear-gradient(135deg,#FFF6EB,#FFF3EB);">
        <div class="card-title" style="color:#522E00;">
          <span class="dot" style="background:#FFD399"></span>
          <span>Leads</span>
        </div>
        <div class="card-value" style="color:#522E00;">${leads}</div>
      </div>
      <!-- Sales/Revenue card (teal) -->
      <div class="card" style="border:1px solid #47FFD1;background:linear-gradient(135deg,#EBFFFA,#EBFFFA);">
        <div class="card-title" style="color:#002e25;">
          <span class="dot" style="background:#00F5B8"></span>
          <span>Sales</span>
        </div>
        <div class="card-value" style="color:#002e25;">${formatMoney(sales)}</div>
      </div>
      <!-- Recent visits (neutral) -->
      <div class="card" style="border:1px solid #E5E7EB;background:linear-gradient(135deg,#F8FAFC,#F3F4F6);">
        <div class="card-title" style="color:#4b5563;">
          <span class="dot" style="background:#9ca3af"></span>
          <span>Recent visits</span>
        </div>
        <div class="card-value" style="color:#111827;">${recentVisitors}</div>
      </div>
      <!-- Revenue per click (neutral) -->
      <div class="card" style="border:1px solid #E5E7EB;background:linear-gradient(135deg,#F8FAFC,#F3F4F6);">
        <div class="card-title" style="color:#4b5563;">Revenue/click</div>
        <div class="card-value" style="color:#111827;">$${(rpc).toFixed(1)}</div>
      </div>
      <!-- Click to Lead (neutral) -->
      <div class="card" style="border:1px solid #E5E7EB;background:linear-gradient(135deg,#F8FAFC,#F3F4F6);">
        <div class="card-title" style="color:#4b5563;">Click → Lead</div>
        <div class="card-value" style="color:#111827;">${Math.round(c2l)}%</div>
      </div>
      <!-- Lead to Sale (neutral) -->
      <div class="card" style="border:1px solid #E5E7EB;background:linear-gradient(135deg,#F8FAFC,#F3F4F6);">
        <div class="card-title" style="color:#4b5563;">Lead → Sale</div>
        <div class="card-value" style="color:#111827;">${Math.round(l2s)}%</div>
      </div>
      <!-- Avg order (neutral) -->
      <div class="card" style="border:1px solid #E5E7EB;background:linear-gradient(135deg,#F8FAFC,#F3F4F6);">
        <div class="card-title" style="color:#4b5563;">Avg order</div>
        <div class="card-value" style="color:#111827;">${formatMoney(aov)}</div>
      </div>
    </div>
    <a id="pimms-view-report" href="#" target="_blank" rel="noopener noreferrer" style="position:absolute;right:10px;bottom:10px;display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid #e5e7eb;border-radius:9999px;background:#ffffff;color:#111827;font-size:12px;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:background 120ms,border-color 120ms;">
      <span>View full report</span>
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 13l6-6"/>
        <path d="M9 7h4v4"/>
        <path d="M5 5h6a4 4 0 0 1 4 4v6" opacity=".2"/>
      </svg>
    </a>
    `;
  // We'll set the href dynamically when injecting, using detected utm_campaign
  return block;
}

function createSkeletonBlock(userData?: { user: any, workspace: any } | null): HTMLElement {
  const el = document.createElement("div");
  el.id = "pimms-analytics-block";
  el.style.cssText =
    "position:relative;margin:12px 0;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.04);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#111827;";
  el.innerHTML = `
    <style>
      #pimms-analytics-block .shimmer { position:relative; overflow:hidden; background:#f3f4f6; }
      #pimms-analytics-block .shimmer::after { content:''; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: pimms-shimmer 1.1s infinite; }
      @keyframes pimms-shimmer { 100% { transform: translateX(100%); } }
      #pimms-analytics-block .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:8px; }
      #pimms-analytics-block .card { padding:10px; border:1px solid #e5e7eb; border-radius:10px; background:#f9fafb; }
      #pimms-analytics-block .label { height:12px; border-radius:6px; width:60%; }
      #pimms-analytics-block .value { height:20px; border-radius:8px; width:40%; margin-top:8px; }
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div class="shimmer" style="width:200px;height:16px;border-radius:8px;"></div>
      <div class="shimmer" style="width:90px;height:22px;border-radius:9999px;"></div>
    </div>
    ${userData ? createUserHeaderHTML(userData.user, userData.workspace) : ''}
    <div class="grid">
      ${Array.from({length:8}).map(()=>`
        <div class=\"card\">
          <div class=\"shimmer label\"></div>
          <div class=\"shimmer value\"></div>
        </div>
      `).join('')}
    </div>
    <div class="shimmer" style="position:absolute;right:10px;bottom:10px;width:120px;height:24px;border-radius:9999px;"></div>
  `;
  return el;
}

/**
 * Try to inject the analytics preview block for the current page based on the
 * provided EmailMarketingDomainConfig. This is fully domain-agnostic and relies
 * on the configuration (URL pattern, ready selector, XPath container, etc.).
 */
async function getUserData(): Promise<{ user: any, workspace: any } | null> {
  try {
    const requestId = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const userPromise = new Promise<any>((resolve) => {
      const timeout = setTimeout(() => {
        try { chrome.runtime.onMessage.removeListener(onUserMsg as any); } catch {}
        resolve(null);
      }, 3000);

      const onUserMsg = (msg: any) => {
        if (msg?.type === 'CHECK_AUTH_RESULT' && msg.requestId === requestId) {
          clearTimeout(timeout);
          try { chrome.runtime.onMessage.removeListener(onUserMsg as any); } catch {}
          resolve(msg.ok && msg.user ? msg.user : null);
        }
      };
      
      try {
        chrome.runtime.onMessage.addListener(onUserMsg as any);
        chrome.runtime.sendMessage({ type: 'CHECK_AUTH', requestId });
      } catch {
        clearTimeout(timeout);
        resolve(null);
      }
    });

    const user = await userPromise;
    if (!user?.defaultWorkspace) return { user, workspace: null };

    // Fetch workspace data if available
    const workspaceRequestId = `workspace_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const workspacePromise = new Promise<any>((resolve) => {
      const timeout = setTimeout(() => {
        try { chrome.runtime.onMessage.removeListener(onWorkspaceMsg as any); } catch {}
        resolve(null);
      }, 3000);

      const onWorkspaceMsg = (msg: any) => {
        if (msg?.type === 'PIMMS_WORKSPACE_RESULT' && msg.requestId === workspaceRequestId) {
          clearTimeout(timeout);
          try { chrome.runtime.onMessage.removeListener(onWorkspaceMsg as any); } catch {}
          resolve(msg.ok && msg.workspace ? msg.workspace : null);
        }
      };
      
      try {
        chrome.runtime.onMessage.addListener(onWorkspaceMsg as any);
        chrome.runtime.sendMessage({ 
          type: 'PIMMS_WORKSPACE_REQUEST', 
          requestId: workspaceRequestId,
          workspaceSlug: user.defaultWorkspace
        });
      } catch {
        clearTimeout(timeout);
        resolve(null);
      }
    });

    const workspace = await workspacePromise;
    return { user, workspace };
  } catch {
    return null;
  }
}

export async function tryInjectAnalyticsPreview(
  hostname: string,
  config?: EmailMarketingDomainConfig,
): Promise<void> {
  // Hard gate: only when logged in. PanelApp owns CHECK_AUTH polling and sets a global flag.
  try {
    if (!(window as any).__pimmsIsLoggedIn) return;
  } catch {}
  // Avoid duplicates globally
  if (document.getElementById("pimms-analytics-block")) return;

  // If an analytics URL pattern is provided, enforce it (supporting optional trailing segments)
  if (config?.analyticsPageUrlPattern) {
    try {
      const re = new RegExp(config.analyticsPageUrlPattern);
      if (!re.test(window.location.href)) {
        logger.debug('[PIMMS][Analytics] URL did not match analyticsPageUrlPattern, skip');
        return;
      }
    } catch {
      // ignore invalid regex
    }
  }

  // Start fetching user data in the background; do NOT block initial injection
  let cachedUserData: { user: any, workspace: any } | null = null;
  const userDataPromise = getUserData()
    .then((d) => {
      cachedUserData = d;
      return d;
    })
    .catch(() => null);

  // Primary: XPath-defined anchor ONLY. Insert AFTER the matched node.
  if (config?.analyticsPageXPath) {
    try {
      let targetEl: HTMLElement | null = null;
      try {
        const res = document.evaluate(
          config.analyticsPageXPath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        );
        targetEl = res.singleNodeValue as HTMLElement | null;
      } catch {}
      if (!targetEl) {
        logger.debug('[PIMMS][Analytics] XPath not found immediately; waiting', { xpath: config.analyticsPageXPath });
        targetEl = await waitForXPath(config.analyticsPageXPath, 2500, 100);
      }
      if (targetEl && targetEl.parentElement) {
        const skeleton = createSkeletonBlock(null);
        const parentForInsert = targetEl.parentElement as HTMLElement;
        if (parentForInsert.querySelector('#pimms-analytics-block')) return;
        else parentForInsert.insertBefore(skeleton, targetEl);
        
        logger.debug('[PIMMS][Analytics] Inserted skeleton via XPath anchor (after matched node)');

        const { requestId, utm_source, utm_medium, utm_campaign } = prepareAnalyticsRequest(hostname);
        // Optionally update the skeleton's report link early
        try {
          const link = skeleton.querySelector('#pimms-view-report') as HTMLAnchorElement | null;
          if (link) {
            const reportUrl = `${APP_DOMAIN}/analytics?interval=all${utm_campaign ? `&utm_campaign=${encodeURIComponent(utm_campaign)}` : ''}`;
            link.href = reportUrl;
          }
        } catch {}

        const onResult = async (message: any) => {
          if (!message || message.type !== 'PIMMS_ANALYTICS_RESULT' || message.requestId !== requestId) return;
          chrome.runtime.onMessage.removeListener(onResult as any);
          try {
            // Ensure user data is available (non-blocking; short timeout via race)
            try { await Promise.race([userDataPromise, new Promise((r)=>setTimeout(r, 200))]); } catch {}
            const totals = message.totals || {};
            const timeseries: Array<{ start: string | Date; clicks: number; leads: number; sales: number; saleAmount: number; }> = Array.isArray(message.timeseries) ? message.timeseries : [];
            const clicks = Number(totals.clicks || 0);
            const leads = Number(totals.leads || 0);
            const salesCount = Number(totals.sales || 0);
            const revenue = Number((totals.saleAmount || 0)) / 100;
            const revenuePerClick = clicks > 0 ? revenue / clicks : 0;
            const clickToLeadRate = clicks > 0 ? (leads / clicks) * 100 : 0;
            const leadToSaleRate = leads > 0 ? (salesCount / leads) * 100 : 0;
            const avgOrderValue = salesCount > 0 ? revenue / salesCount : 0;
            let recentVisitors = 0;
            if (timeseries && timeseries.length > 1) {
              const last = timeseries[timeseries.length - 1];
              const prev = timeseries[timeseries.length - 2];
              const tlast = new Date(last.start as any).getTime();
              const tprev = new Date(prev.start as any).getTime();
              if (tlast - tprev <= 2 * 60 * 60 * 1000) {
                const oneHourAgo = Date.now() - 60 * 60 * 1000;
                recentVisitors = timeseries
                  .filter((p: any) => new Date(p.start).getTime() >= oneHourAgo)
                  .reduce((acc: number, p: any) => acc + (p.clicks || 0), 0);
              }
            }
            logger.debug('[PIMMS][Analytics] Result received (xpath)', { totals, clicks, leads, salesCount, revenue, recentVisitors });
            const block = createPreviewBlock({ clicks, leads, sales: revenue, revenue, revenuePerClick, clickToLeadRate, leadToSaleRate, avgOrderValue, recentVisitors }, cachedUserData);
            try {
              const btn = block.querySelector('#pimms-view-report') as HTMLAnchorElement | null;
              if (btn) {
                const reportUrl = `${APP_DOMAIN}/analytics?interval=all${utm_campaign ? `&utm_campaign=${encodeURIComponent(utm_campaign)}` : ''}`;
                btn.href = reportUrl;
              }
            } catch {}
            if (skeleton.isConnected) skeleton.replaceWith(block);
          } catch {
            logger.warn('[PIMMS][Analytics] Failed to render analytics (xpath), falling back to defaults');
            if (skeleton.isConnected) skeleton.replaceWith(createPreviewBlock(undefined, cachedUserData));
          }
        };
        chrome.runtime.onMessage.addListener(onResult as any);
        chrome.runtime.sendMessage({ type: 'ENSURE_OFFSCREEN' }, () => {
          chrome.runtime.sendMessage({ type: 'PIMMS_ANALYTICS_REQUEST', requestId, utm_source, utm_medium, utm_campaign, _from: 'content' });
        });
      } else {
        logger.debug('[PIMMS][Analytics] XPath not found; skipping injection');
      }
    } catch {
      // ignore
    }
  }
}

export default tryInjectAnalyticsPreview;
