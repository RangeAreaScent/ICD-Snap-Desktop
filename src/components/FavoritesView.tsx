import { ask, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useListKeyNav } from "../hooks/useListKeyNav";
import { useAppData } from "../state";
import type { Favorite, SearchResult } from "../types";
import { CodeRow } from "./CodeRow";
import { showToast } from "./Toaster";

interface Props {
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

export function FavoritesView({ selectedCode, onSelect }: Props) {
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useAppData();

  /** Polish §10.3 — multi-select mode for bulk add-to-collection / export /
   * removal. When `selecting` is true, ↑↓ navigation is disabled (rows
   * become checkboxes). Selection cleared on tab change via parent
   * unmount. */
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [movingToCollection, setMovingToCollection] = useState(false);

  useListKeyNav(selecting ? [] : favorites, selectedCode, onSelect);

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

  // Reuses the same `export_pdf` Rust command the Collections view uses,
  // shaping favorite rows into the export entry struct (block/category
  // omitted — favorites only carry chapter).
  async function bulkExport() {
    const items = pickedFavorites();
    if (items.length === 0) return;
    const path = await save({
      defaultPath: `favorites-${items.length}-codes.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!path) return;
    try {
      await invoke("export_pdf", {
        path,
        title: `Favorites (${items.length} codes)`,
        entries: items.map((f) => ({
          code: f.code,
          description: f.description,
          note: "",
          billable: f.isBillable ? "Yes" : "No",
          chapter: f.chapterDescription,
          block: "",
          category: "",
        })),
      });
      showToast("PDF saved");
      cancelSelect();
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
          <button
            className="pane-header__action"
            onClick={() => setSelecting(true)}
            title="Select multiple"
            aria-label="Select multiple favorites"
          >
            ☐
          </button>
        )}
      </div>

      {selecting && (
        <div className="multi-bar">
          <span className="multi-bar__count">{picked.size} selected</span>
          <div className="multi-bar__actions">
            <button
              className="icon-btn"
              onClick={() => setMovingToCollection(true)}
              disabled={picked.size === 0}
              title="Add to a collection"
            >
              📁
            </button>
            <button
              className="icon-btn"
              onClick={bulkExport}
              disabled={picked.size === 0}
              title="Export as PDF"
            >
              📄
            </button>
            <button
              className="icon-btn icon-btn--danger"
              onClick={bulkRemove}
              disabled={picked.size === 0}
              title="Remove from favorites"
            >
              🗑
            </button>
            <button className="icon-btn" onClick={cancelSelect} title="Cancel">
              ✕
            </button>
          </div>
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
            <p>Tap the ☆ on any code to save it here.</p>
          </div>
        )}
        {favorites.map((fav) => {
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
                    {fav.isBillable ? (
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
            <button className="modal__close" onClick={onClose}>
              ✕
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
          <button className="modal__close" onClick={onClose}>
            ✕
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
