export const TIMEZONE = 'Asia/Ho_Chi_Minh';

export function formatDateTime(isoString: string | Date | undefined | null): string {
  if (!isoString) return '—';
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDate(isoString: string | Date | undefined | null): string {
  if (!isoString) return '—';
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatTime(isoString: string | Date | undefined | null): string {
  if (!isoString) return '—';
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

