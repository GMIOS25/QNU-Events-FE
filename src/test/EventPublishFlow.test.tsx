import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EventDetailPage } from '../features/events/EventDetailPage';
import { ApiErrorException } from '../api/client';
import * as eventsApi from '../api/events';
import type { EventDetail } from '../features/events/types';

vi.mock('../api/events', () => ({
  fetchEvent: vi.fn(),
  previewEvent: vi.fn(),
  publishEvent: vi.fn(),
  fetchMyRegistration: vi.fn(),
  registerEvent: vi.fn(),
  checkInQr: vi.fn(),
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-1', roles: ['EVENT_OWNER'] },
    hasRole: (role: string) => role === 'EVENT_OWNER',
  }),
}));

const draftEvent: EventDetail = {
  id: 'evt-draft',
  title: 'Hội thảo AI',
  location: 'Hội trường B',
  startAt: '2026-12-15T09:00:00Z',
  endAt: '2026-12-15T11:00:00Z',
  registrationDeadline: '2026-12-14T23:59:59Z',
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

// Khác version của sự kiện để phát hiện việc gửi nhầm version thay vì previewVersion.
const PREVIEW_VERSION = 7;

function renderDraftDetailPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/events/evt-draft']}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function openPreviewModal() {
  fireEvent.click(await screen.findByRole('button', { name: /Xem trước & Công bố/i }));
  return screen.findByRole('button', { name: /Xác nhận công bố/i });
}

async function confirmAndPublish() {
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /Xác nhận công bố/i }));
}

describe('EventDetailPage publish flow [QE-65]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(eventsApi.fetchEvent).mockResolvedValue(draftEvent);
    vi.mocked(eventsApi.previewEvent).mockResolvedValue({
      event: draftEvent,
      previewVersion: PREVIEW_VERSION,
    });
  });

  it('loads the preview and keeps publish disabled until the owner confirms', async () => {
    renderDraftDetailPage();
    const confirmButton = await openPreviewModal();

    expect(eventsApi.previewEvent).toHaveBeenCalledTimes(1);
    expect(eventsApi.previewEvent).toHaveBeenCalledWith('evt-draft');
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    fireEvent.click(confirmButton);

    expect(eventsApi.publishEvent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => expect(confirmButton).toBeEnabled());
    expect(eventsApi.publishEvent).not.toHaveBeenCalled();
  });

  it('publishes exactly once with confirm: true and the previewVersion returned by preview', async () => {
    vi.mocked(eventsApi.publishEvent).mockResolvedValue({ ...draftEvent, status: 'PUBLISHED' });

    renderDraftDetailPage();
    await openPreviewModal();

    await confirmAndPublish();

    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument());
    expect(eventsApi.publishEvent).toHaveBeenCalledTimes(1);
    expect(eventsApi.publishEvent).toHaveBeenCalledWith('evt-draft', {
      confirm: true,
      previewVersion: PREVIEW_VERSION,
    });
  });

  it.each([
    { code: 'PREVIEW_REQUIRED', message: 'Bạn cần xem trước sự kiện trước khi công bố.' },
    { code: 'PREVIEW_OUTDATED', message: 'Bản xem trước đã cũ do có sự thay đổi. Vui lòng xem trước lại.' },
  ])('shows "$message" when publish is rejected with $code', async ({ code, message }) => {
    const serverMessage = `Lỗi máy chủ: ${code}`;
    vi.mocked(eventsApi.publishEvent).mockRejectedValue(new ApiErrorException(409, { code, message: serverMessage }));

    renderDraftDetailPage();
    await openPreviewModal();

    await confirmAndPublish();

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(message);
    expect(banner).not.toHaveTextContent(serverMessage);
  });

  it('shows the preview error in a banner and does not offer to confirm the publish', async () => {
    const serverMessage = 'Bạn không có quyền xem trước sự kiện này.';
    vi.mocked(eventsApi.previewEvent).mockRejectedValue(
      new ApiErrorException(403, { code: 'FORBIDDEN', message: serverMessage })
    );

    renderDraftDetailPage();
    fireEvent.click(await screen.findByRole('button', { name: /Xem trước & Công bố/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(serverMessage);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(eventsApi.publishEvent).not.toHaveBeenCalled();
  });
});
