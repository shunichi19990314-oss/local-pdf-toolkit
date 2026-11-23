import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import { exportPdf, loadPdf } from "../src/core/pdfops";
import { effectiveRotation } from "../src/core/sequence";

async function makePdf(pages: number, rotatedFirst = 0): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([200, 300]);
    page.drawText(`page ${i + 1}`, { x: 20, y: 150, size: 16, font });
    if (i === 0 && rotatedFirst) page.setRotation(degrees(rotatedFirst));
  }
  return new File([await doc.save() as BlobPart], "test.pdf", { type: "application/pdf" });
}

describe("pdfops round-trip (node)", () => {
  it("loads a file into a handle with page count and size", async () => {
    const h = await loadPdf(await makePdf(3));
    expect(h.pageCount).toBe(3);
    expect(h.name).toBe("test.pdf");
    expect(h.size).toBeGreaterThan(500);
  });

  it("exports the full sequence unchanged", async () => {
    const h = await loadPdf(await makePdf(3));
    const out = await PDFDocument.load(await exportPdf(new Map([[h.id, h]]), [
      { fileId: h.id, pageIndex: 0, rotation: 0 },
      { fileId: h.id, pageIndex: 1, rotation: 0 },
      { fileId: h.id, pageIndex: 2, rotation: 0 },
    ]));
    expect(out.getPageCount()).toBe(3);
  });

  it("extracts a subset and reorders pages", async () => {
    const h = await loadPdf(await makePdf(4));
    const out = await PDFDocument.load(await exportPdf(new Map([[h.id, h]]), [
      { fileId: h.id, pageIndex: 3, rotation: 0 }, // page 4 first
      { fileId: h.id, pageIndex: 1, rotation: 0 }, // then page 2
    ]));
    expect(out.getPageCount()).toBe(2);
  });

  it("applies extra rotation on top of the original page rotation", async () => {
    const h = await loadPdf(await makePdf(2, 90)); // first page starts at 90°
    const out = await PDFDocument.load(await exportPdf(new Map([[h.id, h]]), [
      { fileId: h.id, pageIndex: 0, rotation: 90 }, // 90 + 90 = 180
      { fileId: h.id, pageIndex: 1, rotation: 270 },
    ]));
    const [p0, p1] = out.getPages();
    expect(p0!.getRotation().angle).toBe(180);
    expect(p1!.getRotation().angle).toBe(270);
  });

  it("merges pages from two files in sequence order", async () => {
    const [x, y] = await Promise.all([loadPdf(await makePdf(2)), loadPdf(await makePdf(3))]);
    const out = await PDFDocument.load(await exportPdf(new Map([[x.id, x], [y.id, y]]), [
      { fileId: y.id, pageIndex: 0, rotation: 0 },
      { fileId: x.id, pageIndex: 1, rotation: 0 },
      { fileId: y.id, pageIndex: 2, rotation: 0 },
    ]));
    expect(out.getPageCount()).toBe(3);
  });
});

describe("effectiveRotation", () => {
  it("wraps negative and >360 values", () => {
    expect(effectiveRotation(90, 90)).toBe(180);
    expect(effectiveRotation(0, -90)).toBe(270);
    expect(effectiveRotation(270, 180)).toBe(90);
    expect(effectiveRotation(180, -360)).toBe(180);
  });
});
