import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HistoryPage } from '../features/history';
import * as eventsApi from '../api/events';
import type { HistoryItem, Page } from '../features/events/types';

vi.mock('../api/events', () => ({
  fetchHistory: vi.fn(),
}));

function renderHistoryPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
}

function pageOf(items: HistoryItem[]): Page<HistoryItem> {
  return { content: items, totalElements: items.length, totalPages: 1, size: 20, number: 0 };
}

describe('HistoryPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when student has no event registrations', async () => {
    const emptyPage: Page<HistoryItem> = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
    };
    vi.mocked(eventsApi.fetchHistory).mockResolvedValue(emptyPage);

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

    const mockPage: Page<HistoryItem> = {
      content: mockHistory,
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    vi.mocked(eventsApi.fetchHistory).mockResolvedValue(mockPage);

    renderHistoryPage();

    // Check titles
    expect(await screen.findByText('Hội thảo Trí tuệ Nhân tạo')).toBeInTheDocument();
    expect(screen.getByText('Ngày hội Tình nguyện')).toBeInTheDocument();

    // Check KPIs: 2 registered, 1 attended, +10 points
    expect(screen.getByText('2')).toBeInTheDocument(); // total registered
    expect(screen.getByText('1')).toBeInTheDocument(); // total attended
    expect(screen.getByText('+10 đ')).toBeInTheDocument(); // accumulated points

    // Check status badges:
    // 'Đã điểm danh': 1 in KPI card, 1 in filter dropdown option, 1 in event item badge
    expect(screen.getAllByText('Đã điểm danh')).toHaveLength(3);
    // 'Chưa điểm danh': 1 in filter dropdown option, 1 in event item badge
    expect(screen.getAllByText('Chưa điểm danh')).toHaveLength(2);
  });

  it('filters history by attendance status and supports pagination', async () => {
    const pagedResponse: Page<HistoryItem> = {
      content: [
        {
          eventId: 'evt-1',
          title: 'Hội thảo Kỹ thuật Phần mềm',
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
      ],
      totalElements: 25,
      totalPages: 2,
      size: 20,
      number: 0,
    };

    vi.mocked(eventsApi.fetchHistory).mockResolvedValue(pagedResponse);

    renderHistoryPage();

    expect(await screen.findByText('Hội thảo Kỹ thuật Phần mềm')).toBeInTheDocument();
    expect(screen.getByText(/Trang/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sau/i })).toBeInTheDocument();

    // Trigger filter change
    const select = screen.getByLabelText(/Trạng thái điểm danh/i);
    fireEvent.change(select, { target: { value: 'ACCEPTED' } });

    expect(eventsApi.fetchHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        attendanceStatus: 'ACCEPTED',
        page: 0,
      })
    );
  });

  it('controls semester dropdown based on academicYear and includes Semester 3 (Summer)', async () => {
    const emptyPage: Page<HistoryItem> = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
    };
    vi.mocked(eventsApi.fetchHistory).mockResolvedValue(emptyPage);

    renderHistoryPage();

    const semesterSelect = screen.getByLabelText(/Học kỳ/i) as HTMLSelectElement;
    expect(semesterSelect).toBeDisabled();
    expect(screen.getByText(/Cần nhập năm học/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Học kỳ 3 \(Hè\)/i })).toBeInTheDocument();

    // Type academic year
    const yearInput = screen.getByLabelText(/Năm học/i);
    fireEvent.change(yearInput, { target: { value: '2026-2027' } });

    expect(semesterSelect).not.toBeDisabled();
    expect(screen.queryByText(/Cần nhập năm học/i)).not.toBeInTheDocument();
  });

  it('renders error state with retry button on API failure', async () => {
    vi.mocked(eventsApi.fetchHistory).mockRejectedValueOnce(new Error('Network error'));

    renderHistoryPage();

    expect(await screen.findByText(/Không thể tải dữ liệu lịch sử sự kiện/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    expect(retryBtn).toBeInTheDocument();

    // When clicking retry, both queries (pageData and summaryData) are refetched
    fireEvent.click(retryBtn);
    expect(eventsApi.fetchHistory).toHaveBeenCalledTimes(4); // 2 initial + 2 retried
  });

  it('shows registration status separately from attendance status (REQ-REV-008)', async () => {
    vi.mocked(eventsApi.fetchHistory).mockResolvedValue(
      pageOf([
        {
          eventId: 'evt-cancelled',
          title: 'Sự kiện đã hủy đăng ký',
          startAt: '2026-11-20T08:00:00Z',
          location: 'Phòng A1',
          registrationStatus: 'CANCELLED',
          registeredAt: '2026-11-10T08:00:00Z',
          attendanceStatus: 'NOT_CHECKED_IN',
          method: 'DYNAMIC_QR',
          activityType: 'Hội thảo',
          activityPoints: 7,
        },
      ])
    );

    renderHistoryPage();

    expect(await screen.findByText('Sự kiện đã hủy đăng ký')).toBeInTheDocument();
    expect(screen.getByText('Đã hủy')).toBeInTheDocument();
    expect(screen.getByText('Đăng ký:')).toBeInTheDocument();
    expect(screen.getByText('Điểm danh:')).toBeInTheDocument();
    // Chưa điểm danh hợp lệ thì không hiển thị như điểm đã đạt (không có dấu +)
    expect(screen.getByText('7 điểm (Hội thảo)')).toBeInTheDocument();
    expect(screen.queryByText('+7 điểm (Hội thảo)')).not.toBeInTheDocument();
    // Không hiện phương thức khi chưa có điểm danh
    expect(screen.queryByText(/QR động/)).not.toBeInTheDocument();
  });

  it('shows attendance method and time only for accepted attendance (REQ-REV-009)', async () => {
    vi.mocked(eventsApi.fetchHistory).mockResolvedValue(
      pageOf([
        {
          eventId: 'evt-accepted',
          title: 'Sự kiện đã điểm danh',
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
      ])
    );

    renderHistoryPage();

    expect(await screen.findByText(/Điểm danh lúc:.*QR động/)).toBeInTheDocument();
    expect(screen.getByText(/Đăng ký lúc:/)).toBeInTheDocument();
    expect(screen.getByText('+10 điểm (Hội thảo)')).toBeInTheDocument();
  });

  it('refreshes KPI summary when history queries are invalidated after check-in/registration', async () => {
    vi.mocked(eventsApi.fetchHistory).mockResolvedValue(pageOf([]));

    const { queryClient } = renderHistoryPage();
    await screen.findByText(/Bạn chưa có lịch sử sự kiện nào/i);

    const summaryCalls = () =>
      vi.mocked(eventsApi.fetchHistory).mock.calls.filter(([params]) => params?.size === 1000).length;
    expect(summaryCalls()).toBe(1);

    // AttendanceSlot / RegistrationSlot gọi đúng lệnh này khi thành công
    await queryClient.invalidateQueries({ queryKey: ['history'] });

    expect(summaryCalls()).toBe(2);
  });
});
