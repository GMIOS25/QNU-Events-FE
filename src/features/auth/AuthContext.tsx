import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { UserInfo, UserRole, LoginResponse } from './types';
import { apiClient, setTokenProvider, setOnUnauthorizedHandler } from '../../api/client';

const TOKEN_KEY = 'qnu_events_access_token';
const USER_KEY = 'qnu_events_user_info';

function readStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

function readStoredUser(): UserInfo | null {
  const cached = sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return null;
}

function writeStoredUser(userInfo: UserInfo) {
  const serialized = JSON.stringify(userInfo);
  if (sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.setItem(USER_KEY, serialized);
  } else if (localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(USER_KEY, serialized);
  }
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (loginId: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    const stored = readStoredToken();
    setTokenProvider(() => stored);
    return stored;
  });

  const [user, setUser] = useState<UserInfo | null>(() => readStoredUser());

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const tokenRef = useRef<string | null>(token);
  const skipNextMeCheckRef = useRef<boolean>(false);

  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setTokenProvider(() => null);
    setToken(null);
    setUser(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Xóa dữ liệu đã cache của phiên trước (lịch sử, đăng ký...) để người đăng nhập sau
    // trên cùng thiết bị không thấy dữ liệu của người khác (UC021 A3).
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    tokenRef.current = token;
    setTokenProvider(() => tokenRef.current);
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

      if (skipNextMeCheckRef.current) {
        skipNextMeCheckRef.current = false;
        setIsLoading(false);
        return;
      }

      try {
        const userInfo = await apiClient<UserInfo>('/api/v1/auth/me');
        setUser(userInfo);
        writeStoredUser(userInfo);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [token, clearSession]);

  const login = async (loginId: string, password: string, remember = false) => {
    const res = await apiClient<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, password }),
    });

    // Cập nhật tokenProvider đồng bộ TRƯỚC khi navigate để tránh race condition 401 (BUG-18).
    tokenRef.current = res.accessToken;
    setTokenProvider(() => tokenRef.current);
    skipNextMeCheckRef.current = true;

    // Phiên mới không được dùng lại cache của phiên cũ (kể cả khi phiên cũ hết hạn mà chưa logout).
    queryClient.clear();
    setToken(res.accessToken);
    setUser(res.user);
    setIsLoading(false);

    if (remember) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.setItem(TOKEN_KEY, res.accessToken);
      sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
    }
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
        navigate('/events', { replace: true });
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
