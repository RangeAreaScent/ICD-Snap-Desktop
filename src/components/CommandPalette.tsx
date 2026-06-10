import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { searchCodes } from "../api";
import { useAppData } from "../state";
import type { SearchResult } from "../types";

/** Phase C (SNAP_DESKTOP_IMPROVEMENT_PLAN.md) — ⌘K command palette.
 *
 * Single overlay that unifies:
 *   - ICD code search (debounced, only when query has substance)
 *   - Favorite jumps (top 3, idle only)
 *   - Navigation actions (tab jumps, always available via fuzzy match)
 *
 * Noise prevention rules:
 *   1. Codes group only renders when query.length >= 2 — short prefixes
 *      flood the list with chapter-roots that aren't actionable here.
 *   2. Favorites only render when query is empty — once the user types,
 *      the only relevant matches are codes + tab navigation.
 *   3. Go to is always shown, but cmdk's fuzzy filter hides irrelevant
 *      ones as the user types.
 *   4. Group limits (5/3) keep the list under a single screen.
 *
 * Note: ICD Snap has no Recent codes feature or domain mode toggle, so
 * the Recent and Actions groups are intentionally absent.
 */

type Tab = "search" | "favorites" | "collections" | "settings";

interface Props {
  open: boolean;
  onClose: () => void;
  onJumpToCode: (code: string) => void;
  onJumpToTab: (tab: Tab) => void;
}

export function CommandPalette({
  open,
  onClose,
  onJumpToCode,
  onJumpToTab,
}: Props) {
  const [query, setQuery] = useState("");
  const [codeResults, setCodeResults] = useState<SearchResult[]>([]);
  const { favorites } = useAppData();

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setCodeResults([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      searchCodes(q, 5)
        .then((r) => {
          if (active) setCodeResults(r);
        })
        .catch(() => {
          if (active) setCodeResults([]);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  if (!open) return null;

  const trimmed = query.trim();
  const showIdleSuggestions = trimmed.length === 0;
  const showCodes = trimmed.length >= 2 && codeResults.length > 0;

  function jumpCode(code: string) {
    onJumpToCode(code);
    onClose();
  }
  function jumpTab(tab: Tab) {
    onJumpToTab(tab);
    onClose();
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      label="Command palette"
      className="cmdk-root"
    >
      <Command.Input
        placeholder="Type an ICD code, diagnosis, or command…"
        value={query}
        onValueChange={setQuery}
        className="cmdk-input"
        autoFocus
      />
      <Command.List className="cmdk-list">
        <Command.Empty className="cmdk-empty">No matches</Command.Empty>

        {showCodes && (
          <Command.Group heading="ICD codes" className="cmdk-group">
            {codeResults.map((r) => (
              <Command.Item
                key={`code-${r.code}`}
                value={`${r.code} ${r.description}`}
                onSelect={() => jumpCode(r.code)}
                className="cmdk-item"
              >
                <span className="cmdk-item__code">{r.code}</span>
                <span className="cmdk-item__desc">{r.description}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {showIdleSuggestions && favorites.length > 0 && (
          <Command.Group heading="Favorites" className="cmdk-group">
            {favorites.slice(0, 3).map((f) => (
              <Command.Item
                key={`fav-${f.code}`}
                value={`favorite ${f.code} ${f.description}`}
                onSelect={() => jumpCode(f.code)}
                className="cmdk-item"
              >
                <span className="cmdk-item__code">{f.code}</span>
                <span className="cmdk-item__desc">{f.description}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Go to" className="cmdk-group">
          <Command.Item
            value="go to search"
            onSelect={() => jumpTab("search")}
            className="cmdk-item"
          >
            <span className="cmdk-item__icon">⌕</span>
            <span className="cmdk-item__label">Search</span>
            <span className="cmdk-item__hint">⌘1</span>
          </Command.Item>
          <Command.Item
            value="go to favorites"
            onSelect={() => jumpTab("favorites")}
            className="cmdk-item"
          >
            <span className="cmdk-item__icon">★</span>
            <span className="cmdk-item__label">Favorites</span>
            <span className="cmdk-item__hint">⌘2</span>
          </Command.Item>
          <Command.Item
            value="go to collections lists"
            onSelect={() => jumpTab("collections")}
            className="cmdk-item"
          >
            <span className="cmdk-item__icon">🗂</span>
            <span className="cmdk-item__label">Collections</span>
            <span className="cmdk-item__hint">⌘3</span>
          </Command.Item>
          <Command.Item
            value="go to settings preferences"
            onSelect={() => jumpTab("settings")}
            className="cmdk-item"
          >
            <span className="cmdk-item__icon">⚙</span>
            <span className="cmdk-item__label">Settings</span>
            <span className="cmdk-item__hint">⌘,</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
