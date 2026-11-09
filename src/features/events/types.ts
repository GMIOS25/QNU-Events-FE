export interface EventUpsert {
  title: string;
  description?: string;
  location: string;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  attendanceOpenAt: string;
  attendanceCloseAt: string;
  attendanceMethod: 'DYNAMIC_QR';
  quotaTotal: number;
  audienceClassIds: string[];
  activityType: string;
  activityPoints: number;
  version?: number;
}

export interface EventSummary {
  id: string;
  title: string;
  location: string;
  startAt: string;
  endAt: string;
  quotaTotal: number;
  registeredCount: number;
  remainingQuota: number;
  registrationOpen: boolean;
  attendanceOpen: boolean;
  myRegistrationStatus?: 'REGISTERED' | 'CANCELLED' | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  activityType: string;
  activityPoints: number;
}

export interface EventDetail extends EventSummary {
  description?: string;
  registrationDeadline: string;
  attendanceOpenAt: string;
  attendanceCloseAt: string;
  attendanceMethod: 'DYNAMIC_QR';
  qrRotationSeconds: number;
  qrGraceSeconds: number;
  ownerId: string;
  audienceClassIds: string[];
  version: number;
  previewedVersion?: number;
  publishedAt?: string;
}

export interface PreviewResponse {
  event: EventDetail;
  previewVersion: number;
}

export interface PublishRequest {
  confirm: boolean;
  previewVersion: number;
}

export interface OrgClass {
  id: string;
  code: string;
  name: string;
  faculty: string;
  cohort: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface RegistrationResponse {
  id: string;
  status: string;
  cached: boolean;
}

export interface MyRegistrationResponse {
  id: string;
  status: string;
  registeredAt: string;
}

export interface EventQrResponse {
  token: string;
  epoch: number;
  validUntil: string;
  rotationSeconds: number;
  serverTime: string;
}

export interface CheckInRequest {
  token: string;
}

export interface CheckInResponse {
  status: string;
  acceptedAt: string;
}

export interface HistoryItem {
  eventId: string;
  title: string;
  startAt: string;
  location: string;
  registrationStatus: 'REGISTERED' | 'CANCELLED';
  registeredAt: string;
  attendanceStatus: 'NOT_CHECKED_IN' | 'ACCEPTED';
  attendanceAt?: string;
  method: 'DYNAMIC_QR';
  activityType: string;
  activityPoints: number;
}
