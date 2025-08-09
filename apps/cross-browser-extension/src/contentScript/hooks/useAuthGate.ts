import { useEffect, useRef, useState } from "react";

export type AuthStatus = "unknown" | "in" | "out";

export default function useAuthGate(pollMs: number = 2000): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>("unknown");
  const timerRef = useRef<number | null>(null);

  const tick = () => {
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const onMsg = (msg: any) => {
      if (msg?.type !== "CHECK_AUTH_RESULT" || msg.requestId !== requestId) return;
      
      try { chrome.runtime.onMessage.removeListener(onMsg as any); } catch {}
      
      const next: AuthStatus = msg.ok ? "in" : "out";
      (window as any).__pimmsIsLoggedIn = next === "in";
      
      // Simply update status - no reload needed
      if (status !== next) {
        setStatus(next);
      }
    };
    
    try {
      chrome.runtime.onMessage.addListener(onMsg as any);
      chrome.runtime.sendMessage({ type: "CHECK_AUTH", requestId });
    } catch {}
  };

  useEffect(() => {
    tick();
    timerRef.current = window.setInterval(tick, pollMs);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis, { passive: true } as any);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVis as any);
    };
  }, [pollMs]);

  return status;
}


