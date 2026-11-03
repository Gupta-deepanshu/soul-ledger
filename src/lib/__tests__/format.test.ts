import {
  formatCompact,
  formatDate,
  formatDuration,
  formatInt,
  formatKda,
  formatPercent,
  formatSigned,
} from "@/lib/format";

const MINUS = "−";

describe("formatCompact", () => {
  it.each([
    [950, "950"],
    [12_400, "12.4k"],
    [1_840_000, "1.84M"],
    [2_500_000_000, "2.5B"],
    [1000, "1k"],
    [0, "0"],
  ])("%d → %s", (value, expected) => {
    expect(formatCompact(value)).toBe(expected);
  });

  it("uses a real minus sign for negatives", () => {
    expect(formatCompact(-12_400)).toBe(`${MINUS}12.4k`);
  });

  it("respects the digits argument", () => {
    expect(formatCompact(12_345, 2)).toBe("12k");
  });
});

describe("formatInt", () => {
  it("adds thousands separators and rounds", () => {
    expect(formatInt(12_345.6)).toBe("12,346");
  });
  it("uses a real minus sign", () => {
    expect(formatInt(-1500)).toBe(`${MINUS}1,500`);
  });
});

describe("formatPercent", () => {
  it("takes a 0–1 ratio", () => {
    expect(formatPercent(0.5234)).toBe("52.3%");
    expect(formatPercent(1, 0)).toBe("100%");
  });
  it("uses a real minus sign", () => {
    expect(formatPercent(-0.012)).toBe(`${MINUS}1.2%`);
  });
});

describe("formatSigned", () => {
  it("adds + or − and keeps 0 unsigned", () => {
    expect(formatSigned(1.8)).toBe("+1.8");
    expect(formatSigned(-2)).toBe(`${MINUS}2.0`);
    expect(formatSigned(0)).toBe("0.0");
  });
  it("treats values that round to zero as zero", () => {
    expect(formatSigned(-0.04)).toBe("0.0");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [65, "1:05"],
    [1675, "27:55"],
    [3725, "1:02:05"],
    [-10, "0:00"],
    [59.9, "0:59"],
  ])("%d s → %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("formatDate", () => {
  // 2026-10-15T03:12:00Z
  const t = Date.UTC(2026, 9, 15, 3, 12) / 1000;
  it("formats in UTC", () => {
    expect(formatDate(t)).toBe("Oct 15, 2026");
    expect(formatDate(t, false)).toBe("Oct 15");
  });
});

describe("formatKda", () => {
  it("rounds to one decimal", () => {
    expect(formatKda(3.456)).toBe("3.5");
    expect(formatKda(2)).toBe("2.0");
  });
});
