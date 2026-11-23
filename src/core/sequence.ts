/**
 * The working document is an ordered list of page references. Every operation
 * (extract / delete / rotate / reset / file reorder) is a pure transform of
 * this list, and export builds a fresh PDF from it.
 */

export interface LoadedFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
}

export interface PageRef {
  fileId: string;
  pageIndex: number; // 0-based within its source file
  rotation: number; // extra rotation on top of the original, 0/90/180/270
}

export const keyOf = (ref: PageRef): string => `${ref.fileId}:${ref.pageIndex}`;

/** All pages of every file, in file order — the initial sequence. */
export function buildSequence(files: LoadedFile[]): PageRef[] {
  const refs: PageRef[] = [];
  for (const f of files) {
    for (let i = 0; i < f.pageCount; i++) {
      refs.push({ fileId: f.id, pageIndex: i, rotation: 0 });
    }
  }
  return refs;
}

/** Keep only refs at the given 1-based sequence positions. */
export function extractPages(sequence: PageRef[], positions: number[]): PageRef[] {
  const keep = new Set(positions);
  return sequence.filter((_, i) => keep.has(i + 1));
}

/** Drop refs at the given 1-based sequence positions. */
export function deletePages(sequence: PageRef[], positions: number[]): PageRef[] {
  const drop = new Set(positions);
  return sequence.filter((_, i) => !drop.has(i + 1));
}

/** Rotate selected (or all, when positions is empty) by delta degrees. */
export function rotatePages(sequence: PageRef[], positions: number[], delta: number): PageRef[] {
  const targets = positions.length > 0 ? new Set(positions) : null;
  return sequence.map((ref, i) => {
    if (targets && !targets.has(i + 1)) return ref;
    return { ...ref, rotation: (((ref.rotation + delta) % 360) + 360) % 360 };
  });
}

/** Reorder by file: moves all pages of `fileId` to `toIndex`, keeping the
 *  current sequence (extract/delete results and rotations) intact. */
export function reorderFile<T extends LoadedFile>(
  sequence: PageRef[],
  files: T[],
  fileId: string,
  toIndex: number,
): { files: T[]; sequence: PageRef[] } {
  const from = files.findIndex((f) => f.id === fileId);
  if (from === -1 || toIndex < 0 || toIndex >= files.length || from === toIndex) {
    return { files, sequence };
  }
  const nextFiles = [...files];
  const [moved] = nextFiles.splice(from, 1);
  nextFiles.splice(toIndex, 0, moved!);
  const groups = new Map<string, PageRef[]>();
  for (const ref of sequence) {
    const group = groups.get(ref.fileId);
    if (group) group.push(ref);
    else groups.set(ref.fileId, [ref]);
  }
  const nextSequence: PageRef[] = [];
  for (const f of nextFiles) {
    const group = groups.get(f.id);
    if (group) nextSequence.push(...group);
  }
  return { files: nextFiles, sequence: nextSequence };
}

/** Drop every page belonging to removed files, keeping current order/rotations. */
export function removeFiles(sequence: PageRef[], removedIds: Set<string>): PageRef[] {
  return sequence.filter((ref) => !removedIds.has(ref.fileId));
}

/** Effective rotation when exporting: original page rotation + user delta. */
export function effectiveRotation(original: number, extra: number): number {
  return ((((original + extra) % 360) + 360) % 360);
}
