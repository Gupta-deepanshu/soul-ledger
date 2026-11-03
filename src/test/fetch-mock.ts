// Fake `fetch` responses for component tests (jsdom has no fetch of its own).

export type FakeResponse = { status?: number; body?: unknown; headers?: Record<string, string> };

export function fakeResponse({ status = 200, body = null, headers = {} }: FakeResponse = {}): Response {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Response;
}

/** Replaces `fetch` with a mock answering each call with the next response (the last one repeats). */
export function mockFetch(...responses: FakeResponse[]): jest.Mock {
  let call = 0;
  const mock = jest.fn(async () => fakeResponse(responses[Math.min(call++, responses.length - 1)]));
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}
