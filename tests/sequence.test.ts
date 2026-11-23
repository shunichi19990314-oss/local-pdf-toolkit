import { describe, expect, it } from "vitest";
import {
  buildSequence,
  deletePages,
  extractPages,
  keyOf,
  removeFiles,
  reorderFile,
  rotatePages,
  type LoadedFile,
} from "../src/core/sequence";

const files: LoadedFile[] = [
  { id: "a", name: "a.pdf", size: 10, pageCount: 2 },
  { id: "b", name: "b.pdf", size: 20, pageCount: 3 },
];

describe("sequence", () => {
  it("builds all pages in file order", () => {
    const seq = buildSequence(files);
    expect(seq.map(keyOf)).toEqual(["a:0", "a:1", "b:0", "b:1", "b:2"]);
  });

  it("extracts selected positions and keeps order", () => {
    const seq = buildSequence(files);
    expect(extractPages(seq, [2, 4]).map(keyOf)).toEqual(["a:1", "b:1"]);
  });

  it("deletes selected positions", () => {
    const seq = buildSequence(files);
    expect(deletePages(seq, [1, 2, 5]).map(keyOf)).toEqual(["b:0", "b:1"]);
  });

  it("rotates only selected pages, wrapping both directions", () => {
    const seq = buildSequence(files);
    const rotated = rotatePages(seq, [1], 90);
    expect(rotated[0]!.rotation).toBe(90);
    expect(rotated[1]!.rotation).toBe(0);
    const back = rotatePages(rotated, [1], -90);
    expect(back[0]!.rotation).toBe(0);
    const wrap = rotatePages(seq, [1], -90);
    expect(wrap[0]!.rotation).toBe(270);
    // empty selection rotates everything
    const all = rotatePages(seq, [], 180);
    expect(all.every((r) => r.rotation === 180)).toBe(true);
  });

  it("reorders files while preserving extraction state and rotations", () => {
    const seq = buildSequence(files);
    const extracted = extractPages(seq, [1, 4]); // a:0, b:1
    const rotated = rotatePages(extracted, [2], 90); // b:1 rotated
    const { files: nextFiles, sequence: next } = reorderFile(rotated, files, "b", 0);
    expect(nextFiles.map((f) => f.id)).toEqual(["b", "a"]);
    // b pages come first, subset and rotations survive the reorder
    expect(next.map(keyOf)).toEqual(["b:1", "a:0"]);
    expect(next[0]!.rotation).toBe(90);
  });

  it("drops pages of removed files but keeps the rest", () => {
    const seq = extractPages(buildSequence(files), [1, 3, 4]); // a:0, b:0, b:1
    expect(removeFiles(seq, new Set(["a"])).map(keyOf)).toEqual(["b:0", "b:1"]);
  });
});
