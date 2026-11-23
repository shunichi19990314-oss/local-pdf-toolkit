/**
 * App wiring: file loading (choose / drop / samples), the page grid with
 * lazy thumbnails, selection + range parsing, and the page-sequence actions.
 */
import { loadPdf, exportPdf, downloadPdf, humanBytes, type PdfHandle } from "./core/pdfops";
import { parseRange } from "./core/range";
import {
  buildSequence,
  deletePages,
  extractPages,
  keyOf,
  removeFiles,
  reorderFile,
  rotatePages,
  type PageRef,
} from "./core/sequence";
import { ThumbRenderer } from "./core/thumbs";
import { detectLang, t, type Lang } from "./ui/i18n";
import { cycleTheme, initTheme } from "./ui/theme";
import "./style.css";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const el = {
  btnLang: $<HTMLButtonElement>("btn-lang"),
  btnTheme: $<HTMLButtonElement>("btn-theme"),
  dropzone: $<HTMLElement>("dropzone"),
  btnChoose: $<HTMLButtonElement>("btn-choose"),
  btnSamples: $<HTMLButtonElement>("btn-samples"),
  fileInput: $<HTMLInputElement>("file-input"),
  workspace: $<HTMLElement>("workspace"),
  fileList: $<HTMLElement>("file-list"),
  rangeInput: $<HTMLInputElement>("range-input"),
  btnRangeApply: $<HTMLButtonElement>("btn-range-apply"),
  btnAll: $<HTMLButtonElement>("btn-all"),
  btnNone: $<HTMLButtonElement>("btn-none"),
  selInfo: $<HTMLElement>("sel-info"),
  btnExtract: $<HTMLButtonElement>("btn-extract"),
  btnDelete: $<HTMLButtonElement>("btn-delete"),
  btnRotl: $<HTMLButtonElement>("btn-rotl"),
  btnRotr: $<HTMLButtonElement>("btn-rotr"),
  btnReset: $<HTMLButtonElement>("btn-reset"),
  btnExport: $<HTMLButtonElement>("btn-export"),
  grid: $<HTMLElement>("grid"),
  status: $<HTMLElement>("status"),
  toast: $<HTMLElement>("toast"),
};

const renderer = new ThumbRenderer();
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      observer.unobserve(e.target);
      const key = (e.target as HTMLElement).dataset.key!;
      const [fileId, pageStr] = key.split(":");
      void renderer
        .render(fileId, Number(pageStr))
        .then((url) => {
          const img = (e.target as HTMLElement).querySelector("img");
          if (img) img.src = url;
        })
        .catch(() => {
          const box = e.target as HTMLElement;
          box.textContent = "✕";
          box.classList.add("failed");
        });
    }
  },
  { root: el.grid, rootMargin: "300px" },
);

let lang: Lang = detectLang();
let handles: PdfHandle[] = [];
let sequence: PageRef[] = [];
let selection = new Set<string>();
let anchor: number | null = null;
let dragFrom: number | null = null;

// ---------- i18n ----------
function applyI18n(): void {
  document.documentElement.lang = lang;
  for (const node of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    node.textContent = t(lang, node.dataset.i18n!);
  }
  for (const node of document.querySelectorAll<HTMLInputElement>("[data-i18n-ph]")) {
    node.placeholder = t(lang, node.dataset.i18nPh!);
  }
  for (const node of document.querySelectorAll<HTMLElement>("[data-i18n-html]")) {
    node.innerHTML = t(lang, node.dataset.i18nHtml!);
  }
  el.btnLang.title = lang === "ja" ? "Switch to English" : "日本語に切り替える";
  renderStatus();
}

// ---------- toast ----------
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function toast(message: string, isError = false): void {
  el.toast.textContent = message;
  el.toast.classList.toggle("error", isError);
  el.toast.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add("hidden"), 3500);
}

// ---------- loading ----------
async function handleFiles(list: FileList | File[]): Promise<void> {
  const files = [...list].filter(
    (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
  );
  if (files.length === 0) return;
  let loaded = 0;
  let pages = 0;
  for (const f of files) {
    try {
      const h = await loadPdf(f);
      handles.push(h);
      await renderer.register(h.id, h.bytes);
      for (let i = 0; i < h.pageCount; i++) sequence.push({ fileId: h.id, pageIndex: i, rotation: 0 });
      loaded++;
      pages += h.pageCount;
    } catch {
      toast(t(lang, "loadFailed", { name: f.name }), true);
    }
  }
  if (loaded > 0) {
    renderAll();
    toast(t(lang, "loadedInfo", { n: loaded, m: pages }));
  }
}

async function loadSamples(): Promise<void> {
  const names = ["sample-report.pdf", "sample-invoice.pdf"];
  const files: File[] = [];
  for (const name of names) {
    const res = await fetch(`samples/${name}`);
    if (!res.ok) continue;
    files.push(new File([await res.blob()], name, { type: "application/pdf" }));
  }
  await handleFiles(files);
}

// ---------- rendering ----------
function renderAll(): void {
  const hasFiles = handles.length > 0;
  el.dropzone.classList.toggle("hidden", hasFiles);
  el.workspace.classList.toggle("hidden", !hasFiles);
  renderFileList();
  renderGrid();
  renderStatus();
}

function renderFileList(): void {
  el.fileList.replaceChildren();
  handles.forEach((h, i) => {
    const chip = document.createElement("div");
    chip.className = "file-chip";
    chip.draggable = true;
    chip.dataset.index = String(i);
    chip.title = h.name;

    const grip = document.createElement("span");
    grip.className = "grip";
    grip.textContent = "⠿";

    const name = document.createElement("span");
    name.className = "fname";
    name.textContent = h.name;

    const meta = document.createElement("span");
    meta.className = "fmeta";
    meta.textContent = `${h.pageCount}p · ${humanBytes(h.size)}`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "×";
    remove.title = t(lang, "deletePages");
    remove.addEventListener("click", () => removeFile(h.id));

    chip.append(grip, name, meta, remove);
    chip.addEventListener("dragstart", (e) => {
      dragFrom = i;
      chip.classList.add("dragging");
      e.dataTransfer?.setData("text/plain", String(i));
    });
    chip.addEventListener("dragend", () => {
      dragFrom = null;
      chip.classList.remove("dragging");
    });
    chip.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (dragFrom !== null && dragFrom !== i) chip.classList.add("drop-target");
    });
    chip.addEventListener("dragleave", () => chip.classList.remove("drop-target"));
    chip.addEventListener("drop", (e) => {
      e.preventDefault();
      chip.classList.remove("drop-target");
      if (dragFrom === null || dragFrom === i) return;
      const result = reorderFile(sequence, handles, handles[dragFrom]!.id, i);
      handles = result.files;
      sequence = result.sequence;
      renderAll();
    });
    el.fileList.append(chip);
  });
}

function renderGrid(): void {
  el.grid.replaceChildren();
  const fileIndex = new Map(handles.map((h, i) => [h.id, i]));
  sequence.forEach((ref, i) => {
    const key = keyOf(ref);
    const card = document.createElement("div");
    card.className = `page-card${selection.has(key) ? " selected" : ""}`;
    card.dataset.key = key;
    card.dataset.pos = String(i + 1);

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.dataset.key = key;
    const img = document.createElement("img");
    img.alt = `page ${i + 1}`;
    img.style.transform = `rotate(${ref.rotation}deg)`;
    thumb.append(img);
    observer.observe(thumb);

    const pos = document.createElement("span");
    pos.className = "badge pos";
    pos.textContent = String(i + 1);

    const fileBadge = document.createElement("span");
    fileBadge.className = "badge file";
    fileBadge.dataset.file = String(fileIndex.get(ref.fileId) ?? 0);
    const owner = handles.find((h) => h.id === ref.fileId);
    fileBadge.textContent = owner ? owner.name.replace(/\.pdf$/i, "").slice(0, 10) : "?";
    fileBadge.title = owner?.name ?? "";

    card.append(thumb, pos, fileBadge);
    if (ref.rotation !== 0) {
      const rot = document.createElement("span");
      rot.className = "badge rot";
      rot.textContent = `↻${ref.rotation}°`;
      card.append(rot);
    }
    card.addEventListener("click", (e) => {
      if (e.shiftKey && anchor !== null) {
        const [from, to] = anchor < i ? [anchor, i] : [i, anchor];
        for (let p = from; p <= to; p++) selection.add(keyOf(sequence[p]!));
      } else {
        if (selection.has(key)) selection.delete(key);
        else selection.add(key);
        anchor = i;
      }
      renderGrid();
      renderStatus();
    });
    el.grid.append(card);
  });
}

function renderStatus(): void {
  const sel = selection.size;
  el.status.textContent = [
    `${handles.length} ${t(lang, "filesLabel")}`,
    `${sequence.length} ${t(lang, "pagesLabel")}`,
    `${sel} ${t(lang, "selectedLabel")}`,
  ].join(" · ");
  el.selInfo.textContent = sel > 0 ? `${sel} ${t(lang, "selectedLabel")}` : "";
  el.btnExport.textContent = `${t(lang, "export")} (${sequence.length})`;
}

// ---------- actions ----------
function selectedPositions(): number[] {
  const out: number[] = [];
  sequence.forEach((ref, i) => {
    if (selection.has(keyOf(ref))) out.push(i + 1);
  });
  return out;
}

function clearSelection(): void {
  selection = new Set();
  anchor = null;
}

function actExtract(): void {
  const pos = selectedPositions();
  if (pos.length === 0) return toast(t(lang, "emptySelection"), true);
  sequence = extractPages(sequence, pos);
  clearSelection();
  renderGrid();
  renderStatus();
  toast(t(lang, "extractedInfo", { n: pos.length, m: sequence.length }));
}

function actDelete(): void {
  const pos = selectedPositions();
  if (pos.length === 0) return toast(t(lang, "emptySelection"), true);
  sequence = deletePages(sequence, pos);
  clearSelection();
  renderGrid();
  renderStatus();
  toast(t(lang, "deletedInfo", { n: pos.length, m: sequence.length }));
}

function actRotate(delta: number): void {
  const pos = selectedPositions();
  const targets = pos.length > 0 ? pos : [];
  sequence = rotatePages(sequence, targets, delta);
  renderGrid();
  renderStatus();
  toast(t(lang, "rotatedInfo", { n: targets.length || sequence.length, d: Math.abs(delta) }));
}

function actReset(): void {
  sequence = buildSequence(handles);
  clearSelection();
  renderGrid();
  renderStatus();
  toast(t(lang, "resetInfo", { n: sequence.length }));
}

function actRange(): void {
  const input = el.rangeInput.value.trim();
  if (!input) return;
  const { pages, warnings } = parseRange(input, sequence.length);
  if (warnings.length > 0) {
    toast(t(lang, "rangeInvalid", { name: warnings.join(", ") }), true);
  }
  if (pages.length === 0) return;
  clearSelection();
  for (const p of pages) selection.add(keyOf(sequence[p - 1]!));
  anchor = pages[pages.length - 1]! - 1;
  renderGrid();
  renderStatus();
  toast(t(lang, "rangeSelected", { n: pages.length }));
}

async function actExport(): Promise<void> {
  if (sequence.length === 0 || el.btnExport.disabled) return;
  el.btnExport.disabled = true;
  const label = el.btnExport.textContent;
  el.btnExport.textContent = t(lang, "exporting");
  try {
    const map = new Map(handles.map((h) => [h.id, h]));
    const bytes = await exportPdf(map, sequence);
    const name = `pdf-toolkit-${new Date().toISOString().slice(0, 19).replaceAll(":", "")}.pdf`;
    downloadPdf(bytes, name);
    toast(t(lang, "exportedInfo", { n: sequence.length, name }));
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e), true);
  } finally {
    el.btnExport.disabled = false;
    el.btnExport.textContent = label ?? t(lang, "export");
  }
}

function removeFile(id: string): void {
  const target = handles.find((h) => h.id === id);
  handles = handles.filter((h) => h.id !== id);
  sequence = removeFiles(sequence, new Set([id]));
  selection = new Set([...selection].filter((k) => !k.startsWith(`${id}:`)));
  void renderer.destroy(id);
  renderAll();
  if (target) toast(t(lang, "removedInfo", { name: target.name }));
}

// ---------- wiring ----------
function wire(): void {
  el.btnChoose.addEventListener("click", () => el.fileInput.click());
  el.fileInput.addEventListener("change", () => {
    void handleFiles(el.fileInput.files ?? []);
    el.fileInput.value = "";
  });
  el.btnSamples.addEventListener("click", () => void loadSamples());

  for (const zone of [el.dropzone, document]) {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      el.dropzone.classList.add("dragover");
    });
  }
  el.dropzone.addEventListener("dragleave", () => el.dropzone.classList.remove("dragover"));
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    el.dropzone.classList.remove("dragover");
    if (e.dataTransfer?.files.length) void handleFiles(e.dataTransfer.files);
  });

  el.btnRangeApply.addEventListener("click", actRange);
  el.rangeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      actRange();
    }
  });
  el.btnAll.addEventListener("click", () => {
    selection = new Set(sequence.map(keyOf));
    renderGrid();
    renderStatus();
  });
  el.btnNone.addEventListener("click", () => {
    clearSelection();
    renderGrid();
    renderStatus();
  });

  el.btnExtract.addEventListener("click", actExtract);
  el.btnDelete.addEventListener("click", actDelete);
  el.btnRotl.addEventListener("click", () => actRotate(-90));
  el.btnRotr.addEventListener("click", () => actRotate(90));
  el.btnReset.addEventListener("click", actReset);
  el.btnExport.addEventListener("click", () => void actExport());

  el.btnLang.addEventListener("click", () => {
    lang = lang === "en" ? "ja" : "en";
    localStorage.setItem("lpt.lang", lang);
    applyI18n();
  });
  const nextTheme = initTheme();
  el.btnTheme.addEventListener("click", () => cycleTheme(nextTheme()));
}

function main(): void {
  wire();
  applyI18n();
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => undefined);
  }
}

main();
