import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { UserInfo, UserRole, LoginResponse } from './types';
import { apiClient, setTokenProvider, setOnUnauthorizedHandler } from '../../api/client';

const TOKEN_KEY = 'qnu_events_access_token';
const USER_KEY = 'qnu_events_user_info';

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem(TOKEN_KEY);
  });

  const [user, setUser] = useState<UserInfo | null>(() => {
    const cached = sessionStorage.getItem(USER_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    setTokenProvider(() => token);
    setOnUnauthorizedHandler(() => {
      clearSession();
    });
  }, [token, clearSession]);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userInfo = await apiClient<UserInfo>('/api/v1/auth/me');
        setUser(userInfo);
        sessionStorage.setItem(USER_KEY, JSON.stringify(userInfo));
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [token, clearSession]);

  const login = async (loginId: string, password: string) => {
    const res = await apiClient<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, password }),
    });

    setToken(res.accessToken);
    setUser(res.user);
    sessionStorage.setItem(TOKEN_KEY, res.accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient('/api/v1/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearSession();
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.roles?.includes(role) ?? false;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user?.roles?.some((r) => roles.includes(r)) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export interface RequireRoleProps {
  roles?: UserRole[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const { user, isLoading, hasAnyRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/login', { replace: true, state: { from: location } });
      } else if (roles && roles.length > 0 && !hasAnyRole(roles)) {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [user, isLoading, roles, hasAnyRole, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-sm text-slate-500 font-medium">Đang tải thông tin xác thực...</div>
      </div>
    );
  }

  if (!user || (roles && roles.length > 0 && !hasAnyRole(roles))) {
    return null;
  }

  return <>{children}</>;
};
