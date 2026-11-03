import { act, fireEvent, render, screen } from "@testing-library/react";
import { SectionError } from "@/components/ui/SectionError";
import type { ApiFailure } from "@/lib/deadlock/client";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => "/test",
}));

const busy = (retryAfter: number | null): ApiFailure => ({ kind: "busy", status: 503, retryAfter });

// Retry counts are kept per section across remounts, so each test uses its own key.
let key = 0;
const nextKey = () => `section-${++key}`;

beforeEach(() => {
  jest.useFakeTimers();
  refresh.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe("SectionError", () => {
  it("shows a generic error with a Try again button that calls onRetry", () => {
    const onRetry = jest.fn();
    render(<SectionError failure={{ kind: "http", status: 500, retryAfter: null }} onRetry={onRetry} retryKey={nextKey()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load this section.");
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes the page on retry when no onRetry is given", () => {
    render(<SectionError failure={null} retryKey={nextKey()} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("explains a timeout and offers no retry", () => {
    render(<SectionError failure={{ kind: "timeout", status: 504, retryAfter: null }} retryKey={nextKey()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/time limit/);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("counts down a busy wait, then retries by itself", () => {
    const onRetry = jest.fn();
    render(<SectionError failure={busy(3)} onRetry={onRetry} retryKey={nextKey()} />);
    expect(screen.getByText("The ledger is busy, trying again in 3s")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    advance(1000);
    expect(screen.getByText("The ledger is busy, trying again in 2s")).toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();

    advance(2000);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("waits 10 s when a busy response has no Retry-After", () => {
    render(<SectionError failure={busy(null)} onRetry={() => {}} retryKey={nextKey()} />);
    expect(screen.getByText("The ledger is busy, trying again in 10s")).toBeInTheDocument();
  });

  it("caps the wait at 60 s", () => {
    render(<SectionError failure={busy(600)} onRetry={() => {}} retryKey={nextKey()} />);
    expect(screen.getByText("The ledger is busy, trying again in 60s")).toBeInTheDocument();
  });

  it("stops retrying after 3 attempts and shows the busy error with a button", () => {
    const onRetry = jest.fn();
    render(<SectionError failure={busy(1)} onRetry={onRetry} retryKey={nextKey()} />);
    for (let i = 0; i < 3; i++) advance(1000);
    expect(onRetry).toHaveBeenCalledTimes(3);

    expect(screen.getByRole("alert")).toHaveTextContent("The data source is busy right now. Try again in 1 s.");
    advance(5000);
    expect(onRetry).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(4);
  });

  it("remembers the retry count when the section remounts", () => {
    const retryKey = nextKey();
    const onRetry = jest.fn();
    const first = render(<SectionError failure={busy(1)} onRetry={onRetry} retryKey={retryKey} />);
    for (let i = 0; i < 3; i++) advance(1000);
    first.unmount();

    render(<SectionError failure={busy(1)} onRetry={onRetry} retryKey={retryKey} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
