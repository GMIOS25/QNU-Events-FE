import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EventFormPage } from '../features/events/EventFormPage';
import { ApiErrorException } from '../api/client';
import * as eventsApi from '../api/events';
import type { EventDetail, OrgClass } from '../features/events/types';

vi.mock('../api/events', () => ({
  fetchEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  fetchClasses: vi.fn(),
}));

const classes: OrgClass[] = [
  { id: 'cls-1', code: 'K49CNTT1', name: 'Công nghệ thông tin K49 A', facultyName: 'Công nghệ thông tin' },
  { id: 'cls-2', code: 'K49CNTT2', name: 'Công nghệ thông tin K49 B', facultyName: 'Công nghệ thông tin' },
];

const existingEvent: EventDetail = {
  id: 'evt-1',
  title: 'Hội thảo AI',
  description: 'Nội dung mô tả',
  location: 'Hội trường B',
  startAt: '2026-12-15T09:00:00Z',
  endAt: '2026-12-15T11:00:00Z',
  registrationDeadline: '2026-12-14T23:59:00Z',
  attendanceOpenAt: '2026-12-15T08:45:00Z',
  attendanceCloseAt: '2026-12-15T11:15:00Z',
  attendanceMethod: 'DYNAMIC_QR',
  qrRotationSeconds: 10,
  qrGraceSeconds: 3,
  quotaTotal: 50,
  registeredCount: 0,
  remainingQuota: 50,
  registrationOpen: false,
  attendanceOpen: false,
  status: 'DRAFT',
  activityType: 'Hội thảo khoa học',
  activityPoints: 5,
  ownerId: 'owner-1',
  audienceClassIds: ['cls-1'],
  version: 3,
};

function renderEditPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/events/evt-1/edit']}>
        <Routes>
          <Route path="/events/:id/edit" element={<EventFormPage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function openHydratedEditPage() {
  renderEditPage();
  expect(await screen.findByRole('heading', { name: 'Chỉnh sửa sự kiện' })).toBeInTheDocument();
  await screen.findByDisplayValue(existingEvent.title);
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));
}

describe('EventFormPage edit flow [QE-65]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(eventsApi.fetchEvent).mockResolvedValue(existingEvent);
    vi.mocked(eventsApi.fetchClasses).mockResolvedValue(classes);
    vi.mocked(eventsApi.updateEvent).mockResolvedValue({ ...existingEvent, version: 4 });
  });

  it('sends the loaded version when saving changes to an existing event', async () => {
    await openHydratedEditPage();

    clickSave();

    await waitFor(() => expect(eventsApi.updateEvent).toHaveBeenCalledTimes(1));
    expect(eventsApi.updateEvent).toHaveBeenCalledWith('evt-1', expect.objectContaining({ version: 3 }));
    expect(eventsApi.createEvent).not.toHaveBeenCalled();
  });

  it('asks to reload the page when the event was changed by someone else (VERSION_CONFLICT)', async () => {
    vi.mocked(eventsApi.updateEvent).mockRejectedValue(
      new ApiErrorException(409, { code: 'VERSION_CONFLICT', message: 'Phiên bản sự kiện không khớp.' })
    );
    await openHydratedEditPage();

    clickSave();

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Dữ liệu sự kiện đã bị thay đổi bởi người khác. Vui lòng tải lại trang và thử lại.');
    expect(banner).not.toHaveTextContent('Phiên bản sự kiện không khớp.');
  });

  it('shows the server error of the invalid field (details.fields)', async () => {
    vi.mocked(eventsApi.updateEvent).mockRejectedValue(
      new ApiErrorException(400, {
        code: 'VALIDATION_FAILED',
        message: 'Dữ liệu gửi lên không hợp lệ.',
        details: { fields: { endAt: 'Thời gian kết thúc phải sau thời gian bắt đầu.' } },
      })
    );
    await openHydratedEditPage();

    clickSave();

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Thời gian kết thúc phải sau thời gian bắt đầu.');
  });

  it('allows switching to GPS attendance method and sends gpsLat, gpsLng, allowedRadiusMeters [QE-55]', async () => {
    await openHydratedEditPage();

    fireEvent.click(screen.getByRole('radio', { name: /Vị trí GPS/i }));

    expect(screen.getByTestId('gps-config-section')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('VD: 13.758900'), { target: { value: '13.7589' } });
    fireEvent.change(screen.getByPlaceholderText('VD: 109.218300'), { target: { value: '109.2183' } });
    fireEvent.change(screen.getByPlaceholderText('60'), { target: { value: '80' } });

    clickSave();

    await waitFor(() => expect(eventsApi.updateEvent).toHaveBeenCalledTimes(1));
    expect(eventsApi.updateEvent).toHaveBeenCalledWith(
      'evt-1',
      expect.objectContaining({
        attendanceMethod: 'GPS',
        gpsLat: 13.7589,
        gpsLng: 109.2183,
        allowedRadiusMeters: 80,
        version: 3,
      })
    );
  });

  it('validates GPS radius range (10..1000m) before submitting [QE-55]', async () => {
    await openHydratedEditPage();

    fireEvent.click(screen.getByRole('radio', { name: /Vị trí GPS/i }));
    fireEvent.change(screen.getByPlaceholderText('VD: 13.758900'), { target: { value: '13.7589' } });
    fireEvent.change(screen.getByPlaceholderText('VD: 109.218300'), { target: { value: '109.2183' } });
    fireEvent.change(screen.getByPlaceholderText('60'), { target: { value: '5' } });

    const form = screen.getByRole('button', { name: /Lưu thay đổi/i }).closest('form')!;
    fireEvent.submit(form);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Bán kính điểm danh GPS phải là số nguyên từ 10 đến 1000 mét.');
    expect(eventsApi.updateEvent).not.toHaveBeenCalled();
  });

  it('fills gpsLat and gpsLng when clicking "Lấy tọa độ hiện tại" [QE-55]', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 13.7589123,
          longitude: 109.2183456,
          accuracy: 8,
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

    await openHydratedEditPage();
    fireEvent.click(screen.getByRole('radio', { name: /Vị trí GPS/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lấy tọa độ hiện tại/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('VD: 13.758900')).toHaveValue(13.758912);
      expect(screen.getByPlaceholderText('VD: 109.218300')).toHaveValue(109.218346);
    });
  });

  it('shows error banner if geolocation fails when clicking "Lấy tọa độ hiện tại" [QE-55]', async () => {
    const getCurrentPosition = vi.fn((_s: PositionCallback, error?: PositionErrorCallback) => {
      if (error) {
        error({
          code: 1,
          message: 'Denied',
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

    await openHydratedEditPage();
    fireEvent.click(screen.getByRole('radio', { name: /Vị trí GPS/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lấy tọa độ hiện tại/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/từ chối quyền truy cập vị trí/i);
  });

  it('hydrates an existing GPS draft event with its coordinates and radius in edit mode [QE-55]', async () => {
    vi.mocked(eventsApi.fetchEvent).mockResolvedValue({
      ...existingEvent,
      attendanceMethod: 'GPS',
      gpsLat: 13.7589,
      gpsLng: 109.2183,
      allowedRadiusMeters: 120,
    });

    await openHydratedEditPage();

    expect(screen.getByRole('radio', { name: /Vị trí GPS/i })).toBeChecked();
    expect(screen.getByPlaceholderText('VD: 13.758900')).toHaveValue(13.7589);
    expect(screen.getByPlaceholderText('VD: 109.218300')).toHaveValue(109.2183);
    expect(screen.getByPlaceholderText('60')).toHaveValue(120);
  });
});
