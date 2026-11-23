/** Thumbnail rendering with pdf.js. Copies are passed to pdf.js because it
 *  detaches the ArrayBuffer it receives (transferable to the worker). */
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const THUMB_WIDTH = 150;

export class ThumbRenderer {
  private docs = new Map<string, pdfjs.PDFDocumentProxy>();
  private cache = new Map<string, string>(); // "fileId:pageIndex" -> dataURL

  async register(fileId: string, bytes: Uint8Array): Promise<void> {
    const task = pdfjs.getDocument({ data: bytes.slice() });
    this.docs.set(fileId, await task.promise);
  }

  /** Render one page to a canvas; returns a PNG dataURL (cached). */
  async render(fileId: string, pageIndex: number): Promise<string> {
    const key = `${fileId}:${pageIndex}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const doc = this.docs.get(fileId);
    if (!doc) throw new Error("file not registered");
    const page = await doc.getPage(pageIndex + 1); // pdf.js is 1-based
    const base = page.getViewport({ scale: 1 });
    const scale = THUMB_WIDTH / base.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    const url = canvas.toDataURL("image/png");
    this.cache.set(key, url);
    return url;
  }

  async destroy(fileId: string): Promise<void> {
    const doc = this.docs.get(fileId);
    if (doc) {
      await doc.destroy();
      this.docs.delete(fileId);
      for (const key of [...this.cache.keys()]) {
        if (key.startsWith(`${fileId}:`)) this.cache.delete(key);
      }
    }
  }
}
