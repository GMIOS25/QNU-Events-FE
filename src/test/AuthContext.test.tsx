import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { apiClient } from '../api/client';

function LogoutButton() {
  const { logout, isLoading } = useAuth();
  if (isLoading) return null;
  return <button onClick={() => logout()}>Đăng xuất</button>;
}

function LoginAndImmediateFetchButton() {
  const { login } = useAuth();
  const handleClick = async () => {
    await login('sv001', 'Demo@12345');
    // Ngay sau khi login() resolve, request kế tiếp phải gắn Bearer token đồng bộ (BUG-18)
    await apiClient('/api/v1/events');
  };
  return <button onClick={handleClick}>Đăng nhập ngay</button>;
}

describe('AuthProvider session cleanup & token sync', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('clears cached query data on logout so the next user cannot see it', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Dữ liệu lịch sử của người dùng trước còn nằm trong cache
    queryClient.setQueryData(['history', 'summary'], { content: [{ eventId: 'evt-of-previous-user' }] });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LogoutButton />
        </AuthProvider>
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => {
      expect(queryClient.getQueryData(['history', 'summary'])).toBeUndefined();
    });
  });

  it('updates tokenProvider synchronously during login before follow-up API calls (BUG-18)', async () => {
    const capturedAuthHeaders: Array<string | null> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const headers = new Headers(init?.headers);
      if (url.endsWith('/api/v1/auth/login')) {
        return new Response(
          JSON.stringify({
            accessToken: 'fresh_jwt_token_123',
            expiresAt: '2026-11-25T00:00:00Z',
            user: { id: 'std-1', loginId: 'sv001', fullName: 'SV 1', roles: ['STUDENT'] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      capturedAuthHeaders.push(headers.get('Authorization'));
      return new Response(JSON.stringify({ content: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LoginAndImmediateFetchButton />
        </AuthProvider>
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Đăng nhập ngay' }));

    await waitFor(() => {
      expect(capturedAuthHeaders).toContain('Bearer fresh_jwt_token_123');
    });
  });
});
