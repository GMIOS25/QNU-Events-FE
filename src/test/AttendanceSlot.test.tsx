import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendanceSlot } from '../features/attendance';
import * as eventsApi from '../api/events';
import { ApiErrorException } from '../api/client';
import type { EventDetail } from '../features/events/types';

vi.mock('html5-qrcode', () => {
  return {
    Html5QrcodeScanner: vi.fn().mockImplementation(() => ({
      render: vi.fn(),
      clear: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

const mockEvent: EventDetail = {
  id: 'evt-101',
  title: 'Hội thảo Công nghệ Phần mềm',
  location: 'Hội trường A',
  startAt: '2026-11-20T08:00:00Z',
  endAt: '2026-11-20T11:00:00Z',
  registrationDeadline: '2026-11-19T23:59:59Z',
  attendanceOpenAt: '2026-11-20T07:45:00Z',
  attendanceCloseAt: '2026-11-20T11:15:00Z',
  attendanceMethod: 'DYNAMIC_QR',
  qrRotationSeconds: 10,
  qrGraceSeconds: 3,
  quotaTotal: 100,
  registeredCount: 45,
  remainingQuota: 55,
  registrationOpen: false,
  attendanceOpen: true,
  status: 'PUBLISHED',
  activityType: 'Workshop',
  activityPoints: 5,
  ownerId: 'owner-99',
  audienceClassIds: ['cls-1'],
  version: 1,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('AttendanceSlot Component (QE-54 3-attempt limit & confirmation counter)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem('qnu_events_access_token', 'mock_jwt_token');
    sessionStorage.setItem(
      'qnu_events_user_info',
      JSON.stringify({
        id: 'std-202',
        fullName: 'Trần Văn Sinh Viên',
        roles: ['STUDENT'],
        classId: 'cls-1',
      })
    );
  });

  it('1. Hiển thị mặc định bộ đếm lượt 0/3 và các nút khả dụng khi chưa thử', () => {
    renderWithProviders(<AttendanceSlot eventId="evt-101" event={mockEvent} />);

    const badge = screen.getByTestId('attempt-counter-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Lượt gửi xác nhận: 0/3');
    expect(screen.getByRole('button', { name: /Quét mã QR bằng Camera/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Gửi mã/i })).toBeDisabled(); // disable khi input rỗng
  });

  it('2. Cập nhật Lượt gửi xác nhận: 1/3 và hiển thị thông báo lỗi khi quét mã hết hạn', async () => {
    vi.spyOn(eventsApi, 'checkInQr').mockRejectedValueOnce(
      new ApiErrorException(422, {
        code: 'QR_EXPIRED',
        message: 'Mã QR đã hết hạn (xoay vòng 10 giây).',
        details: {
          method: 'DYNAMIC_QR',
          attemptCount: 1,
          maxAttempts: 3,
          remainingAttempts: 2,
          canRetry: true,
        },
      })
    );

    renderWithProviders(<AttendanceSlot eventId="evt-101" event={mockEvent} />);

    const input = screen.getByPlaceholderText(/Dán chuỗi token dự phòng/i);
    fireEvent.change(input, { target: { value: 'qr1.fake.expired.token' } });

    const submitBtn = screen.getByRole('button', { name: /Gửi mã/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const badge = screen.getByTestId('attempt-counter-badge');
      expect(badge).toHaveTextContent('Lượt gửi xác nhận: 1/3');
    });

    expect(screen.getByText(/Mã QR đã hết hạn/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quét mã QR bằng Camera/i })).toBeEnabled();
  });

  it('3. Khóa chức năng và hiển thị cảnh báo đỏ khi chạm trần 3/3 hoặc ATTEMPT_LIMIT_REACHED', async () => {
    vi.spyOn(eventsApi, 'checkInQr').mockRejectedValueOnce(
      new ApiErrorException(409, {
        code: 'ATTEMPT_LIMIT_REACHED',
        message: 'Bạn đã vượt quá số lần thử điểm danh cho phép (tối đa 3 lần).',
        details: {
          method: 'DYNAMIC_QR',
          attemptCount: 3,
          maxAttempts: 3,
          remainingAttempts: 0,
          canRetry: false,
        },
      })
    );

    renderWithProviders(<AttendanceSlot eventId="evt-101" event={mockEvent} />);

    const input = screen.getByPlaceholderText(/Dán chuỗi token dự phòng/i);
    fireEvent.change(input, { target: { value: 'qr1.third.failed.token' } });

    fireEvent.click(screen.getByRole('button', { name: /Gửi mã/i }));

    await waitFor(() => {
      const badge = screen.getByTestId('attempt-counter-badge');
      expect(badge).toHaveTextContent('Lượt gửi xác nhận: 3/3');
      expect(badge).toHaveTextContent('(Đã hết lượt)');
    });

    // Cảnh báo khóa hiển thị
    expect(screen.getByText(/Đã khóa chức năng điểm danh tự động/i)).toBeInTheDocument();
    expect(screen.getByText(/Bạn đã sử dụng hết 3\/3 lần thử quét mã QR/i)).toBeInTheDocument();

    // Các hành động quét và gửi mã bị disable hoàn toàn
    expect(screen.getByRole('button', { name: /Quét mã QR bằng Camera/i })).toBeDisabled();
    expect(screen.getByPlaceholderText(/Chức năng đã bị khóa/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Gửi mã/i })).toBeDisabled();
  });

  it('4. Điểm danh thành công -> hiển thị trạng thái ACCEPTED và ẩn badge đếm lượt', async () => {
    vi.spyOn(eventsApi, 'checkInQr').mockResolvedValueOnce({
      status: 'ACCEPTED',
      acceptedAt: '2026-11-20T08:05:00Z',
    });

    const onCheckedInMock = vi.fn();
    renderWithProviders(
      <AttendanceSlot eventId="evt-101" event={mockEvent} onCheckedIn={onCheckedInMock} />
    );

    const input = screen.getByPlaceholderText(/Dán chuỗi token dự phòng/i);
    fireEvent.change(input, { target: { value: 'qr1.valid.token.123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi mã/i }));

    await waitFor(() => {
      expect(screen.getByText(/Điểm danh thành công!/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Thời gian xác nhận:/i)).toBeInTheDocument();
    expect(onCheckedInMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('attempt-counter-badge')).not.toBeInTheDocument();
  });
});
