import type { Collection, Favorite, SearchResult } from "./types";

type Rows = Map<string, SearchResult>;

interface Snapshot {
  code: string;
  description: string;
  isBillable: boolean;
  chapterDescription: string;
}

/** Favorites and collection items keep a snapshot of a code's text and billable
 *  flag. After the bundled data is replaced (every October) the snapshot of a
 *  code that still exists is brought up to date. Returns the same object when
 *  nothing changed, so an unchanged list is never rewritten to disk. */
function refreshOne<T extends Snapshot>(item: T, rows: Rows): T {
  const row = rows.get(item.code);
  if (!row) return item;
  if (
    row.description === item.description &&
    row.isBillable === item.isBillable &&
    row.chapterDescription === item.chapterDescription
  ) {
    return item;
  }
  return {
    ...item,
    description: row.description,
    isBillable: row.isBillable,
    chapterDescription: row.chapterDescription,
  };
}

export function refreshFavorites(prev: Favorite[], rows: Rows): Favorite[] {
  const next = prev.map((f) => refreshOne(f, rows));
  return next.some((f, i) => f !== prev[i]) ? next : prev;
}

export function refreshCollections(prev: Collection[], rows: Rows): Collection[] {
  let changed = false;
  const next = prev.map((c) => {
    const items = c.items.map((i) => refreshOne(i, rows));
    if (items.some((i, k) => i !== c.items[k])) {
      changed = true;
      return { ...c, items };
    }
    return c;
  });
  return changed ? next : prev;
}

/** Saved codes the current data no longer contains. */
export function missingFrom(codes: string[], rows: Rows): Set<string> {
  return new Set(codes.filter((c) => !rows.has(c)));
}
