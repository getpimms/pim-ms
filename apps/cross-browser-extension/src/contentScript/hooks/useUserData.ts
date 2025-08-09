import { useState, useEffect, useRef } from "react";

export interface UserData {
  id: string;
  email: string;
  image?: string;
  defaultWorkspace?: string;
}

export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

export interface UserDataHook {
  user: UserData | null;
  workspace: WorkspaceData | null;
  isLoading: boolean;
  error: string | null;
}

export default function useUserData(): UserDataHook {
  const [user, setUser] = useState<UserData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchingRef = useRef<boolean>(false);
  const cacheRef = useRef<{ user: UserData | null; workspace: WorkspaceData | null; timestamp: number } | null>(null);
  
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchUserData = async (): Promise<void> => {
    if (fetchingRef.current) return;
    
    // Check cache first
    if (cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_DURATION) {
      setUser(cacheRef.current.user);
      setWorkspace(cacheRef.current.workspace);
      return;
    }
    
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const userPromise = new Promise<UserData | null>((resolve) => {
        const timeout = setTimeout(() => {
          try { chrome.runtime.onMessage.removeListener(onUserMsg as any); } catch {}
          resolve(null);
        }, 5000);

        const onUserMsg = (msg: any) => {
          if (msg?.type === 'CHECK_AUTH_RESULT' && msg.requestId === requestId) {
            clearTimeout(timeout);
            try { chrome.runtime.onMessage.removeListener(onUserMsg as any); } catch {}
            
            if (msg.ok && msg.user) {
              const userData: UserData = {
                id: msg.user.id,
                email: msg.user.email || '',
                image: msg.user.image,
                defaultWorkspace: msg.user.defaultWorkspace
              };
              resolve(userData);
            } else {
              resolve(null);
            }
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

      const userData = await userPromise;
      setUser(userData);

      // If we have a user with a default workspace, fetch workspace details
      let workspaceData: WorkspaceData | null = null;
      if (userData?.defaultWorkspace) {
        try {
          const workspaceRequestId = `workspace_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          
          workspaceData = await new Promise<WorkspaceData | null>((resolve) => {
            const timeout = setTimeout(() => {
              try { chrome.runtime.onMessage.removeListener(onWorkspaceMsg as any); } catch {}
              resolve(null);
            }, 5000);

            const onWorkspaceMsg = (msg: any) => {
              if (msg?.type === 'PIMMS_WORKSPACE_RESULT' && msg.requestId === workspaceRequestId) {
                clearTimeout(timeout);
                try { chrome.runtime.onMessage.removeListener(onWorkspaceMsg as any); } catch {}
                
                if (msg.ok && msg.workspace) {
                  const wsData: WorkspaceData = {
                    id: msg.workspace.id,
                    name: msg.workspace.name || 'Workspace',
                    slug: msg.workspace.slug,
                    logo: msg.workspace.logo
                  };
                  resolve(wsData);
                } else {
                  resolve(null);
                }
              }
            };
            
            try {
              chrome.runtime.onMessage.addListener(onWorkspaceMsg as any);
              chrome.runtime.sendMessage({ 
                type: 'PIMMS_WORKSPACE_REQUEST', 
                requestId: workspaceRequestId,
                workspaceSlug: userData.defaultWorkspace
              });
            } catch {
              clearTimeout(timeout);
              resolve(null);
            }
          });
        } catch {
          // Ignore workspace fetch errors
        }
      }

      setWorkspace(workspaceData);
      
      // Update cache
      cacheRef.current = {
        user: userData,
        workspace: workspaceData,
        timestamp: Date.now()
      };
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  return {
    user,
    workspace,
    isLoading,
    error
  };
}
