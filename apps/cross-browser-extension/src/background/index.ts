import { APP_DOMAIN } from "@dub/utils";
import { logger } from "../utils/logger";
import { EMAIL_MARKETING_DOMAINS } from "../contentScript/../types";

const reqToTab = new Map<string, number>(); // requestId -> tabId
let creatingOffscreen: Promise<void> | null = null;

const ensureOffscreenDocument = async (): Promise<void> => {
  if (!chrome.offscreen?.createDocument) return;
  if (creatingOffscreen) { await creatingOffscreen; return; }
  
  try {
    if ((chrome.offscreen as any)?.hasDocument) {
      const has = await (chrome.offscreen as any).hasDocument();
      if (has) return;
    }
    
    creatingOffscreen = chrome.offscreen.createDocument({
      url: chrome.runtime.getURL("offscreen.html"),
      reasons: [(chrome.offscreen as any).Reason?.IFRAME_SCRIPTING || "IFRAME_SCRIPTING"],
      justification: "PIMMS cross-origin fetch",
    } as any).finally(() => { creatingOffscreen = null; });
    
    await creatingOffscreen;
  } catch (e) {
    logger.warn("offscreen ensure failed", e);
  }
};

const forwardToOffscreen = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (resp: any) => void) => {
  (async () => {
    await ensureOffscreenDocument();
    const tabId = sender.tab?.id;
    if (tabId && message.requestId) reqToTab.set(message.requestId, tabId);
    chrome.runtime.sendMessage({ ...message, forwarded: true, _from: "background" });
    sendResponse({ ok: true });
  })();
  return true;
};

logger.info("🚀 PIMMS Background script loaded");
ensureOffscreenDocument();

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: APP_DOMAIN });
});

chrome.runtime.onInstalled.addListener((details) => {
  ensureOffscreenDocument();
  if (details.reason === "install") {
    chrome.tabs.create({ url: `${APP_DOMAIN}/register` });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.type) {
      case "PIMMS_SHOULD_INJECT": {
        try {
          const href: string = message.href || sender.tab?.url || "";
          const host = (() => {
            try { return new URL(href).hostname.toLowerCase(); } catch { return ""; }
          })();
          const cfg = EMAIL_MARKETING_DOMAINS.find(d => host === d.domain || host.endsWith(`.${d.domain}`));
          if (!cfg) { sendResponse({ ok: false, reason: "host_not_supported" }); return false; }

          const patterns: string[] = [];
          if (cfg.detectionPageUrlPattern) patterns.push(cfg.detectionPageUrlPattern);
          if (cfg.analyticsPageUrlPattern) patterns.push(cfg.analyticsPageUrlPattern);
          if (Array.isArray(cfg.onboardingPageUrlPatterns)) patterns.push(...cfg.onboardingPageUrlPatterns);
          const allowed = patterns.some(p => {
            try { return new RegExp(p).test(href); } catch { return false; }
          });
          sendResponse({ ok: allowed, reason: allowed ? "matched" : "no_pattern_match" });
          return true;
        } catch {
          sendResponse({ ok: false, reason: "error" });
          return true;
        }
      }
      case "PIMMS_INJECT_CONTENT_BUNDLE":
        try {
          chrome.scripting.executeScript({
            target: { tabId: sender.tab?.id!, allFrames: false },
            files: ["static/js/contentScript.bundle.js"],
          });
        } catch {}
        return false;
      case "ENSURE_OFFSCREEN":
        (async () => { await ensureOffscreenDocument(); sendResponse({ ok: true }); })();
        return true;
      case "PIMMS_SHORTEN_REQUEST":
      case "PIMMS_ANALYTICS_REQUEST":
      case "CHECK_AUTH":
      case "PIMMS_WORKSPACE_REQUEST":
        return forwardToOffscreen(message, sender, sendResponse);
      case "PIMMS_SHORTEN_RESULT":
      case "PIMMS_ANALYTICS_RESULT":
      case "CHECK_AUTH_RESULT":
      case "PIMMS_WORKSPACE_RESULT": {
        const requestId = message.requestId as string | undefined;
        if (requestId && reqToTab.has(requestId)) {
          const tabId = reqToTab.get(requestId)!;
          chrome.tabs.sendMessage(tabId, message, () => void chrome.runtime.lastError);
          reqToTab.delete(requestId);
        }
        return false;
      }
      case "OPEN_WEB_APP":
        chrome.tabs.create({ url: message.url || APP_DOMAIN });
        return false;
      default:
        return false;
    }
  } catch {
    return false;
  }
});
