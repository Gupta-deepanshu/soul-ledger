import { act, fireEvent, render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { LiveBoard } from "@/components/live/LiveBoard";
import { objectivesLeft } from "@/lib/deadlock/objectives";
import type { LiveBoardData, LiveMatchView } from "@/lib/deadlock/live-view";
import { mockFetch } from "@/test/fetch-mock";

let searchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
  usePathname: () => "/live",
}));

// The title animation (GSAP) and the WebGPU background aren't what's under test.
jest.mock("@/components/ui/InkTitle", () => ({
  InkTitle: ({ parts }: { parts: (string | { text: string })[] }) => (
    <h1>{parts.map((p) => (typeof p === "string" ? p : p.text)).join("")}</h1>
  ),
}));
jest.mock("@/components/ui/HeroBackground", () => ({ HeroBackground: () => null }));

const FULL = 0xffff;
const NOW = 1_793_450_000;

function match(id: number, overrides: Partial<LiveMatchView> = {}): LiveMatchView {
  return {
    id,
    startTime: NOW - 900,
    ranked: true,
    region: "europe",
    souls: { 0: 30_000, 1: 25_000 },
    spectators: 10,
    heroes: { 0: [1, 2, 3, 4, 5, 6], 1: [7, 8, 9, 10, 11, 12] },
    objectives: { 0: objectivesLeft(FULL), 1: objectivesLeft(FULL) },
    masks: { 0: FULL, 1: FULL },
    avgRank: { tier: 5, subrank: 2, name: "Ritualist" },
    ...overrides,
  };
}

function board(matches: LiveMatchView[]): LiveBoardData {
  return {
    fetchedAt: NOW,
    dataAt: NOW,
    matches,
    heroes: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, { name: `Hero ${i + 1}`, iconUrl: null }])),
    rankOptions: [
      { value: "all", label: "All ranks" },
      { value: "8", label: "Oracle+" },
    ],
  };
}

/** Each test gets a fresh SWR cache. */
function renderBoard(initial: LiveBoardData | null) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <LiveBoard initial={initial} sample={false} />
    </SWRConfig>,
  );
}

beforeEach(() => {
  searchParams = new URLSearchParams();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("LiveBoard", () => {
  it("shows the loading skeleton while the first poll is on its way", () => {
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    const { container } = renderBoard(null);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("shows the busy countdown when the first poll gets a 503", async () => {
    mockFetch({ status: 503, headers: { "Retry-After": "7" } });
    renderBoard(null);
    expect(await screen.findByText("The ledger is busy, trying again in 7s")).toBeInTheDocument();
  });

  it("shows an error with a retry when the first poll fails", async () => {
    const fetch = mockFetch({ status: 500 }, { body: board([match(1)]) });
    renderBoard(null);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this section.");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    });
    expect(await screen.findByText(/1 game underway/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("says when there are no live matches", () => {
    renderBoard(board([]));
    expect(screen.getByText("No live matches right now. This list refreshes every 30 seconds.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show all matches/i })).not.toBeInTheDocument();
  });

  it("says when the filters hide every match, with a way to clear them", () => {
    searchParams = new URLSearchParams("rank=8");
    jest.spyOn(window.history, "replaceState").mockImplementation(() => {});
    renderBoard(board([match(1), match(2)]));
    expect(screen.getByText("No live matches at this rank in this region right now.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show all matches/i }));
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it("lists matches from the server render without waiting for a poll", () => {
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
    renderBoard(board([match(1), match(2), match(3)]));
    expect(screen.getByText(/3 games underway/)).toBeInTheDocument();
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href") === "/matches/1")).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("pages the list 12 at a time", () => {
    // 1 featured + 12 shown + 2 left.
    renderBoard(board(Array.from({ length: 15 }, (_, i) => match(i + 1))));
    fireEvent.click(screen.getByRole("button", { name: "Show more matches (2 left)" }));
    expect(screen.queryByRole("button", { name: /show more matches/i })).not.toBeInTheDocument();
  });
});
