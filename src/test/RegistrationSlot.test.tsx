import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../features/auth/AuthContext';
import { RegistrationSlot } from '../features/registration';
import * as eventsApi from '../api/events';
import type { EventDetail } from '../features/events/types';

const mockEvent: EventDetail = {
  id: 'evt-1',
  title: 'Hội thảo AI',
  location: 'Hội trường B',
  startAt: '2026-11-15T09:00:00Z',
  endAt: '2026-11-15T11:00:00Z',
  registrationDeadline: '2026-11-14T23:59:59Z',
  attendanceOpenAt: '2026-11-15T08:45:00Z',
  attendanceCloseAt: '2026-11-15T11:15:00Z',
  attendanceMethod: 'DYNAMIC_QR',
  qrRotationSeconds: 10,
  qrGraceSeconds: 3,
  quotaTotal: 50,
  registeredCount: 10,
  remainingQuota: 40,
  registrationOpen: true,
  attendanceOpen: false,
  status: 'PUBLISHED',
  activityType: 'Hội thảo',
  activityPoints: 5,
  ownerId: 'owner-1',
  audienceClassIds: ['cls-1'],
  version: 1,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('RegistrationSlot component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('qnu_events_access_token', 'mock_token');
    sessionStorage.setItem(
      'qnu_events_user_info',
      JSON.stringify({
        id: 'std-1',
        loginId: 'sv001',
        fullName: 'Nguyễn Văn A',
        roles: ['STUDENT'],
        classId: 'cls-1',
      })
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'std-1',
          loginId: 'sv001',
          fullName: 'Nguyễn Văn A',
          roles: ['STUDENT'],
          classId: 'cls-1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.spyOn(eventsApi, 'fetchMyRegistration').mockRejectedValue(new Error('NOT_FOUND'));
  });

  it('renders quota summary and register button for students', async () => {
    renderWithProviders(<RegistrationSlot eventId="evt-1" event={mockEvent} />);

    expect(await screen.findByText(/Suất tham gia sự kiện/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã đăng ký 10\/50 chỗ/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Đăng ký giữ chỗ/i })).toBeEnabled();
    });
  });

  it('shows closed registration state when event quota is full', async () => {
    const fullEvent: EventDetail = {
      ...mockEvent,
      registeredCount: 50,
      remainingQuota: 0,
      registrationOpen: false,
    };

    renderWithProviders(<RegistrationSlot eventId="evt-1" event={fullEvent} />);

    expect(await screen.findByText(/Sự kiện đã hết suất tham gia/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Đăng ký giữ chỗ/i })).not.toBeInTheDocument();
    });
  });

  it('shows unpublished state when event is DRAFT or CANCELLED (BUG-10)', async () => {
    const draftEvent: EventDetail = {
      ...mockEvent,
      status: 'DRAFT',
      registrationOpen: false,
    };

    renderWithProviders(<RegistrationSlot eventId="evt-1" event={draftEvent} />);

    expect(await screen.findByText(/Sự kiện chưa được công bố hoặc đã hủy/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đăng ký giữ chỗ/i })).not.toBeInTheDocument();
  });
});
