import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlayerSearch } from "@/components/players/PlayerSearch";
import type { SearchResult, SearchRow } from "@/lib/deadlock/search";
import { mockFetch } from "@/test/fetch-mock";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: jest.fn() }),
  usePathname: () => "/players",
}));

const row = (overrides: Partial<SearchRow> = {}): SearchRow => ({
  accountId: 1160721308,
  name: "Yoshi",
  initials: "Y",
  avatarUrl: null,
  rank: { name: "Oracle", numeral: "III", imageUrl: null },
  matches30d: 42,
  lastRankedAt: null,
  ...overrides,
});

const result = (query: string, rows: SearchRow[], extra: Partial<SearchResult> = {}): SearchResult => ({
  query,
  accountId: null,
  vanity: false,
  rows,
  ...extra,
});

const input = () => screen.getByRole("searchbox", { name: /steam name, id or profile link/i });
const type = (text: string) => fireEvent.change(input(), { target: { value: text } });

beforeEach(() => {
  push.mockClear();
  window.localStorage.clear();
  jest.spyOn(window.history, "replaceState").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("PlayerSearch", () => {
  it("searches after typing pauses and lists the players found", async () => {
    const fetch = mockFetch({ body: result("Yoshi", [row()]) });
    render(<PlayerSearch initialQuery="" initialResult={null} />);
    type("Yoshi");
    expect(fetch).not.toHaveBeenCalled();

    expect(await screen.findByText("1 player for “Yoshi”")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("/api/players/search?q=Yoshi");

    const link = screen.getByRole("link", { name: /yoshi/i });
    expect(link).toHaveAttribute("href", "/players/1160721308");
    expect(link).toHaveTextContent("Oracle");
    expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "?q=Yoshi");
  });

  it("doesn't search a single letter", async () => {
    const fetch = mockFetch({ body: result("Y", []) });
    render(<PlayerSearch initialQuery="" initialResult={null} />);
    type("Y");
    await new Promise((r) => setTimeout(r, 600));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the server-rendered result without fetching again", async () => {
    const fetch = mockFetch({ body: result("Yoshi", []) });
    render(<PlayerSearch initialQuery="Yoshi" initialResult={result("Yoshi", [row()])} />);
    expect(screen.getByText("1 player for “Yoshi”")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 600));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("explains an empty result", async () => {
    mockFetch({ body: result("nobody", []) });
    render(<PlayerSearch initialQuery="" initialResult={null} />);
    type("nobody");
    expect(await screen.findByText(/No active players match “nobody”/)).toBeInTheDocument();
  });

  it("offers the profile link when an id matched no search rows", async () => {
    render(<PlayerSearch initialQuery="123" initialResult={result("123", [], { accountId: 123 })} />);
    expect(screen.getByRole("link", { name: /open the profile for id 123/i })).toHaveAttribute("href", "/players/123");
  });

  it("explains vanity links", () => {
    render(
      <PlayerSearch
        initialQuery="steamcommunity.com/id/yoshi"
        initialResult={result("yoshi", [row()], { vanity: true })}
      />,
    );
    expect(screen.getByText(/Custom profile links can't be looked up directly/)).toBeInTheDocument();
  });

  it("shows the busy countdown when the API is busy", async () => {
    mockFetch({ status: 503, headers: { "Retry-After": "5" } });
    render(<PlayerSearch initialQuery="" initialResult={null} />);
    type("Yoshi");
    expect(await screen.findByText("The ledger is busy, trying again in 5s")).toBeInTheDocument();
  });

  it("shows an error with a retry that searches again", async () => {
    const fetch = mockFetch({ status: 500 }, { body: result("Yoshi", [row()]) });
    render(<PlayerSearch initialQuery="" initialResult={null} />);
    type("Yoshi");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this section.");

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("1 player for “Yoshi”")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("opens the profile straight away when an id is submitted", async () => {
    const fetch = mockFetch({ body: result("x", []) });
    render(<PlayerSearch initialQuery="" initialResult={null} />);
    type("[U:1:1160721308]");
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/players/1160721308"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("remembers submitted searches in this browser and can clear them", async () => {
    mockFetch({ body: result("Yoshi", [row()]) });
    render(<PlayerSearch initialQuery="" initialResult={null} />);
    type("Yoshi");
    fireEvent.submit(screen.getByRole("search"));

    expect(await screen.findByRole("button", { name: "Yoshi" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("soul-ledger:recent") ?? "[]")).toEqual(["Yoshi"]);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByRole("button", { name: "Yoshi" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem("soul-ledger:recent")).toBeNull();
  });
});
