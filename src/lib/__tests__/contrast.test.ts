import { FG, INK, bestText, contrast } from "@/lib/contrast";

describe("contrast", () => {
  it("is 21:1 for black on white and 1:1 for a colour on itself", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#5e8bff", "#5e8bff")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrast(INK, FG)).toBeCloseTo(contrast(FG, INK), 10);
  });
});

describe("bestText", () => {
  it("picks ink on a light fill and fg on a dark one", () => {
    expect(bestText("#ffffff").text).toBe("ink");
    expect(bestText("#000000").text).toBe("fg");
  });

  it("blends a translucent fill over the base", () => {
    // A white fill at 0% opacity is just the dark surface underneath.
    expect(bestText("#ffffff", 0).text).toBe("fg");
  });
});
