import { ask } from "@tauri-apps/plugin-dialog";
import { ChevronLeft, Ellipsis, FileDown, FileText, Plus, Sheet, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { exportCollectionCSV, exportCollectionPDF, exportItemsPDF } from "../export";
import { useDataset } from "../dataset";
import { useListKeyNav } from "../hooks/useListKeyNav";
import { useAppData } from "../state";
import type { Collection } from "../types";
import { AddCodeModal } from "./AddCodeModal";
import { CollectionFormModal } from "./CollectionFormModal";
import { ActionMenu, MenuItem } from "./Menu";
import { showToast } from "./Toaster";

interface Props {
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

export function CollectionsView({ selectedCode, onSelect }: Props) {
  const { collections } = useAppData();
  const [openId, setOpenId] = useState<string | null>(null);

  const open = collections.find((c) => c.id === openId) ?? null;

  // The open collection was deleted elsewhere — fall back to the list.
  useEffect(() => {
    if (openId && !open) setOpenId(null);
  }, [openId, open]);

  if (open) {
    return (
      <CollectionDetail
        collection={open}
        selectedCode={selectedCode}
        onSelect={onSelect}
        onBack={() => setOpenId(null)}
      />
    );
  }
  return <CollectionList onOpen={setOpenId} />;
}

function CollectionList({ onOpen }: { onOpen: (id: string) => void }) {
  const { collections, createCollection } = useAppData();
  const [creating, setCreating] = useState(false);

  function startNew() {
    setCreating(true);
  }

  return (
    <div className="list-pane">
      <div className="pane-header">
        <h2 className="pane-header__title">Collections</h2>
        <span className="pane-header__count">{collections.length}</span>
        <button
          className="pane-header__action"
          title="New collection"
          onClick={startNew}
          aria-label="New collection"
        >
          <Plus />
        </button>
      </div>
      <div className="list-scroll">
        {collections.length === 0 && (
          <div className="state-msg">
            <p className="state-msg__title">No collections yet</p>
            <p>Group related codes — e.g. "Annual physical", "Diabetes".</p>
          </div>
        )}
        {collections.map((c) => (
          <button
            key={c.id}
            className="collection-row"
            onClick={() => onOpen(c.id)}
          >
            <span className="collection-row__emoji">{c.emoji}</span>
            <span className="collection-row__main">
              <span className="collection-row__name">{c.name}</span>
              <span className="collection-row__count">
                {c.items.length} code{c.items.length === 1 ? "" : "s"}
              </span>
            </span>
            <span className="collection-row__chevron">›</span>
          </button>
        ))}
      </div>

      {creating && (
        <CollectionFormModal
          title="New collection"
          submitLabel="Create"
          onClose={() => setCreating(false)}
          onSubmit={(name, emoji) => createCollection(name, emoji)}
        />
      )}
    </div>
  );
}

interface DetailProps {
  collection: Collection;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  onBack: () => void;
}

function CollectionDetail({
  collection,
  selectedCode,
  onSelect,
  onBack,
}: DetailProps) {
  const { notes, renameCollection, deleteCollection, removeFromCollection, isMissing } =
    useAppData();
  const ds = useDataset();
  const mark = { isMissing, label: ds.missingLabel };
  const [modal, setModal] = useState<"rename" | "addcode" | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const visibleItems = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return collection.items;
    return collection.items.filter(
      (i) => i.code.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
    );
  }, [collection.items, filterText]);

  /** Multi-select mode mirrors Favorites: pick rows, then export or
   * remove. Single-row removal happens through select-one + Remove to
   * keep one removal path. */
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useListKeyNav(
    selecting ? [] : visibleItems,
    selectedCode,
    onSelect,
  );

  useEffect(() => {
    if (collection.items.length === 0 && selecting) {
      setSelecting(false);
      setPicked(new Set());
    }
  }, [collection.items.length, selecting]);

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

  async function bulkRemove() {
    if (picked.size === 0) return;
    const n = picked.size;
    const ok = await ask(
      `Remove ${n} code${n === 1 ? "" : "s"} from "${collection.name}"? ` +
        "This cannot be undone.",
      { title: "Remove from collection", kind: "warning" },
    );
    if (!ok) return;
    picked.forEach((c) => removeFromCollection(collection.id, c));
    cancelSelect();
    showToast(`Removed ${n} code${n === 1 ? "" : "s"}`);
  }

  async function bulkExport() {
    if (picked.size === 0) return;
    const items = collection.items.filter((i) => picked.has(i.code));
    try {
      const saved = await exportItemsPDF(collection.name, items, notes, mark, {
        title: `${collection.name} (selection)`,
        fileStem: `${collection.name}-selection`,
      });
      if (saved) {
        showToast("PDF saved");
        cancelSelect();
      }
    } catch (e) {
      showToast(`Export failed: ${e}`);
    }
  }

  function flash(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg((m) => (m === msg ? null : m)), 2000);
  }

  async function copyAll() {
    if (collection.items.length === 0) return;
    await navigator.clipboard.writeText(
      collection.items.map((i) => i.code).join(", "),
    );
    flash("Codes copied");
  }

  async function exportCSV() {
    try {
      if (await exportCollectionCSV(collection, notes, mark)) flash("CSV saved");
    } catch (e) {
      flash(`Export failed: ${e}`);
    }
  }

  async function exportPDF() {
    if (collection.items.length === 0) return;
    try {
      if (await exportCollectionPDF(collection, notes, mark)) flash("PDF saved");
    } catch (e) {
      flash(`Export failed: ${e}`);
    }
  }

  async function confirmDelete() {
    const ok = await ask(
      `Delete "${collection.name}"? This cannot be undone.`,
      { title: "Delete collection", kind: "warning" },
    );
    if (ok) {
      deleteCollection(collection.id);
      onBack();
    }
  }

  return (
    <div className="list-pane">
      <div className="pane-header pane-header--detail">
        <button className="back-btn" onClick={onBack} title="Back" aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="collection-head">
          <span className="collection-head__emoji">{collection.emoji}</span>
          <div>
            <div className="collection-head__name">{collection.name}</div>
            <div className="collection-head__count">
              {collection.items.length} code
              {collection.items.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        {!selecting && (
          <div className="pane-header__tools">
            <button
              className="pane-header__action"
              onClick={() => setModal("addcode")}
              title="Add a code"
              aria-label="Add a code"
            >
              <Plus />
            </button>
            {collection.items.length > 0 && (
              <button
                className="pane-header__action"
                onClick={() => setSelecting(true)}
                title="Select codes"
                aria-label="Select codes"
              >
                <Square />
              </button>
            )}
            {collection.items.length > 0 && (
              <ActionMenu icon={<FileDown />} title="Export collection">
                {(close) => (
                  <>
                    <MenuItem
                      icon={<FileText size={15} />}
                      onClick={() => {
                        close();
                        void exportPDF();
                      }}
                    >
                      Export PDF
                    </MenuItem>
                    <MenuItem
                      icon={<Sheet size={15} />}
                      onClick={() => {
                        close();
                        void exportCSV();
                      }}
                    >
                      Export CSV
                    </MenuItem>
                  </>
                )}
              </ActionMenu>
            )}
            <ActionMenu icon={<Ellipsis />} title="Actions">
              {(close) => (
                <>
                  <MenuItem
                    onClick={() => {
                      close();
                      void copyAll();
                    }}
                  >
                    Copy all codes
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      close();
                      setModal("rename");
                    }}
                  >
                    Rename
                  </MenuItem>
                  <MenuItem
                    danger
                    onClick={() => {
                      close();
                      void confirmDelete();
                    }}
                  >
                    Delete collection
                  </MenuItem>
                </>
              )}
            </ActionMenu>
          </div>
        )}
      </div>

      {collection.items.length > 0 && (
        <input
          className="filter-input"
          placeholder="Filter codes"
          aria-label="Filter codes"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      )}

      {selecting && (
        <div className="select-bar">
          <span className="select-bar__count">{picked.size} selected</span>
          <button
            className="btn btn--small"
            onClick={() => setPicked(new Set(visibleItems.map((i) => i.code)))}
          >
            Select all
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

      <div className="list-scroll">
        {collection.items.length === 0 && (
          <div className="state-msg">
            <p className="state-msg__title">Empty collection</p>
            <p>Use the + button to add codes.</p>
          </div>
        )}
        {collection.items.length > 0 && visibleItems.length === 0 && (
          <div className="state-msg">
            <p className="state-msg__title">No matches</p>
            <p>No code matches “{filterText}”.</p>
          </div>
        )}
        {visibleItems.map((item) => {
          if (selecting) {
            const isPicked = picked.has(item.code);
            return (
              <label
                key={item.code}
                className={`code-row code-row--pickable${
                  isPicked ? " code-row--picked" : ""
                }`}
                data-code={item.code}
              >
                <input
                  type="checkbox"
                  className="code-row__check"
                  checked={isPicked}
                  onChange={() => togglePick(item.code)}
                />
                <div className="code-row__main">
                  <div className="code-row__top">
                    <span className="code-row__code">{item.code}</span>
                    {isMissing(item.code) ? (
                      <span className="badge badge--missing">{ds.missingLabel}</span>
                    ) : item.isBillable ? (
                      <span className="badge badge--billable">Billable</span>
                    ) : (
                      <span className="badge badge--nonbillable">
                        Non-billable
                      </span>
                    )}
                  </div>
                  <div className="code-row__desc">{item.description}</div>
                </div>
              </label>
            );
          }

          return (
            <div
              key={item.code}
              className={`code-row${
                item.code === selectedCode ? " code-row--selected" : ""
              }`}
              data-code={item.code}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item.code)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item.code);
                }
              }}
            >
              <div className="code-row__main">
                <div className="code-row__top">
                  <span className="code-row__code">{item.code}</span>
                  {isMissing(item.code) ? (
                    <span className="badge badge--missing">{ds.missingLabel}</span>
                  ) : item.isBillable ? (
                    <span className="badge badge--billable">Billable</span>
                  ) : (
                    <span className="badge badge--nonbillable">
                      Non-billable
                    </span>
                  )}
                </div>
                <div className="code-row__desc">{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {statusMsg && <div className="inline-status">{statusMsg}</div>}

      {modal === "rename" && (
        <CollectionFormModal
          title="Rename collection"
          submitLabel="Save"
          initialName={collection.name}
          initialEmoji={collection.emoji}
          onClose={() => setModal(null)}
          onSubmit={(name, emoji) =>
            renameCollection(collection.id, name, emoji)
          }
        />
      )}
      {modal === "addcode" && (
        <AddCodeModal
          collectionId={collection.id}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
