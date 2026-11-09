import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HistoryPage } from '../features/history';
import * as eventsApi from '../api/events';
import type { HistoryItem } from '../features/events/types';

vi.mock('../api/events', () => ({
  fetchHistory: vi.fn(),
}));

function renderHistoryPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('HistoryPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when student has no event registrations', async () => {
    vi.mocked(eventsApi.fetchHistory).mockResolvedValueOnce([]);

    renderHistoryPage();

    expect(await screen.findByText(/Bạn chưa có lịch sử sự kiện nào/i)).toBeInTheDocument();
    expect(screen.getByText(/Khám phá sự kiện/i)).toBeInTheDocument();
  });

  it('renders registered and attended events with points calculation', async () => {
    const mockHistory: HistoryItem[] = [
      {
        eventId: 'evt-1',
        title: 'Hội thảo Trí tuệ Nhân tạo',
        startAt: '2026-11-15T09:00:00Z',
        location: 'Hội trường B',
        registrationStatus: 'REGISTERED',
        registeredAt: '2026-11-10T08:00:00Z',
        attendanceStatus: 'ACCEPTED',
        attendanceAt: '2026-11-15T09:10:00Z',
        method: 'DYNAMIC_QR',
        activityType: 'Hội thảo',
        activityPoints: 10,
      },
      {
        eventId: 'evt-2',
        title: 'Ngày hội Tình nguyện',
        startAt: '2026-11-20T08:00:00Z',
        location: 'Sân trường',
        registrationStatus: 'REGISTERED',
        registeredAt: '2026-11-11T10:00:00Z',
        attendanceStatus: 'NOT_CHECKED_IN',
        method: 'DYNAMIC_QR',
        activityType: 'Tình nguyện',
        activityPoints: 5,
      },
    ];

    vi.mocked(eventsApi.fetchHistory).mockResolvedValueOnce(mockHistory);

    renderHistoryPage();

    // Check titles
    expect(await screen.findByText('Hội thảo Trí tuệ Nhân tạo')).toBeInTheDocument();
    expect(screen.getByText('Ngày hội Tình nguyện')).toBeInTheDocument();

    // Check KPIs: 2 registered, 1 attended, +10 points
    expect(screen.getByText('2')).toBeInTheDocument(); // total registered
    expect(screen.getByText('1')).toBeInTheDocument(); // total attended
    expect(screen.getByText('+10 đ')).toBeInTheDocument(); // accumulated points

    // Check status badges
    expect(screen.getAllByText('Đã điểm danh')).toHaveLength(2);
    expect(screen.getByText('Chưa điểm danh')).toBeInTheDocument();
  });
});
