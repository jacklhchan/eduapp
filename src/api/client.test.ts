import { describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './client';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

describe('apiRequest', () => {
  it('returns a successful JSON response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, value: 42 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest<{ ok: boolean; value: number }>('/api/demo')).resolves.toEqual({ ok: true, value: 42 });
  });

  it('throws ApiError for non-2xx responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'Not allowed' }, 403)));

    await expect(apiRequest('/api/blocked')).rejects.toMatchObject({
      message: 'Not allowed',
      status: 403,
    } satisfies Partial<ApiError>);
  });

  it('always includes credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/session');

    expect(fetchMock).toHaveBeenCalledWith('/api/session', expect.objectContaining({ credentials: 'include' }));
  });

  it('does not force Content-Type for FormData uploads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const formData = new FormData();
    formData.append('child_id', 'child-test');

    await apiRequest('/api/ocr-review', { formData, method: 'POST' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(formData);
    expect(init.headers).toBeInstanceOf(Headers);
    expect((init.headers as Headers).has('Content-Type')).toBe(false);
  });
});
