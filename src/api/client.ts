export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type ParseAs = 'json' | 'blob' | 'void';

type ApiRequestOptions = {
  body?: unknown;
  formData?: FormData;
  headers?: HeadersInit;
  method?: string;
  parseAs?: ParseAs;
  signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function errorMessageFromDetails(details: unknown, fallback: string) {
  if (isRecord(details)) {
    const detail = details.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length) return JSON.stringify(detail);
    const message = details.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof details === 'string' && details.trim()) return details;
  return fallback;
}

async function readResponseDetails(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }
  try {
    return await response.text();
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body: BodyInit | undefined;

  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    body,
    credentials: 'include',
    headers,
    method: options.method || (body ? 'POST' : 'GET'),
    signal: options.signal,
  });

  if (!response.ok) {
    const details = await readResponseDetails(response);
    throw new ApiError(response.status, errorMessageFromDetails(details, `HTTP ${response.status}`), details);
  }

  if (options.parseAs === 'void' || response.status === 204) {
    return undefined as T;
  }

  if (options.parseAs === 'blob') {
    return response.blob() as Promise<T>;
  }

  return response.json() as Promise<T>;
}
