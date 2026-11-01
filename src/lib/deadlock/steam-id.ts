// Reads what someone types into the player search: a Steam name, an account id
// (= Steam friend code), a SteamID64, a SteamID3 or a Steam profile link.

/** SteamID64 of account 0; SteamID64 = this + account id. */
const ID64_BASE = BigInt("76561197960265728");
const MAX_ACCOUNT_ID = 4_294_967_295;

export type PlayerQuery =
  | { kind: "empty" }
  | { kind: "id"; accountId: number }
  /** `vanity`: came from a steamcommunity.com/id/<name> link, which the API can't resolve. */
  | { kind: "name"; query: string; vanity: boolean };

function validId(n: number): number | null {
  return Number.isSafeInteger(n) && n > 0 && n <= MAX_ACCOUNT_ID ? n : null;
}

function fromId64(text: string): number | null {
  if (!/^\d{17}$/.test(text)) return null;
  const id = BigInt(text) - ID64_BASE;
  return id > BigInt(0) && id <= BigInt(MAX_ACCOUNT_ID) ? Number(id) : null;
}

export function parsePlayerQuery(raw: string): PlayerQuery {
  const q = raw.trim();
  if (q.length === 0) return { kind: "empty" };

  const link = /steamcommunity\.com\/(profiles|id)\/([^/?#\s]+)/i.exec(q);
  if (link) {
    if (link[1].toLowerCase() === "profiles") {
      const id = fromId64(link[2]);
      if (id) return { kind: "id", accountId: id };
    } else {
      let vanity = link[2];
      try {
        vanity = decodeURIComponent(vanity);
      } catch {
        // Keep it as typed.
      }
      return { kind: "name", query: vanity, vanity: true };
    }
  }

  const id3 = /^\[?U:1:(\d+)\]?$/i.exec(q);
  if (id3) {
    const id = validId(Number(id3[1]));
    if (id) return { kind: "id", accountId: id };
  }

  const id64 = fromId64(q);
  if (id64) return { kind: "id", accountId: id64 };

  if (/^\d{1,10}$/.test(q)) {
    const id = validId(Number(q));
    if (id) return { kind: "id", accountId: id };
  }

  return { kind: "name", query: q, vanity: false };
}
