// The API client's error handling: each HTTP failure becomes the right
// ApiFailure kind, so pages can show the busy / not-found / error states.
// `fetch` is mocked; nothing reaches the real API.

import { z } from "zod";
import { DeadlockApiError, deadlockFetch, deadlockFetchTimed, toApiFailure } from "@/lib/deadlock/client";

const schema = z.array(z.object({ id: z.number() }));

function respond(status: number, body: unknown = [], headers: Record<string, string> = {}) {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status, headers }));
}

async function failureOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return toApiFailure(error);
  }
  throw new Error("expected the request to fail");
}

const originalSource = process.env.DATA_SOURCE;

beforeEach(() => {
  delete process.env.DATA_SOURCE;
});

afterEach(() => {
  jest.restoreAllMocks();
  process.env.DATA_SOURCE = originalSource;
});

describe("deadlockFetch (live)", () => {
  it("returns parsed data and builds the query string", async () => {
    respond(200, [{ id: 1, extra: "stripped" }]);
    await expect(deadlockFetch("/v1/test", schema, { query: { a: 1, b: undefined, c: true } })).resolves.toEqual([{ id: 1 }]);
    const url = new URL(String((globalThis.fetch as jest.Mock).mock.calls[0][0]));
    expect(url.origin).toBe("https://api.deadlock-api.com");
    expect(url.pathname).toBe("/v1/test");
    expect(url.search).toBe("?a=1&c=true");
  });

  it.each([
    [503, "busy"],
    [429, "busy"],
    [504, "timeout"],
    [404, "not-found"],
    [500, "http"],
  ])("maps HTTP %d to %s", async (status, kind) => {
    respond(status, {}, { "retry-after": "30" });
    const failure = await failureOf(deadlockFetch("/v1/test", schema));
    expect(failure).toEqual({ kind, status, retryAfter: 30 });
  });

  it("reports a network failure", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    expect(await failureOf(deadlockFetch("/v1/test", schema))).toEqual({ kind: "network", status: null, retryAfter: null });
  });

  it("reports a response that doesn't match the schema as invalid", async () => {
    respond(200, [{ id: "not a number" }]);
    expect((await failureOf(deadlockFetch("/v1/test", schema)))?.kind).toBe("invalid");
  });

  it("dates the data by the Age header", async () => {
    respond(200, [], { age: "120" });
    const now = Math.floor(Date.now() / 1000);
    const { producedAt } = await deadlockFetchTimed("/v1/test", schema);
    expect(producedAt).toBeGreaterThanOrEqual(now - 121);
    expect(producedAt).toBeLessThanOrEqual(now - 119);
  });
});

describe("deadlockFetch (fixtures)", () => {
  beforeEach(() => {
    process.env.DATA_SOURCE = "fixtures";
  });

  it("reads the saved fixture for a path without calling the API", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch");
    const data = await deadlockFetch("/v1/matches/128149655/metadata", z.object({ match_info: z.object({ match_id: z.number() }) }));
    expect(data.match_info.match_id).toBe(128149655);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is not-found when there is no fixture", async () => {
    expect((await failureOf(deadlockFetch("/v1/nothing-here", schema)))?.kind).toBe("not-found");
  });
});

describe("toApiFailure", () => {
  it("reads failure details back from a digest (errors from \"use cache\")", () => {
    const original = new DeadlockApiError({ kind: "busy", status: 503, retryAfter: null }, "test");
    const rethrown = Object.assign(new Error("omitted in production builds"), { digest: original.digest });
    expect(toApiFailure(rethrown)).toEqual({ kind: "busy", status: 503, retryAfter: null });
  });

  it("returns null for unrelated errors", () => {
    expect(toApiFailure(new Error("boom"))).toBeNull();
    expect(toApiFailure("boom")).toBeNull();
  });
});
