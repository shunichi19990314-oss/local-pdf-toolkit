import { describe, expect, it } from "vitest";
import { parseRange } from "../src/core/range";

describe("parseRange", () => {
  it("parses mixed ranges and singles", () => {
    expect(parseRange("1-3, 5", 10).pages).toEqual([1, 2, 3, 5]);
    expect(parseRange("2,4,6", 10).pages).toEqual([2, 4, 6]);
  });

  it("supports open-ended ranges", () => {
    expect(parseRange("8-", 10).pages).toEqual([8, 9, 10]);
    expect(parseRange("1-", 3).pages).toEqual([1, 2, 3]);
  });

  it("preserves user order and removes duplicates", () => {
    expect(parseRange("5, 1-2", 10).pages).toEqual([5, 1, 2]);
    expect(parseRange("1-3, 2-4", 10).pages).toEqual([1, 2, 3, 4]);
  });

  it("tolerates whitespace inside tokens", () => {
    expect(parseRange("1 - 3, 7", 10).pages).toEqual([1, 2, 3, 7]);
  });

  it("collects invalid tokens as warnings", () => {
    const r1 = parseRange("0", 10);
    expect(r1.pages).toEqual([]);
    expect(r1.warnings).toEqual(["0"]);

    const r2 = parseRange("11", 10);
    expect(r2.warnings).toEqual(["11"]);

    const r3 = parseRange("3-1", 10);
    expect(r3.warnings).toEqual(["3-1"]);

    const r4 = parseRange("abc", 10);
    expect(r4.warnings).toEqual(["abc"]);

    const r5 = parseRange("1-2, x, 9", 10);
    expect(r5.pages).toEqual([1, 2, 9]);
    expect(r5.warnings).toEqual(["x"]);
  });

  it("returns nothing for empty input", () => {
    expect(parseRange("", 10).pages).toEqual([]);
    expect(parseRange(" , ", 10).pages).toEqual([]);
  });
});
