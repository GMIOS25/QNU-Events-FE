import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';

function LogoutButton() {
  const { logout, isLoading } = useAuth();
  if (isLoading) return null;
  return <button onClick={() => logout()}>Đăng xuất</button>;
}

describe('AuthProvider session cleanup', () => {
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
});
