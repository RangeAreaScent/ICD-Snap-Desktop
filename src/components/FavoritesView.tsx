import { useDataset } from "../dataset";
import { exportItemsCSV, exportItemsPDF } from "../export";
import { ask } from "@tauri-apps/plugin-dialog";
import { FileDown, FileText, Sheet, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useListKeyNav } from "../hooks/useListKeyNav";
import { useAppData } from "../state";
import type { Favorite, SearchResult } from "../types";
import { CodeRow } from "./CodeRow";
import { ActionMenu, MenuItem } from "./Menu";
import { showToast } from "./Toaster";

interface Props {
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

export function FavoritesView({ selectedCode, onSelect }: Props) {
  const { favorites, isFavorite, toggleFavorite, removeFavorite, isMissing } = useAppData();
  const ds = useDataset();
  const mark = { isMissing, label: ds.missingLabel };

  const [filterText, setFilterText] = useState("");
  const visible = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter(
      (f) => f.code.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    );
  }, [favorites, filterText]);

  /** Polish §10.3 — multi-select mode for bulk add-to-collection / export /
   * removal. When `selecting` is true, ↑↓ navigation is disabled (rows
   * become checkboxes). Selection cleared on tab change via parent
   * unmount. */
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [movingToCollection, setMovingToCollection] = useState(false);

  useListKeyNav(selecting ? [] : visible, selectedCode, onSelect);

  useEffect(() => {
    if (favorites.length === 0 && selecting) {
      setSelecting(false);
      setPicked(new Set());
    }
  }, [favorites.length, selecting]);

  function togglePick(code: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function cancelSelect() {
    setSelecting(false);
    setPicked(new Set());
  }

  function pickedFavorites(): Favorite[] {
    return favorites.filter((f) => picked.has(f.code));
  }

  async function bulkRemove() {
    if (picked.size === 0) return;
    const n = picked.size;
    const ok = await ask(
      `Remove ${n} favorite${n === 1 ? "" : "s"}? This cannot be undone.`,
      { title: "Remove favorites", kind: "warning" },
    );
    if (!ok) return;
    picked.forEach((c) => removeFavorite(c));
    cancelSelect();
    showToast(`Removed ${n} favorite${n === 1 ? "" : "s"}`);
  }

  // Favorites exports carry no notes (notes go into collection exports only).
  async function bulkExport() {
    const items = pickedFavorites();
    if (items.length === 0) return;
    try {
      const saved = await exportItemsPDF(`Favorites (${items.length} codes)`, items, {}, mark, {
        fileStem: `favorites-${items.length}-codes`,
      });
      if (saved) {
        showToast("PDF saved");
        cancelSelect();
      }
    } catch (e) {
      showToast(`Export failed: ${e}`);
    }
  }

  async function exportAll(format: "pdf" | "csv") {
    try {
      const run = format === "pdf" ? exportItemsPDF : exportItemsCSV;
      const saved = await run(`Favorites (${favorites.length} codes)`, favorites, {}, mark, {
        fileStem: `favorites-${favorites.length}-codes`,
      });
      if (saved) showToast(format === "pdf" ? "PDF saved" : "CSV saved");
    } catch (e) {
      showToast(`Export failed: ${e}`);
    }
  }

  return (
    <div className="list-pane">
      <div className="pane-header">
        <h2 className="pane-header__title">Favorites</h2>
        <span className="pane-header__count">{favorites.length}</span>
        {favorites.length > 0 && !selecting && (
          <div className="pane-header__tools">
            <ActionMenu icon={<FileDown />} title="Export all favorites">
              {(close) => (
                <>
                  <MenuItem
                    icon={<FileText size={15} />}
                    onClick={() => {
                      close();
                      void exportAll("pdf");
                    }}
                  >
                    Export all as PDF
                  </MenuItem>
                  <MenuItem
                    icon={<Sheet size={15} />}
                    onClick={() => {
                      close();
                      void exportAll("csv");
                    }}
                  >
                    Export all as CSV
                  </MenuItem>
                </>
              )}
            </ActionMenu>
            <button
              className="pane-header__action"
              onClick={() => setSelecting(true)}
              title="Select multiple"
              aria-label="Select multiple favorites"
            >
              <Square />
            </button>
          </div>
        )}
      </div>

      {favorites.length > 0 && (
        <input
          className="filter-input"
          placeholder="Filter favorites"
          aria-label="Filter favorites"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      )}

      {selecting && (
        <div className="select-bar">
          <span className="select-bar__count">{picked.size} selected</span>
          <button
            className="btn btn--small"
            onClick={() => setPicked(new Set(visible.map((f) => f.code)))}
          >
            Select all
          </button>
          <button
            className="btn btn--small"
            onClick={() => setMovingToCollection(true)}
            disabled={picked.size === 0}
          >
            Add to Collection
          </button>
          <button
            className="btn btn--small"
            onClick={bulkExport}
            disabled={picked.size === 0}
          >
            Export PDF
          </button>
          <button
            className="btn btn--small"
            onClick={bulkRemove}
            disabled={picked.size === 0}
          >
            Remove
          </button>
          <button className="btn btn--small select-bar__done" onClick={cancelSelect}>
            Done
          </button>
        </div>
      )}

      {movingToCollection && picked.size > 0 && (
        <BulkAddToCollection
          items={pickedFavorites()}
          onClose={() => setMovingToCollection(false)}
          onAdded={() => {
            setMovingToCollection(false);
            cancelSelect();
          }}
        />
      )}

      <div className="list-scroll">
        {favorites.length === 0 && (
          <div className="state-msg">
            <p className="state-msg__title">No favorites yet</p>
            <p>Click the star icon on any code to save it here.</p>
          </div>
        )}
        {favorites.length > 0 && visible.length === 0 && (
          <div className="state-msg">
            <p className="state-msg__title">No matches</p>
            <p>No favorite matches “{filterText}”.</p>
          </div>
        )}
        {visible.map((fav) => {
          const item: SearchResult = {
            code: fav.code,
            description: fav.description,
            isBillable: fav.isBillable,
            chapterDescription: fav.chapterDescription,
            blockDescription: "",
          };

          if (selecting) {
            const isPicked = picked.has(fav.code);
            return (
              <label
                key={fav.code}
                className={`code-row code-row--pickable${
                  isPicked ? " code-row--picked" : ""
                }`}
                data-code={fav.code}
              >
                <input
                  type="checkbox"
                  className="code-row__check"
                  checked={isPicked}
                  onChange={() => togglePick(fav.code)}
                />
                <div className="code-row__main">
                  <div className="code-row__top">
                    <span className="code-row__code">{fav.code}</span>
                    {isMissing(fav.code) ? (
                      <span className="badge badge--missing">{ds.missingLabel}</span>
                    ) : fav.isBillable ? (
                      <span className="badge badge--billable">Billable</span>
                    ) : (
                      <span className="badge badge--nonbillable">
                        Non-billable
                      </span>
                    )}
                  </div>
                  <div className="code-row__desc">{fav.description}</div>
                  {fav.chapterDescription && (
                    <div className="code-row__chapter">
                      {fav.chapterDescription}
                    </div>
                  )}
                </div>
              </label>
            );
          }

          return (
            <CodeRow
              key={fav.code}
              item={item}
              selected={fav.code === selectedCode}
              favorite={isFavorite(fav.code)}
              missing={isMissing(fav.code)}
              onSelect={() => onSelect(fav.code)}
              onToggleFavorite={() => toggleFavorite(item)}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Polish §10.3 — bulk "add to collection" modal. Re-uses state.tsx's
 * single-item `addToCollection` primitive in a loop. Skips items
 * already in the target collection silently. */
function BulkAddToCollection({
  items,
  onClose,
  onAdded,
}: {
  items: Favorite[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const { collections, addToCollection } = useAppData();

  function send(collectionId: string, name: string) {
    items.forEach((f) => {
      addToCollection(collectionId, {
        code: f.code,
        description: f.description,
        isBillable: f.isBillable,
        chapterDescription: f.chapterDescription,
        blockDescription: "",
      });
    });
    showToast(`Added ${items.length} to ${name}`);
    onAdded();
  }

  if (collections.length === 0) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h3 className="modal__title">No collections yet</h3>
            <button className="modal__close" onClick={onClose} aria-label="Close">
              <X />
            </button>
          </div>
          <div className="modal__body">
            <p className="settings-disclaimer">
              Create a collection from the Collections tab first, then come
              back to bulk-add favorites.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">
            Add {items.length} to a collection
          </h3>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="modal__body">
          <div className="bulk-collection-list">
            {collections.map((c) => (
              <button
                key={c.id}
                className="bulk-collection-row"
                onClick={() => send(c.id, c.name)}
              >
                <span className="bulk-collection-row__emoji">{c.emoji}</span>
                <span className="bulk-collection-row__name">{c.name}</span>
                <span className="bulk-collection-row__count">
                  {c.items.length} codes
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
