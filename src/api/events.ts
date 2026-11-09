import { apiClient } from './client';
import { createIdempotencyKey } from '../lib/idempotency';
import type {
  EventUpsert,
  EventSummary,
  EventDetail,
  PreviewResponse,
  PublishRequest,
  OrgClass,
  Page,
  RegistrationResponse,
  MyRegistrationResponse,
  EventQrResponse,
  CheckInResponse,
  HistoryItem,
} from '../features/events/types';

export async function fetchEvents(params?: { q?: string; page?: number; size?: number }): Promise<Page<EventSummary>> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.page !== undefined) query.set('page', params.page.toString());
  if (params?.size !== undefined) query.set('size', params.size.toString());

  const qs = query.toString();
  return apiClient<Page<EventSummary>>(`/api/v1/events${qs ? `?${qs}` : ''}`);
}

export async function fetchEvent(id: string): Promise<EventDetail> {
  return apiClient<EventDetail>(`/api/v1/events/${id}`);
}

export async function createEvent(data: EventUpsert): Promise<EventDetail> {
  return apiClient<EventDetail>('/api/v1/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEvent(id: string, data: EventUpsert & { version: number }): Promise<EventDetail> {
  return apiClient<EventDetail>(`/api/v1/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function previewEvent(id: string): Promise<PreviewResponse> {
  return apiClient<PreviewResponse>(`/api/v1/events/${id}/preview`);
}

export async function publishEvent(id: string, data: PublishRequest): Promise<EventDetail> {
  return apiClient<EventDetail>(`/api/v1/events/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchClasses(): Promise<OrgClass[]> {
  return apiClient<OrgClass[]>('/api/v1/classes');
}

export async function registerEvent(eventId: string, key?: string): Promise<RegistrationResponse> {
  const idempotencyKey = key || createIdempotencyKey();
  return apiClient<RegistrationResponse>(`/api/v1/events/${eventId}/registrations`, {
    method: 'POST',
    idempotencyKey,
  });
}

export async function fetchMyRegistration(eventId: string): Promise<MyRegistrationResponse> {
  return apiClient<MyRegistrationResponse>(`/api/v1/events/${eventId}/registrations/me`);
}

export async function fetchEventQr(eventId: string): Promise<EventQrResponse> {
  return apiClient<EventQrResponse>(`/api/v1/events/${eventId}/qr`);
}

export async function checkInQr(eventId: string, token: string, key?: string): Promise<CheckInResponse> {
  const idempotencyKey = key || createIdempotencyKey();
  return apiClient<CheckInResponse>(`/api/v1/events/${eventId}/attendance/qr`, {
    method: 'POST',
    idempotencyKey,
    body: JSON.stringify({ token }),
  });
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  return apiClient<HistoryItem[]>('/api/v1/me/history');
}
