/** EN / JA interface strings. {n}/{m}/{name} are replaced by t(). */

export type Lang = "en" | "ja";

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    privacyBanner:
      "🔒 <b>100% client-side.</b> Your PDFs are processed by this page and never leave your device — no upload, no server, works offline.",
    dropTitle: "Drop PDFs here",
    dropSub: "They are opened locally in your browser — nothing is uploaded anywhere.",
    choose: "📄 Choose PDFs",
    samples: "✨ Load sample PDFs",
    files: "Files",
    reorderHint: "drag to reorder · merge order follows this list",
    rangePh: "e.g. 1-3, 5, 8-",
    apply: "Select",
    all: "All",
    none: "None",
    extract: "⬇ Extract selected",
    deletePages: "✕ Delete selected",
    reset: "↺ Reset",
    export: "Export PDF",
    noUpload: "no upload, no server",
    selectedLabel: "selected",
    filesLabel: "files",
    pagesLabel: "pages",
    loadedInfo: "Loaded {n} file(s), {m} pages total",
    extractedInfo: "Extracted {n} page(s) — sequence is now {m} pages",
    deletedInfo: "Deleted {n} page(s) — sequence is now {m} pages",
    rotatedInfo: "Rotated {n} page(s) {d}°",
    resetInfo: "Reset to the original {n} pages",
    exportedInfo: "Exported {n} pages → {name}",
    emptySelection: "Select pages first (click them, or use the range field)",
    rangeInvalid: "Ignored invalid token(s): {name}",
    rangeSelected: "Selected {n} page(s)",
    loadFailed: "Could not open {name} — password-protected or damaged?",
    removedInfo: "Removed {name}",
    exporting: "Exporting…",
  },
  ja: {
    privacyBanner:
      "🔒 <b>100%ブラウザ内処理。</b> PDFはこのページ内で処理され、端末の外に出ることはありません — アップロードなし・サーバーなし・オフライン動作。",
    dropTitle: "ここにPDFをドロップ",
    dropSub: "ブラウザ内でローカルに開きます — どこにもアップロードされません。",
    choose: "📄 PDFを選択",
    samples: "✨ サンプルPDFを読み込む",
    files: "ファイル",
    reorderHint: "ドラッグで並べ替え · 結合順はこのリスト順です",
    rangePh: "例: 1-3, 5, 8-",
    apply: "選択",
    all: "全て",
    none: "解除",
    extract: "⬇ 選択ページを抽出",
    deletePages: "✕ 選択ページを削除",
    reset: "↺ 元に戻す",
    export: "PDFを出力",
    noUpload: "アップロードなし・サーバーなし",
    selectedLabel: "選択",
    filesLabel: "ファイル",
    pagesLabel: "ページ",
    loadedInfo: "{n}個のファイル(計{m}ページ)を読み込みました",
    extractedInfo: "{n}ページを抽出しました — 現在{m}ページ",
    deletedInfo: "{n}ページを削除しました — 現在{m}ページ",
    rotatedInfo: "{n}ページを{d}°回転しました",
    resetInfo: "元の{n}ページに戻しました",
    exportedInfo: "{n}ページを出力しました → {name}",
    emptySelection: "先にページを選択してください(クリック、または範囲入力)",
    rangeInvalid: "無効な指定を無視しました: {name}",
    rangeSelected: "{n}ページを選択しました",
    loadFailed: "{name} を開けませんでした — パスワード保護か破損の可能性",
    removedInfo: "{name} を削除しました",
    exporting: "出力中…",
  },
};

export function detectLang(): Lang {
  const saved = localStorage.getItem("lpt.lang");
  if (saved === "en" || saved === "ja") return saved;
  return navigator.language?.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function t(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
