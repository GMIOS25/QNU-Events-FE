export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
  timestamp?: string;
}

export class ApiErrorException extends Error {
  public readonly apiError: ApiError;
  public readonly status: number;

  constructor(status: number, apiError: ApiError) {
    super(apiError.message || `Lỗi máy chủ (${status})`);
    this.name = 'ApiErrorException';
    this.status = status;
    this.apiError = apiError;
  }
}

let tokenProvider: (() => string | null) | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function setTokenProvider(provider: () => string | null) {
  tokenProvider = provider;
}

export function setOnUnauthorizedHandler(handler: () => void) {
  onUnauthorizedHandler = handler;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  const { idempotencyKey, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const token = tokenProvider ? tokenProvider() : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const url = endpoint.startsWith('http') ? endpoint : endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(url, {
    ...restOptions,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    let errorData: ApiError = {
      code: 'UNKNOWN_ERROR',
      message: `Yêu cầu thất bại với mã trạng thái ${response.status}`,
    };

    if (isJson) {
      try {
        errorData = await response.json();
      } catch {
        // Fallback to default errorData
      }
    }

    if (response.status === 401 && onUnauthorizedHandler) {
      onUnauthorizedHandler();
    }

    throw new ApiErrorException(response.status, errorData);
  }

  if (isJson) {
    return response.json() as Promise<T>;
  }

  return response.text() as unknown as Promise<T>;
}

