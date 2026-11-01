// Fetches real Deadlock API responses once and saves them to src/data/fixtures/.
// Requests run one after another (the API sheds load on parallel uncached queries).
// Usage: node scripts/save-fixtures.mjs [matchId]
//        node scripts/save-fixtures.mjs --live   (only active matches + their players' ranks)
//        node scripts/save-fixtures.mjs --steam  (only Steam names for players in match-*.json
//                                                 and the first live matches in active-matches.json)
//        node scripts/save-fixtures.mjs --live-players  (hero records + names for those live players)
//        node scripts/save-fixtures.mjs --search "<query>"   (a player search + result ranks)
//        node scripts/save-fixtures.mjs --player <account_id>  (one player's profile data)
// Without a matchId it keeps the match fixture already saved, or picks a recent match.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://api.deadlock-api.com";
const OUT = path.join(import.meta.dirname, "..", "src", "data", "fixtures");
const headers = process.env.DEADLOCK_API_KEY ? { "X-API-KEY": process.env.DEADLOCK_API_KEY } : {};

async function get(pathname) {
  const res = await fetch(BASE + pathname, { headers });
  if (!res.ok) {
    const shown = pathname.length > 120 ? `${pathname.slice(0, 120)}…` : pathname;
    throw new Error(`${res.status} ${shown} (Retry-After: ${res.headers.get("retry-after") ?? "—"})`);
  }
  return res.json();
}

async function save(name, data) {
  const file = path.join(OUT, `${name}.json`);
  await writeFile(file, JSON.stringify(data) + "\n");
  console.log(`saved ${path.relative(process.cwd(), file)}`);
}

await mkdir(OUT, { recursive: true });

// Active matches and the ranks of their players, saved together so they match.
// /v1/players/rank allows 20 requests a minute per IP. The spec allows 1000 ids per
// request, but 1000 returned a 500 in practice; 200 works (same chunk size as the app).
async function saveLive() {
  const active = await get("/v1/matches/active");
  await save("active-matches", active);
  const ids = [...new Set(active.filter((m) => m.game_mode_parsed === "KECitadelGameModeNormal").flatMap((m) => m.players.map((p) => p.account_id)))];
  const ranks = [];
  for (let i = 0; i < ids.length; i += 200) {
    ranks.push(...(await get(`/v1/players/rank?account_ids=${ids.slice(i, i + 200).join(",")}`)));
  }
  await save("player-ranks-active", ranks);
}

// Steam names for every player in the saved match fixtures, plus the teammates in
// any saved player mate-stats (one file; the app picks by id).
async function saveSteamProfiles() {
  const files = await readdir(OUT);
  const ids = new Set();
  for (const f of files.filter((f) => /^match-\d+\.json$/.test(f))) {
    const { match_info } = JSON.parse(await readFile(path.join(OUT, f), "utf8"));
    for (const p of match_info.players) ids.add(p.account_id);
  }
  // The players whose profiles are saved.
  for (const f of files) {
    const m = /^player-(\d+)-history\.json$/.exec(f);
    if (m) ids.add(Number(m[1]));
  }
  // Players in the first live matches, for the in-progress match page.
  for (const p of (await liveFixturePlayers()).players) ids.add(p.account_id);
  // Only teammates the profile can show (10+ games together, top 10), not everyone.
  for (const f of files.filter((f) => /^player-\d+-mates\.json$/.test(f))) {
    const mates = JSON.parse(await readFile(path.join(OUT, f), "utf8"));
    mates
      .filter((m) => m.matches_played >= 10)
      .sort((a, b) => b.matches_played - a.matches_played)
      .slice(0, 10)
      .forEach((m) => ids.add(m.mate_id));
  }
  const profiles = await get(`/v1/players/steam?account_ids=${[...ids].join(",")}`);
  // Keep only what the site shows. The response also carries real names, countries
  // and friend lists, which don't belong in the repo.
  await save("steam-profiles", profiles.map((p) => ({ account_id: p.account_id, personaname: p.personaname, avatarfull: p.avatarfull })));
}

// The in-progress match page needs names and hero records for one match's
// players. Saving them for every live match would be thousands of accounts, so
// only the first LIVE_FIXTURE_MATCHES normal matches in active-matches.json get them.
const LIVE_FIXTURE_MATCHES = 10;

async function liveFixturePlayers() {
  const active = JSON.parse(await readFile(path.join(OUT, "active-matches.json"), "utf8"));
  const matches = active.filter((m) => m.game_mode_parsed === "KECitadelGameModeNormal").slice(0, LIVE_FIXTURE_MATCHES);
  return { matchIds: matches.map((m) => m.match_id), players: matches.flatMap((m) => m.players) };
}

// Each live player's all-time normal-mode record on the hero they're playing.
async function saveLivePlayers() {
  const { matchIds, players } = await liveFixturePlayers();
  const accountIds = [...new Set(players.map((p) => p.account_id))];
  const heroIds = [...new Set(players.map((p) => p.hero_id))];
  const rows = await get(
    `/v1/players/hero-stats?account_ids=${accountIds.join(",")}&hero_ids=${heroIds.join(",")}&game_mode=normal`,
  );
  const wanted = new Set(players.map((p) => `${p.account_id}:${p.hero_id}`));
  await save(
    "live-players-hero-stats",
    rows
      .filter((r) => wanted.has(`${r.account_id}:${r.hero_id}`))
      .map((r) => ({ account_id: r.account_id, hero_id: r.hero_id, matches_played: r.matches_played, wins: r.wins })),
  );
  await saveSteamProfiles();
  console.log(`live matches with player data: ${matchIds.join(", ")}`);
}

if (process.argv[2] === "--live-players") {
  await saveLivePlayers();
  process.exit(0);
}
if (process.argv[2] === "--live") {
  await saveLive();
  process.exit(0);
}
if (process.argv[2] === "--steam") {
  await saveSteamProfiles();
  process.exit(0);
}

// A player search and the ranks of its results (only the fields the page shows).
if (process.argv[2] === "--search") {
  const q = process.argv[3];
  if (!q) throw new Error('Usage: --search "<query>"');
  const results = await get(`/v1/players/steam-search?search_query=${encodeURIComponent(q)}&limit=8`);
  await save(
    "steam-search",
    results.map((p) => ({
      account_id: p.account_id,
      personaname: p.personaname,
      avatarmedium: p.avatarmedium,
      matches_played_last_30d: p.matches_played_last_30d,
    })),
  );
  const ranks = await get(`/v1/players/rank?account_ids=${results.map((p) => p.account_id).join(",")}`);
  await save(
    "player-ranks-search",
    ranks.map((r) => ({
      account_id: r.account_id,
      badge: r.badge,
      rank: r.rank,
      subrank: r.subrank,
      last_match: r.last_match ? { start_time: r.last_match.start_time } : null,
    })),
  );
  process.exit(0);
}

// One player's profile data (never force_refetch: that's limited to 1 request/hour per IP).
if (process.argv[2] === "--player") {
  const id = process.argv[3];
  if (!/^\d+$/.test(id ?? "")) throw new Error("Usage: --player <account_id>");
  await save(`player-${id}-history`, await get(`/v1/players/${id}/match-history`));
  await save(`player-${id}-rank`, await get(`/v1/players/${id}/rank`));
  await save(`player-${id}-heroes`, await get(`/v1/players/hero-stats?account_ids=${id}`));
  await save(`player-${id}-mates`, await get(`/v1/players/${id}/mate-stats?game_mode=normal`));
  const rank = JSON.parse(await readFile(path.join(OUT, `player-${id}-rank.json`), "utf8"));
  if (rank.rank > 0) {
    const tier = rank.rank;
    await save(`game-stats-tier-${tier}`, await get(`/v1/analytics/game-stats?game_mode=normal&min_average_badge=${tier * 10 + 1}&max_average_badge=${tier * 10 + 6}`));
  }
  await saveSteamProfiles();
  process.exit(0);
}

await save("heroes", await get("/v1/assets/heroes?only_active=true"));
await save("items", await get("/v1/assets/items"));
await save("ranks", await get("/v1/assets/ranks"));

const patches = await get("/v1/patches");
await save("patches", patches);

// Patch windows. Feed entries published within 3 days of each other count as
// one patch (same rule as mapPatchWindows in src/lib/deadlock/mappers.ts).
const DAY = 86_400;
const dates = patches.map((p) => Math.floor(Date.parse(p.pub_date) / 1000)).sort((a, b) => b - a);
const starts = dates.filter((d, i) => i === 0 || dates[i - 1] - d >= 3 * DAY);
const [current, previous] = starts;
console.log(`current patch from ${new Date(current * 1000).toISOString()}, previous from ${new Date(previous * 1000).toISOString()}`);

const now = Math.floor(Date.now() / 1000 / 3600) * 3600;
const win = (since, until) => `min_unix_timestamp=${since}` + (until ? `&max_unix_timestamp=${until}` : "");

await save("hero-stats", await get(`/v1/analytics/hero-stats?${win(current)}`));
await save("hero-stats-previous", await get(`/v1/analytics/hero-stats?${win(previous, current)}`));
await save("game-stats", await get(`/v1/analytics/game-stats?${win(current)}`));
await save("game-stats-previous", await get(`/v1/analytics/game-stats?${win(previous, current)}`));
await save("game-stats-24h", await get(`/v1/analytics/game-stats?${win(now - DAY)}`));
await save("item-stats", await get(`/v1/analytics/item-stats?${win(current)}`));
await save("hero-counter-stats", await get(`/v1/analytics/hero-counter-stats?${win(current)}`));
await save("rank-distribution", await get(`/v1/players/rank/distribution?${win(current)}`));

await saveLive();

let matchId = process.argv[2];
if (!matchId) {
  const saved = (await readdir(OUT)).find((f) => /^match-\d+\.json$/.test(f));
  matchId = saved?.match(/\d+/)?.[0];
}
if (!matchId) {
  // A full-length recent match; 20+ minutes so the souls-lead chart has shape.
  const recent = await get("/v1/matches/recently-fetched");
  const pick = recent.find((m) => m.duration_s >= 1200 && m.players.length === 12) ?? recent[0];
  matchId = String(pick.match_id);
}
await save(`match-${matchId}`, await get(`/v1/matches/${matchId}/metadata`));
