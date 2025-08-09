import { useState, useEffect } from "react";
import useCookieAuth from "./useCookieAuth";

export interface AuthHook {
  isLoggedIn: boolean | null;
}

export default function useAuth(): AuthHook {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const auth = useCookieAuth();
  
  useEffect(() => {
    if (auth === "unknown") return;
    const loggedIn = auth === "in";
    setIsLoggedIn(loggedIn);
  }, [auth]);

  return {
    isLoggedIn,
  };
}
