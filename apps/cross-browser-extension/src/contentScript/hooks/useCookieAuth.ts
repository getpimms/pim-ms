import { useState, useEffect, useRef, useCallback } from "react";

export type AuthStatus = "unknown" | "in" | "out";

export default function useCookieAuth(): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>("unknown");
  const intervalRef = useRef<number | null>(null);
  const validatingRef = useRef<boolean>(false);

  const validateAuth = async (): Promise<boolean> => {
    if (validatingRef.current) return false;
    validatingRef.current = true;

    try {
      const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          try { chrome.runtime.onMessage.removeListener(onMsg as any); } catch {}
          validatingRef.current = false;
          resolve(false);
        }, 3000); // 3 second timeout

        const onMsg = (msg: any) => {
          if (msg?.type === 'CHECK_AUTH_RESULT' && msg.requestId === requestId) {
            clearTimeout(timeout);
            try { chrome.runtime.onMessage.removeListener(onMsg as any); } catch {}
            validatingRef.current = false;
            resolve(!!msg.ok);
          }
        };
        
        try {
          chrome.runtime.onMessage.addListener(onMsg as any);
          chrome.runtime.sendMessage({ type: 'CHECK_AUTH', requestId });
        } catch {
          clearTimeout(timeout);
          validatingRef.current = false;
          resolve(false);
        }
      });
    } catch {
      validatingRef.current = false;
      return false;
    }
  };

  const checkAuth = async () => {
    // Cache miss - validate via API
    const isLoggedIn = await validateAuth();
    const newStatus: AuthStatus = isLoggedIn ? "in" : "out";
    
    // Update cache and state
    setStatus(newStatus);
  };

  useEffect(() => {
    // Initial check
    checkAuth();
    
    // Periodic validation every 30 seconds (much less than before)
    intervalRef.current = window.setInterval(checkAuth, 3000);
    
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Expose method to invalidate cache when auth errors occur
  useEffect(() => {
    (window as any).__pimmsInvalidateAuthCache = () => {
      try {
        setStatus("out");
        console.log('[PIMMS] Auth cache invalidated due to API error - forcing immediate recheck');
        // Force immediate recheck after cache invalidation
        setTimeout(checkAuth, 100);
      } catch {}
    };
  }, [checkAuth]);

  // Update global auth flag and notify detector
  useEffect(() => {
    try {
      (window as any).__pimmsIsLoggedIn = status === "in";
      
      // Notify detector to wake up/sleep when auth changes
      if (status !== "unknown") {
        console.log('[PIMMS] Auth status changed, notifying detector:', status);
        window.dispatchEvent(new CustomEvent('pimms-detector-refresh', { 
          detail: { isLoggedIn: status === "in" }
        }));
      }
    } catch {}
  }, [status]);

  return status;
}
