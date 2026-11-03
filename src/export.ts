import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { getCodeDetail } from "./api";
import type { Collection, NoteMap } from "./types";

/** What an export needs from a saved code (a Favorite or a CollectionItem). */
export interface ExportItem {
  code: string;
  description: string;
  isBillable: boolean;
  chapterDescription: string;
}

interface ExportOptions {
  /** File name without extension for the save dialog (default: the list name). */
  fileStem?: string;
  /** Heading inside the PDF (default: the list name). */
  title?: string;
}

interface ExportEntry {
  code: string;
  description: string;
  note: string;
  billable: string;
  chapter: string;
  block: string;
  category: string;
}

/** Marks saved codes that the current data no longer contains: they are exported
 *  as non-billable with "[Not in FY 20xx]" after the description. */
export interface ExportMark {
  isMissing: (code: string) => boolean;
  label: string;
}

export function markEntry<T extends { code: string; description: string; billable: string }>(
  entry: T,
  mark?: ExportMark,
): T {
  return mark?.isMissing(entry.code)
    ? { ...entry, description: `${entry.description} [${mark.label}]`, billable: "No" }
    : entry;
}

/** Enriches collection items with full CDC classification + the saved note.
 *  Block/category aren't stored on the collection item, so they're fetched
 *  fresh from the database at export time. */
async function buildEntries(
  items: ExportItem[],
  notes: NoteMap,
  mark?: ExportMark,
): Promise<ExportEntry[]> {
  const details = await Promise.all(
    items.map((i) => getCodeDetail(i.code).catch(() => null)),
  );
  return items.map((item, idx) => {
    const d = details[idx];
    return markEntry({
      code: item.code,
      description: d?.description ?? item.description,
      note: notes[item.code]?.text ?? "",
      billable: (d?.isBillable ?? item.isBillable) ? "Yes" : "No",
      chapter: d?.chapterDescription ?? item.chapterDescription,
      block: d?.blockDescription ?? "",
      category: d?.categoryDescription ?? "",
    }, mark);
  });
}

/** RFC 4180 quoting. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const CSV_HEADER = [
  "Code",
  "Description",
  "Note",
  "Billable",
  "Chapter",
  "Block",
  "Category",
];

/** Opens a native save dialog and writes the list as CSV.
 *  Returns false if the user cancelled. */
export async function exportItemsCSV(
  name: string,
  items: ExportItem[],
  notes: NoteMap,
  mark?: ExportMark,
  opts: ExportOptions = {},
): Promise<boolean> {
  const path = await save({
    defaultPath: `${opts.fileStem ?? name}.csv`,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });
  if (!path) return false;

  const entries = await buildEntries(items, notes, mark);
  const rows = [
    CSV_HEADER,
    ...entries.map((e) => [
      e.code,
      e.description,
      e.note,
      e.billable,
      e.chapter,
      e.block,
      e.category,
    ]),
  ];
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  await invoke("write_text_file", { path, content: csv });
  return true;
}

/** Opens a native save dialog and writes the list as a PDF
 *  (generated natively in Rust). Returns false if the user cancelled. */
export async function exportItemsPDF(
  name: string,
  items: ExportItem[],
  notes: NoteMap,
  mark?: ExportMark,
  opts: ExportOptions = {},
): Promise<boolean> {
  const path = await save({
    defaultPath: `${opts.fileStem ?? name}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!path) return false;

  const entries = await buildEntries(items, notes, mark);
  await invoke("export_pdf", { path, title: opts.title ?? name, entries });
  return true;
}

export function exportCollectionCSV(c: Collection, notes: NoteMap, mark?: ExportMark): Promise<boolean> {
  return exportItemsCSV(c.name, c.items, notes, mark);
}

export function exportCollectionPDF(c: Collection, notes: NoteMap, mark?: ExportMark): Promise<boolean> {
  return exportItemsPDF(c.name, c.items, notes, mark);
}
