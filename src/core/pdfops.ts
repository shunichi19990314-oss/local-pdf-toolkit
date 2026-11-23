/** pdf-lib wrapper: load files, export the working sequence as a new PDF. */
import { PDFDocument, degrees } from "pdf-lib";
import { effectiveRotation, type LoadedFile, type PageRef } from "./sequence";

export interface PdfHandle extends LoadedFile {
  /** Original bytes; only used as the source for thumbnail rendering copies. */
  bytes: Uint8Array;
  doc: PDFDocument;
}

/** Read a File into a handle. Throws for password-protected / damaged PDFs. */
export async function loadPdf(file: File): Promise<PdfHandle> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (doc.getPageCount() === 0) throw new Error("no pages");
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    pageCount: doc.getPageCount(),
    bytes,
    doc,
  };
}

/** Build the output PDF: pages copied in sequence order with extra rotation. */
export async function exportPdf(handles: Map<string, PdfHandle>, sequence: PageRef[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const ref of sequence) {
    const src = handles.get(ref.fileId);
    if (!src) continue;
    const [copied] = await out.copyPages(src.doc, [ref.pageIndex]);
    if (ref.rotation !== 0) {
      copied.setRotation(degrees(effectiveRotation(copied.getRotation().angle, ref.rotation)));
    }
    out.addPage(copied);
  }
  return out.save();
}

/** Trigger a browser download for exported bytes. */
export function downloadPdf(bytes: Uint8Array, name: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
