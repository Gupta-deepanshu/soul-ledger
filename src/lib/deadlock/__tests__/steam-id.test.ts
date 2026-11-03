import { parsePlayerQuery } from "@/lib/deadlock/steam-id";

const ACCOUNT = 1160721308;
const ID64 = (BigInt("76561197960265728") + BigInt(ACCOUNT)).toString();

describe("parsePlayerQuery", () => {
  it("returns empty for blank input", () => {
    expect(parsePlayerQuery("")).toEqual({ kind: "empty" });
    expect(parsePlayerQuery("   ")).toEqual({ kind: "empty" });
  });

  it.each([
    ["account id", String(ACCOUNT)],
    ["account id with spaces", `  ${ACCOUNT}  `],
    ["SteamID64", ID64],
    ["SteamID3", `[U:1:${ACCOUNT}]`],
    ["SteamID3 without brackets", `U:1:${ACCOUNT}`],
    ["profile link", `https://steamcommunity.com/profiles/${ID64}/`],
    ["profile link without scheme", `steamcommunity.com/profiles/${ID64}?l=en`],
  ])("reads a %s", (_label, input) => {
    expect(parsePlayerQuery(input)).toEqual({ kind: "id", accountId: ACCOUNT });
  });

  it("treats a vanity link as a name search, flagged as vanity", () => {
    expect(parsePlayerQuery("https://steamcommunity.com/id/some%20player/")).toEqual({
      kind: "name",
      query: "some player",
      vanity: true,
    });
  });

  it("keeps a vanity name as typed when it can't be URL-decoded", () => {
    expect(parsePlayerQuery("steamcommunity.com/id/bad%E0name")).toEqual({
      kind: "name",
      query: "bad%E0name",
      vanity: true,
    });
  });

  it("treats anything else as a name", () => {
    expect(parsePlayerQuery("Yoshi")).toEqual({ kind: "name", query: "Yoshi", vanity: false });
  });

  it.each([
    ["zero", "0"],
    ["above the 32-bit account range", "4294967296"],
    ["a 17-digit number below the SteamID64 base", "00000000000000001"],
    ["an 11-digit number", "12345678901"],
  ])("does not treat %s as an id", (_label, input) => {
    expect(parsePlayerQuery(input).kind).toBe("name");
  });

  it("accepts the largest account id", () => {
    expect(parsePlayerQuery("4294967295")).toEqual({ kind: "id", accountId: 4_294_967_295 });
  });
});
