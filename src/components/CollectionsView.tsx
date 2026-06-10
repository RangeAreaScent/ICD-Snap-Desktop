import { ask, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { exportCollectionCSV, exportCollectionPDF } from "../export";
import { useListKeyNav } from "../hooks/useListKeyNav";
import { useAppData } from "../state";
import type { Collection } from "../types";
import { AddCodeModal } from "./AddCodeModal";
import { CollectionFormModal } from "./CollectionFormModal";
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
  const { collections, createCollection, collectionsMax, promptPremium } =
    useAppData();
  const [creating, setCreating] = useState(false);

  const atLimit = collections.length >= collectionsMax;
  function startNew() {
    if (atLimit) {
      promptPremium(
        "The free plan keeps up to 10 collections. " +
          "Unlock unlimited collections with premium.",
      );
    } else {
      setCreating(true);
    }
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
        >
          ＋
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
  const { notes, renameCollection, deleteCollection, removeFromCollection } =
    useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"rename" | "addcode" | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /** Multi-select mode mirrors Favorites: pick rows, then export or
   * remove. Single-row ✕ button is gone — single-row removal happens
   * through select-one + 🗑 to keep one removal path. */
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useListKeyNav(
    selecting ? [] : collection.items,
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
    const path = await save({
      defaultPath: `${collection.name}-selection.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!path) return;
    try {
      await invoke("export_pdf", {
        path,
        title: `${collection.name} (selection)`,
        entries: items.map((it) => ({
          code: it.code,
          description: it.description,
          note: notes[it.code]?.text ?? "",
          billable: it.isBillable ? "Yes" : "No",
          chapter: it.chapterDescription,
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

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function flash(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg((m) => (m === msg ? null : m)), 2000);
  }

  async function copyAll() {
    setMenuOpen(false);
    if (collection.items.length === 0) return;
    await navigator.clipboard.writeText(
      collection.items.map((i) => i.code).join(", "),
    );
    flash("Codes copied");
  }

  async function exportCSV() {
    setMenuOpen(false);
    try {
      if (await exportCollectionCSV(collection, notes)) flash("CSV saved");
    } catch (e) {
      flash(`Export failed: ${e}`);
    }
  }

  async function exportPDF() {
    setMenuOpen(false);
    if (collection.items.length === 0) return;
    try {
      if (await exportCollectionPDF(collection, notes)) flash("PDF saved");
    } catch (e) {
      flash(`Export failed: ${e}`);
    }
  }

  async function confirmDelete() {
    setMenuOpen(false);
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
        <button className="back-btn" onClick={onBack} title="Back">
          ‹
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
        {collection.items.length > 0 && !selecting && (
          <button
            className="pane-header__action"
            onClick={() => setSelecting(true)}
            title="Select codes"
            aria-label="Select codes"
          >
            ☐
          </button>
        )}
        <div className="menu-wrap" ref={menuRef}>
          <button
            className="pane-header__action"
            title="Actions"
            onClick={() => setMenuOpen((o) => !o)}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="menu">
              <button
                className="menu__item"
                onClick={() => {
                  setMenuOpen(false);
                  setModal("addcode");
                }}
              >
                Add code
              </button>
              <button className="menu__item" onClick={copyAll}>
                Copy all codes
              </button>
              <button className="menu__item" onClick={exportCSV}>
                Export as CSV…
              </button>
              <button className="menu__item" onClick={exportPDF}>
                Export as PDF…
              </button>
              <button
                className="menu__item"
                onClick={() => {
                  setMenuOpen(false);
                  setModal("rename");
                }}
              >
                Rename
              </button>
              <button
                className="menu__item menu__item--danger"
                onClick={confirmDelete}
              >
                Delete collection
              </button>
            </div>
          )}
        </div>
      </div>

      {selecting && (
        <div className="multi-bar">
          <span className="multi-bar__count">{picked.size} selected</span>
          <div className="multi-bar__actions">
            <button
              className="icon-btn"
              onClick={bulkExport}
              disabled={picked.size === 0}
              title="Export selection as PDF"
            >
              📄
            </button>
            <button
              className="icon-btn icon-btn--danger"
              onClick={bulkRemove}
              disabled={picked.size === 0}
              title="Remove from collection"
            >
              🗑
            </button>
            <button className="icon-btn" onClick={cancelSelect} title="Cancel">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="list-scroll">
        {collection.items.length === 0 && (
          <div className="state-msg">
            <p className="state-msg__title">Empty collection</p>
            <p>Use the ⋯ menu to add codes.</p>
          </div>
        )}
        {collection.items.map((item) => {
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
                    {item.isBillable ? (
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
                  {item.isBillable ? (
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
