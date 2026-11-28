import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendanceSlot } from '../features/attendance';
import {
  formatDistanceMeters,
  mapGeolocationError,
  requestCurrentGpsPosition,
} from '../features/attendance/gpsUtils';
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

const mockGpsEvent: EventDetail = {
  id: 'evt-gps-201',
  title: 'Giải chạy Sinh viên QNU 2026',
  location: 'Sân vận động ĐH Quy Nhơn',
  startAt: '2026-11-28T08:00:00Z',
  endAt: '2026-11-28T11:00:00Z',
  registrationDeadline: '2026-11-27T23:59:59Z',
  attendanceOpenAt: '2026-11-28T07:45:00Z',
  attendanceCloseAt: '2026-11-28T11:15:00Z',
  attendanceMethod: 'GPS',
  qrRotationSeconds: 10,
  qrGraceSeconds: 3,
  gpsLat: 13.7589,
  gpsLng: 109.2183,
  allowedRadiusMeters: 60,
  quotaTotal: 100,
  registeredCount: 45,
  remainingQuota: 55,
  registrationOpen: false,
  attendanceOpen: true,
  status: 'PUBLISHED',
  activityType: 'Thể dục - Thể thao',
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

function mockGeolocationSuccess(latitude: number, longitude: number, accuracy: number) {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({
      coords: {
        latitude,
        longitude,
        accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    } as GeolocationPosition);
  });

  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });

  return getCurrentPosition;
}

function mockGeolocationError(code: number, message = 'Geolocation error') {
  const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
    if (error) {
      error({
        code,
        message,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    }
  });

  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });

  return getCurrentPosition;
}

describe('GPS Attendance Utilities (QE-55)', () => {
  it('formatDistanceMeters giữ rõ phần vượt biên cho 60.04m với bán kính 60m (không làm tròn về 60.0 m)', () => {
    expect(formatDistanceMeters(60.04, 60, true)).toBe('60.04 m');
    expect(formatDistanceMeters(60.001, 60, true)).toBe('60.01 m');
    expect(formatDistanceMeters(11.12, 60, false)).toBe('11.1 m');
    expect(formatDistanceMeters(166.78, 60, true)).toBe('166.8 m');
  });

  it('mapGeolocationError ánh xạ chính xác các mã lỗi GeolocationPositionError', () => {
    expect(mapGeolocationError({ code: 1 })).toContain('từ chối quyền truy cập vị trí');
    expect(mapGeolocationError({ code: 2 })).toContain('Không thể xác định vị trí GPS');
    expect(mapGeolocationError({ code: 3 })).toContain('Hết thời gian chờ');
  });

  it('requestCurrentGpsPosition báo lỗi khi trình duyệt không hỗ trợ Geolocation', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });

    await expect(requestCurrentGpsPosition()).rejects.toThrow(/không hỗ trợ định vị GPS/i);
  });

  it('requestCurrentGpsPosition truyền enableHighAccuracy=true và maximumAge=0 để tránh dùng tọa độ cache cũ', async () => {
    const spy = mockGeolocationSuccess(13.7589, 109.2183, 8.5);

    const pos = await requestCurrentGpsPosition();

    expect(pos).toEqual({ latitude: 13.7589, longitude: 109.2183, accuracyMeters: 8.5 });
    expect(spy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true, maximumAge: 0 })
    );
  });
});

describe('AttendanceSlot GPS Mode (QE-55)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(eventsApi, 'fetchMyAttendance').mockResolvedValue({
      status: 'NOT_CHECKED_IN',
      acceptedAt: null,
      attemptCount: 0,
      maxAttempts: 3,
      remainingAttempts: 3,
      canRetry: true,
    });
  });

  it('1. Hiển thị giao diện điểm danh GPS, tọa độ tâm, bán kính 60 m và bộ đếm 0/3', () => {
    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);

    expect(screen.getByText('Điểm danh sự kiện (GPS)')).toBeInTheDocument();
    expect(screen.getByTestId('gps-attendance-panel')).toBeInTheDocument();
    expect(screen.getByText(/13\.758900, 109\.218300/)).toBeInTheDocument();
    expect(screen.getByTestId('attempt-counter-badge')).toHaveTextContent('Lượt gửi xác nhận: 0/3');
    expect(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i })).toBeEnabled();
  });

  it('2. Lấy tọa độ thành công & gửi checkInGps -> hiển thị ACCEPTED và khoảng cách xác thực', async () => {
    mockGeolocationSuccess(13.759, 109.2183, 12.5);
    const checkInGpsSpy = vi.spyOn(eventsApi, 'checkInGps').mockResolvedValueOnce({
      status: 'ACCEPTED',
      acceptedAt: '2026-11-28T08:05:00Z',
      distanceMeters: 11.12,
      allowedRadiusMeters: 60,
    });
    const onCheckedIn = vi.fn();

    renderWithProviders(
      <AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} onCheckedIn={onCheckedIn} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));

    await waitFor(() => {
      expect(screen.getByText(/Điểm danh thành công!/i)).toBeInTheDocument();
    });

    expect(checkInGpsSpy).toHaveBeenCalledWith(
      'evt-gps-201',
      {
        latitude: 13.759,
        longitude: 109.2183,
        accuracyMeters: 12.5,
      },
      expect.any(String)
    );
    expect(screen.getByTestId('gps-accepted-distance')).toHaveTextContent('11.1 m / 60 m');
    expect(screen.queryByTestId('attempt-counter-badge')).not.toBeInTheDocument();
    expect(onCheckedIn).toHaveBeenCalledTimes(1);
  });

  it('3. Điểm danh ngoài biên 60.04m -> báo 422 GPS_OUT_OF_RANGE hiển thị đúng 60.04 m và cập nhật 1/3', async () => {
    mockGeolocationSuccess(13.75944, 109.2183, 10.0);
    vi.spyOn(eventsApi, 'checkInGps').mockRejectedValueOnce(
      new ApiErrorException(422, {
        code: 'GPS_OUT_OF_RANGE',
        message: 'Vị trí nằm ngoài bán kính.',
        details: {
          method: 'GPS',
          attemptCount: 1,
          maxAttempts: 3,
          remainingAttempts: 2,
          canRetry: true,
          distanceMeters: 60.04,
          allowedRadiusMeters: 60,
        },
      })
    );

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);

    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));

    await waitFor(() => {
      expect(screen.getByTestId('attempt-counter-badge')).toHaveTextContent('Lượt gửi xác nhận: 1/3');
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('60.04 m');
    expect(alert).toHaveTextContent('60 m');
    expect(alert).toHaveTextContent('Còn 2 lượt thử.');
    expect(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i })).toBeEnabled();
  });

  it('4. Chạm giới hạn 3/3 (ATTEMPT_LIMIT_REACHED) -> khóa nút điểm danh GPS và hiển thị cảnh báo đỏ', async () => {
    mockGeolocationSuccess(13.761, 109.2183, 15.0);
    vi.spyOn(eventsApi, 'checkInGps').mockRejectedValueOnce(
      new ApiErrorException(409, {
        code: 'ATTEMPT_LIMIT_REACHED',
        message: 'Đã hết lượt thử.',
        details: {
          method: 'GPS',
          attemptCount: 3,
          maxAttempts: 3,
          remainingAttempts: 0,
          canRetry: false,
        },
      })
    );

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);

    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));

    await waitFor(() => {
      expect(screen.getByTestId('attempt-counter-badge')).toHaveTextContent('Lượt gửi xác nhận: 3/3');
    });

    expect(screen.getByText(/Đã khóa chức năng điểm danh tự động/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i })).toBeDisabled();
  });

  it('5. Trình duyệt từ chối quyền vị trí (PERMISSION_DENIED) -> báo lỗi rõ ràng và không gọi API / không trừ lượt', async () => {
    mockGeolocationError(1);
    const checkInGpsSpy = vi.spyOn(eventsApi, 'checkInGps');

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);

    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/từ chối quyền truy cập vị trí/i);
    expect(checkInGpsSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('attempt-counter-badge')).toHaveTextContent('Lượt gửi xác nhận: 0/3');
  });

  it('6. Sai số GPS cao (> 100m) vẫn gửi lên server, hiện khuyến cáo nếu lỗi và vẫn chấp nhận khi server trả ACCEPTED', async () => {
    mockGeolocationSuccess(13.75895, 109.2183, 250.0);
    vi.spyOn(eventsApi, 'checkInGps').mockRejectedValueOnce(
      new ApiErrorException(422, {
        code: 'GPS_OUT_OF_RANGE',
        message: 'Ngoài phạm vi',
        details: {
          method: 'GPS',
          attemptCount: 1,
          maxAttempts: 3,
          remainingAttempts: 2,
          canRetry: true,
          distanceMeters: 75.5,
          allowedRadiusMeters: 60,
        },
      })
    );

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);

    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));

    await waitFor(() => {
      expect(screen.getByTestId('gps-low-accuracy-advisory')).toBeInTheDocument();
    });
    expect(screen.getByTestId('gps-last-reading')).toHaveTextContent('±250 m');
  });

  it('7. Sự kiện GPS chưa cấu hình tọa độ -> hiển thị cảnh báo và vô hiệu hóa nút điểm danh', () => {
    const unconfiguredEvent: EventDetail = {
      ...mockGpsEvent,
      gpsLat: null,
      gpsLng: null,
    };

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={unconfiguredEvent} />);

    expect(screen.getByText(/Sự kiện chưa được cấu hình tọa độ tâm GPS/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i })).toBeDisabled();
  });

  it('8. Xử lý lỗi POSITION_UNAVAILABLE (code 2) và TIMEOUT (code 3) từ thiết bị mà không gọi API', async () => {
    const checkInGpsSpy = vi.spyOn(eventsApi, 'checkInGps');
    mockGeolocationError(3);

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Hết thời gian chờ lấy tín hiệu GPS/i);
    expect(checkInGpsSpy).not.toHaveBeenCalled();

    mockGeolocationError(2);
    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không thể xác định vị trí GPS hiện tại/i);
    expect(checkInGpsSpy).not.toHaveBeenCalled();
  });

  it.each([
    { code: 'GPS_NOT_CONFIGURED', status: 409, expected: /Sự kiện chưa được cấu hình tọa độ điểm danh GPS/i },
    { code: 'ATTENDANCE_NOT_OPEN', status: 409, expected: /Chưa đến hoặc đã hết thời gian mở cửa sổ điểm danh/i },
    { code: 'NOT_REGISTERED', status: 403, expected: /Bạn chưa đăng ký giữ chỗ sự kiện này/i },
    { code: 'ALREADY_CHECKED_IN', status: 409, expected: /Bạn đã điểm danh sự kiện này rồi/i },
  ])('9. Ánh xạ mã lỗi $code từ server sang thông báo tiếng Việt rõ ràng', async ({ code, status, expected }) => {
    mockGeolocationSuccess(13.7589, 109.2183, 10.0);
    vi.spyOn(eventsApi, 'checkInGps').mockRejectedValueOnce(
      new ApiErrorException(status, { code, message: 'Server message' })
    );

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
  });

  it('10. Vô hiệu hóa nút điểm danh GPS khi cửa sổ điểm danh chưa mở (attendanceOpen=false)', () => {
    renderWithProviders(
      <AttendanceSlot eventId="evt-gps-201" event={{ ...mockGpsEvent, attendanceOpen: false }} />
    );

    expect(screen.getByText(/Chưa đến hoặc đã hết giờ mở điểm danh/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i })).toBeDisabled();
  });

  it('11. Khôi phục bộ đếm 2/3 và trạng thái ACCEPTED từ server sau khi tải lại trang (F5) ở chế độ GPS', async () => {
    vi.spyOn(eventsApi, 'fetchMyAttendance').mockResolvedValueOnce({
      status: 'NOT_CHECKED_IN',
      acceptedAt: null,
      attemptCount: 2,
      maxAttempts: 3,
      remainingAttempts: 1,
      canRetry: true,
    });

    const { unmount } = renderWithProviders(
      <AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('attempt-counter-badge')).toHaveTextContent('Lượt gửi xác nhận: 2/3');
    });
    expect(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i })).toBeEnabled();

    unmount();

    vi.spyOn(eventsApi, 'fetchMyAttendance').mockResolvedValueOnce({
      status: 'ACCEPTED',
      acceptedAt: '2026-11-28T08:05:00Z',
      attemptCount: 1,
      maxAttempts: 3,
      remainingAttempts: 2,
      canRetry: false,
    });

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);

    expect(await screen.findByText(/Điểm danh thành công!/i)).toBeInTheDocument();
    expect(screen.queryByTestId('attempt-counter-badge')).not.toBeInTheDocument();
  });

  it('12. [P2] Khi mất kết nối mạng (không có phản hồi server), bấm "Gửi lại yêu cầu trước" giữ nguyên payload và Idempotency-Key cũ mà không gọi lại GPS', async () => {
    const geoSpy = mockGeolocationSuccess(13.75944, 109.2183, 10.0);
    const checkInGpsSpy = vi
      .spyOn(eventsApi, 'checkInGps')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        status: 'ACCEPTED',
        acceptedAt: '2026-11-28T08:06:00Z',
        distanceMeters: 12.0,
        allowedRadiusMeters: 60,
      });

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);

    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Mất kết nối mạng khi gửi điểm danh GPS/i);
    expect(geoSpy).toHaveBeenCalledTimes(1);
    expect(checkInGpsSpy).toHaveBeenCalledTimes(1);

    const retryBtn = screen.getByRole('button', { name: /Gửi lại yêu cầu trước/i });
    expect(retryBtn).toBeEnabled();
    expect(screen.getByRole('button', { name: /Lấy vị trí mới/i })).toBeEnabled();

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/Điểm danh thành công!/i)).toBeInTheDocument();
    });

    expect(geoSpy).toHaveBeenCalledTimes(1); // Không gọi lại GPS khi gửi lại yêu cầu cũ
    expect(checkInGpsSpy).toHaveBeenCalledTimes(2);
    const [firstEventId, firstPayload, firstKey] = checkInGpsSpy.mock.calls[0];
    const [secondEventId, secondPayload, secondKey] = checkInGpsSpy.mock.calls[1];
    expect(secondEventId).toBe(firstEventId);
    expect(secondPayload).toEqual(firstPayload);
    expect(secondKey).toBe(firstKey);
  });

  it('13. [P2] Bấm "Lấy vị trí mới" hoặc bắt đầu lượt mới sau phản hồi 422 từ server sẽ tạo Idempotency-Key mới', async () => {
    const geoSpy = mockGeolocationSuccess(13.75944, 109.2183, 10.0);
    const checkInGpsSpy = vi
      .spyOn(eventsApi, 'checkInGps')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(
        new ApiErrorException(422, {
          code: 'GPS_OUT_OF_RANGE',
          message: 'Ngoài phạm vi',
          details: {
            method: 'GPS',
            attemptCount: 1,
            maxAttempts: 3,
            remainingAttempts: 2,
            canRetry: true,
            distanceMeters: 60.04,
            allowedRadiusMeters: 60,
          },
        })
      )
      .mockResolvedValueOnce({
        status: 'ACCEPTED',
        acceptedAt: '2026-11-28T08:07:00Z',
        distanceMeters: 8.5,
        allowedRadiusMeters: 60,
      });

    renderWithProviders(<AttendanceSlot eventId="evt-gps-201" event={mockGpsEvent} />);

    // Lần 1: lỗi mạng -> giữ pending
    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));
    await screen.findByRole('button', { name: /Lấy vị trí mới/i });

    // Lần 2: sinh viên chủ động chọn "Lấy vị trí mới" -> phải lấy GPS mới + key mới -> server trả 422 (có phản hồi)
    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí mới/i }));
    await waitFor(() => {
      expect(screen.getByTestId('attempt-counter-badge')).toHaveTextContent('Lượt gửi xác nhận: 1/3');
    });
    expect(screen.queryByRole('button', { name: /Gửi lại yêu cầu trước/i })).not.toBeInTheDocument();

    // Lần 3: bắt đầu lượt mới sau 422 -> phải tạo key mới nữa
    fireEvent.click(screen.getByRole('button', { name: /Lấy vị trí & Điểm danh GPS/i }));
    await waitFor(() => {
      expect(screen.getByText(/Điểm danh thành công!/i)).toBeInTheDocument();
    });

    expect(geoSpy).toHaveBeenCalledTimes(3);
    expect(checkInGpsSpy).toHaveBeenCalledTimes(3);
    const key1 = checkInGpsSpy.mock.calls[0][2];
    const key2 = checkInGpsSpy.mock.calls[1][2];
    const key3 = checkInGpsSpy.mock.calls[2][2];
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
    expect(key3).not.toBe(key2);
  });
});
