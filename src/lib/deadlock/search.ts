// Player search: parse the query, search Steam profiles, add ranks. Server only
// (used by /api/players/search and the server render of /players?q=).

import { unstable_rethrow } from "next/navigation";
import { getAccountRanks, getPlayerSearch, getRanks } from "./api";
import { initialsOf } from "./player";
import { parsePlayerQuery } from "./steam-id";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

export type SearchRow = {
  accountId: number;
  name: string | null;
  initials: string;
  /** Steam avatar (64 px), or null to show the initials. */
  avatarUrl: string | null;
  /** null = unranked; undefined = rank lookup unavailable (shown as "—"). */
  rank?: { name: string; numeral: string; imageUrl: string | null } | null;
  matches30d: number | null;
  lastRankedAt: number | null;
};

export type SearchResult = {
  query: string;
  /** Set when the query was an id/link: Enter can open the profile directly. */
  accountId: number | null;
  /** The query was a steamcommunity.com/id/<name> link, searched as a name. */
  vanity: boolean;
  rows: SearchRow[];
};

export async function searchPlayers(raw: string): Promise<SearchResult> {
  const parsed = parsePlayerQuery(raw);
  if (parsed.kind === "empty") return { query: "", accountId: null, vanity: false, rows: [] };

  const accountId = parsed.kind === "id" ? parsed.accountId : null;
  let hits = await getPlayerSearch(parsed.kind === "id" ? String(parsed.accountId) : parsed.query, parsed.kind === "id");
  // An id search should only ever show that account.
  if (accountId != null) hits = hits.filter((h) => h.accountId === accountId);

  // Ranks are a nice-to-have: /v1/players/rank allows only 20 requests/min per IP.
  let ranks: Awaited<ReturnType<typeof getAccountRanks>> | null = null;
  let rankAssets: Awaited<ReturnType<typeof getRanks>> = [];
  if (hits.length > 0) {
    try {
      [ranks, rankAssets] = await Promise.all([getAccountRanks(hits.map((h) => h.accountId).sort((a, b) => a - b)), getRanks()]);
    } catch (error) {
      unstable_rethrow(error);
      ranks = null;
    }
  }

  const rows: SearchRow[] = hits.map((h) => {
    const r = ranks?.find((x) => x.accountId === h.accountId);
    const asset = r?.badge ? rankAssets.find((a) => a.tier === r.badge!.tier) : undefined;
    return {
      accountId: h.accountId,
      name: h.name,
      initials: initialsOf(h.name),
      avatarUrl: h.avatarUrl,
      rank:
        ranks == null
          ? undefined
          : r?.badge
            ? {
                name: asset?.name ?? `Tier ${r.badge.tier}`,
                numeral: ROMAN[r.badge.subrank - 1] ?? String(r.badge.subrank),
                imageUrl: asset?.subrankImageUrls[r.badge.subrank - 1] ?? asset?.imageUrl ?? null,
              }
            : null,
      matches30d: h.matches30d,
      lastRankedAt: r?.lastRankedAt ?? null,
    };
  });

  return { query: raw.trim(), accountId, vanity: parsed.kind === "name" && parsed.vanity, rows };
}
