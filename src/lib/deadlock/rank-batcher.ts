// Coalesces player-rank lookups made in the same tick into as few
// /v1/players/rank requests as possible. That endpoint allows 20 requests a
// minute per IP, so per-match cache misses (one per new live match) must not
// each make their own request. Holds requests for one tick only — nothing is
// kept between requests, so it's safe on serverless.

import { deadlockFetch } from "./client";
import { mapPlayerRanks } from "./mappers";
import { playerRanksSchema } from "./schemas";
import type { PlayerRank } from "./types";

/** The spec allows 1000, but 1000 ids returned a 500 in practice; 200 works. */
const CHUNK = 200;

type Waiter = {
  ids: number[];
  resolve: (ranks: Map<number, PlayerRank>) => void;
  reject: (error: unknown) => void;
};

let queue: Waiter[] = [];
let scheduled = false;

export function loadPlayerRanks(ids: number[]): Promise<Map<number, PlayerRank>> {
  return new Promise((resolve, reject) => {
    queue.push({ ids, resolve, reject });
    if (!scheduled) {
      scheduled = true;
      setTimeout(flush, 0);
    }
  });
}

async function flush() {
  const batch = queue;
  queue = [];
  scheduled = false;
  const ids = [...new Set(batch.flatMap((w) => w.ids))];
  try {
    const byId = new Map<number, PlayerRank>();
    // One chunk at a time: the API asks clients not to send parallel uncached requests.
    for (let i = 0; i < ids.length; i += CHUNK) {
      const raw = await deadlockFetch("/v1/players/rank", playerRanksSchema, {
        query: { account_ids: ids.slice(i, i + CHUNK).join(",") },
      });
      for (const rank of mapPlayerRanks(raw)) byId.set(rank.accountId, rank);
    }
    for (const w of batch) w.resolve(byId);
  } catch (error) {
    for (const w of batch) w.reject(error);
  }
}
