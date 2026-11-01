import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Cache lifetimes for Deadlock API data (see the deadlock-api skill).
  // Used with `"use cache"` + `cacheLife("<profile>")` in src/lib/deadlock/api.ts.
  cacheLife: {
    assets: { stale: 300, revalidate: 60 * 60 * 24, expire: 60 * 60 * 24 * 7 },
    analytics: { stale: 300, revalidate: 60 * 60, expire: 60 * 60 * 24 },
    match: { stale: 300, revalidate: 60 * 60 * 24 * 7, expire: 60 * 60 * 24 * 30 },
    player: { stale: 60, revalidate: 60 * 5, expire: 60 * 60 },
    live: { stale: 30, revalidate: 30, expire: 120 },
    // Average rank of a live match: its players don't change, so 1 h covers the match.
    liveRank: { stale: 300, revalidate: 60 * 60, expire: 60 * 60 * 2 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets-bucket.deadlock-api.com" },
      { protocol: "https", hostname: "api.deadlock-api.com" },
      // Steam profile avatars (player profile and search results).
      { protocol: "https", hostname: "avatars.steamstatic.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
