import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EventDetailPage } from '../features/events/EventDetailPage';
import * as eventsApi from '../api/events';
import type { EventDetail } from '../features/events/types';

vi.mock('../api/events', () => ({
  fetchEvent: vi.fn(),
  previewEvent: vi.fn(),
  publishEvent: vi.fn(),
  fetchMyRegistration: vi.fn().mockResolvedValue({ status: 'NONE' }),
  registerEvent: vi.fn(),
  fetchMyAttendance: vi.fn().mockResolvedValue({
    status: 'NOT_CHECKED_IN',
    acceptedAt: null,
    attemptCount: 0,
    maxAttempts: 3,
    remainingAttempts: 3,
    canRetry: true,
  }),
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'student-1', roles: ['STUDENT'], classId: 'k49-cntt1' },
    hasRole: (role: string) => role === 'STUDENT',
  }),
}));

function renderEventDetailPage(eventId = 'evt-123') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/events/${eventId}`]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('EventDetailPage component [QE-31]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDetail: EventDetail = {
    id: 'evt-123',
    title: 'Hội thảo Khởi nghiệp Đổi mới Sáng tạo',
    description: 'Chi tiết về buổi hội thảo dành cho sinh viên.',
    location: 'Hội trường B',
    startAt: '2026-11-25T09:00:00Z',
    endAt: '2026-11-25T11:00:00Z',
    registrationDeadline: '2026-11-24T23:59:00Z',
    attendanceOpenAt: '2026-11-25T08:45:00Z',
    attendanceCloseAt: '2026-11-25T11:15:00Z',
    attendanceMethod: 'DYNAMIC_QR',
    qrRotationSeconds: 10,
    qrGraceSeconds: 3,
    quotaTotal: 120,
    registeredCount: 45,
    remainingQuota: 75,
    registrationOpen: true,
    attendanceOpen: false,
    myRegistrationStatus: null,
    status: 'PUBLISHED',
    activityType: 'Hội thảo học thuật',
    activityPoints: 10,
    ownerId: 'owner-1',
    audienceClassIds: ['k49-cntt1'],
    version: 1,
  };

  it('renders all key facts: time, location, deadline, attendance window, quota, and audience (AC2)', async () => {
    vi.mocked(eventsApi.fetchEvent).mockResolvedValueOnce(mockDetail);

    renderEventDetailPage();

    // Title and description
    expect(await screen.findByText('Hội thảo Khởi nghiệp Đổi mới Sáng tạo')).toBeInTheDocument();
    expect(screen.getByText('Chi tiết về buổi hội thảo dành cho sinh viên.')).toBeInTheDocument();

    // Key facts labels
    expect(screen.getByText('Thời gian diễn ra')).toBeInTheDocument();
    expect(screen.getByText('Địa điểm')).toBeInTheDocument();
    expect(screen.getByText('Hạn chót đăng ký')).toBeInTheDocument();
    expect(screen.getByText('Cửa sổ điểm danh QR')).toBeInTheDocument();
    expect(screen.getByText('Quy mô sự kiện')).toBeInTheDocument();
    expect(screen.getByText('Đối tượng tham gia')).toBeInTheDocument();

    // Values
    expect(screen.getByText('Hội trường B')).toBeInTheDocument();
    expect(screen.getByText('45/120 suất (còn 75 chỗ)')).toBeInTheDocument();
    expect(screen.getByText(/Dành cho các lớp được phân công/i)).toBeInTheDocument();
  });

  it('shows error banner when event is cancelled, not found or inaccessible (AC4)', async () => {
    vi.mocked(eventsApi.fetchEvent).mockRejectedValueOnce({
      apiError: { code: 'NOT_FOUND', message: 'Tài nguyên không tồn tại.' },
    });

    renderEventDetailPage('evt-cancelled');

    expect(
      await screen.findByText('Không tìm thấy sự kiện hoặc bạn không có quyền xem sự kiện này.')
    ).toBeInTheDocument();
  });

  it('renders audienceClasses code tags and eligible status when available (QE-37)', async () => {
    const detailWithAudienceClasses: EventDetail = {
      ...mockDetail,
      audienceClasses: [
        { id: 'c-1', code: 'K49CNTT1', name: 'Công nghệ thông tin K49 A' },
        { id: 'c-2', code: 'K49CNTT2', name: 'Công nghệ thông tin K49 B' },
      ],
      eligible: true,
    };
    vi.mocked(eventsApi.fetchEvent).mockResolvedValueOnce(detailWithAudienceClasses);

    renderEventDetailPage();

    expect(await screen.findByText('K49CNTT1')).toBeInTheDocument();
    expect(screen.getByText('K49CNTT2')).toBeInTheDocument();
    expect(screen.getByText(/Lớp bạn đủ điều kiện tham gia/i)).toBeInTheDocument();
  });
});

