import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EventsPage } from '../features/events/EventsPage';
import * as eventsApi from '../api/events';
import type { EventSummary, Page } from '../features/events/types';

vi.mock('../api/events', () => ({
  fetchEvents: vi.fn(),
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'student-1', roles: ['STUDENT'], classId: 'k49-cntt1' },
    hasRole: (role: string) => role === 'STUDENT',
  }),
}));

function renderEventsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('EventsPage component [QE-31]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEvents: EventSummary[] = [
    {
      id: 'evt-1',
      title: 'Hội thảo Trí tuệ Nhân tạo',
      location: 'Hội trường B',
      startAt: '2026-11-25T09:00:00Z',
      endAt: '2026-11-25T11:00:00Z',
      quotaTotal: 100,
      registeredCount: 40,
      remainingQuota: 60,
      registrationOpen: true,
      attendanceOpen: false,
      myRegistrationStatus: null,
      status: 'PUBLISHED',
      activityType: 'Hội thảo học thuật',
      activityPoints: 10,
    },
    {
      id: 'evt-2',
      title: 'Ngày hội Hiến máu Tình nguyện',
      location: 'Sân trường',
      startAt: '2026-11-28T07:30:00Z',
      endAt: '2026-11-28T11:30:00Z',
      quotaTotal: 50,
      registeredCount: 50,
      remainingQuota: 0,
      registrationOpen: false,
      attendanceOpen: false,
      myRegistrationStatus: 'REGISTERED',
      status: 'PUBLISHED',
      activityType: 'Tình nguyện xã hội',
      activityPoints: 15,
    },
  ];

  it('renders published events with quota, points and registration status (AC1, AC5)', async () => {
    const pageResponse: Page<EventSummary> = {
      content: mockEvents,
      totalElements: 2,
      totalPages: 1,
      size: 12,
      number: 0,
    };
    vi.mocked(eventsApi.fetchEvents).mockResolvedValueOnce(pageResponse);

    renderEventsPage();

    // Check titles
    expect(await screen.findByText('Hội thảo Trí tuệ Nhân tạo')).toBeInTheDocument();
    expect(screen.getByText('Ngày hội Hiến máu Tình nguyện')).toBeInTheDocument();

    // Check activity type and points
    expect(screen.getByText('+10 đ • Hội thảo học thuật')).toBeInTheDocument();
    expect(screen.getByText('+15 đ • Tình nguyện xã hội')).toBeInTheDocument();

    // Check quota info
    expect(screen.getByText('40/100 suất (còn 60 chỗ)')).toBeInTheDocument();
    expect(screen.getByText('50/50 suất (còn 0 chỗ)')).toBeInTheDocument();

    // Check registration status
    expect(screen.getByText('Đang mở đăng ký')).toBeInTheDocument();
    expect(screen.getByText('✓ Bạn đã giữ chỗ')).toBeInTheDocument();
  });

  it('filters events by activityType and resets filters (AC3)', async () => {
    const pageResponse: Page<EventSummary> = {
      content: [mockEvents[0]],
      totalElements: 1,
      totalPages: 1,
      size: 12,
      number: 0,
    };
    vi.mocked(eventsApi.fetchEvents).mockResolvedValue(pageResponse);

    renderEventsPage();

    expect(await screen.findByText('Hội thảo Trí tuệ Nhân tạo')).toBeInTheDocument();

    // Change activity type filter
    const select = screen.getByLabelText(/Loại hoạt động/i);
    fireEvent.change(select, { target: { value: 'Hội thảo học thuật' } });

    expect(eventsApi.fetchEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: 'Hội thảo học thuật',
        page: 0,
      })
    );

    // Reset button should appear
    const resetButton = screen.getByRole('button', { name: /Đặt lại/i });
    expect(resetButton).toBeInTheDocument();
    fireEvent.click(resetButton);

    expect(eventsApi.fetchEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: undefined,
        page: 0,
      })
    );
  });

  it('displays empty state when no events match filters', async () => {
    const emptyResponse: Page<EventSummary> = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 12,
      number: 0,
    };
    vi.mocked(eventsApi.fetchEvents).mockResolvedValueOnce(emptyResponse);

    renderEventsPage();

    expect(await screen.findByText(/Chưa có sự kiện dành cho lớp bạn/i)).toBeInTheDocument();
  });

  it('supports pagination controls when totalPages > 1', async () => {
    const pagedResponse: Page<EventSummary> = {
      content: [mockEvents[0]],
      totalElements: 25,
      totalPages: 3,
      size: 12,
      number: 0,
    };
    vi.mocked(eventsApi.fetchEvents).mockResolvedValue(pagedResponse);

    renderEventsPage();

    expect(await screen.findByText(/Trang/)).toBeInTheDocument();
    const nextButton = screen.getByRole('button', { name: /Sau/i });
    const prevButton = screen.getByRole('button', { name: /Trước/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);
    expect(eventsApi.fetchEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
      })
    );
  });
});
