import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import "./styles.css";
import { getCodeDetail } from "./api";
import { CodeDetailView } from "./components/CodeDetailView";
import { CollectionsView } from "./components/CollectionsView";
import { CommandPalette } from "./components/CommandPalette";
import { FavoritesView } from "./components/FavoritesView";
import { OnboardingView } from "./components/OnboardingView";
import { PremiumPromptModal } from "./components/PremiumPromptModal";
import { SearchView } from "./components/SearchView";
import { SettingsView } from "./components/SettingsView";
import { Splitter } from "./components/Splitter";
import { StatusBar } from "./components/StatusBar";
import { showToast, Toaster } from "./components/Toaster";
import { AppDataProvider, useAppData } from "./state";
import { SettingsProvider, useSettings } from "./settings";

type Tab = "search" | "favorites" | "collections" | "settings";
type InfoPanel = "howToUse" | "database" | "about" | null;

function App() {
  return (
    <SettingsProvider>
      <AppDataProvider>
        <AppShell />
      </AppDataProvider>
    </SettingsProvider>
  );
}

/** Phase B: responsive breakpoint. Below this, the list-pane goes
 * full-width and the detail-pane overlays it. 900px keeps standard
 * 13-inch laptops on the split layout; only intentional narrow windows
 * trip the overlay. */
const NARROW_PX = 900;

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < NARROW_PX,
  );
  useEffect(() => {
    function onResize() {
      setNarrow(window.innerWidth < NARROW_PX);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return narrow;
}

function AppShell() {
  const [tab, setTab] = useState<Tab>("search");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const isNarrow = useIsNarrow();
  const [narrowDetailOpen, setNarrowDetailOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState<InfoPanel>(null);
  const { premiumPrompt, clearPremiumPrompt, isFavorite, toggleFavorite, removeFavorite } =
    useAppData();
  const { hasSeenOnboarding, dismissOnboarding } = useSettings();

  // Phase A — global desktop shortcuts.
  useEffect(() => {
    async function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inEditable = tag === "input" || tag === "textarea";
      const key = e.key.toLowerCase();

      if (key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (key === "f") {
        e.preventDefault();
        setTab("search");
        return;
      }
      if (e.key === "1") { e.preventDefault(); setTab("search"); return; }
      if (e.key === "2") { e.preventDefault(); setTab("favorites"); return; }
      if (e.key === "3") { e.preventDefault(); setTab("collections"); return; }
      if (e.key === "4") { e.preventDefault(); setTab("settings"); return; }
      if (e.key === ",") { e.preventDefault(); setTab("settings"); return; }

      // The rest need a selected code; while typing in an input, let
      // native ⌘C/⌘D through.
      if (inEditable) return;
      if (!selectedCode) return;

      if (key === "c") {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(selectedCode);
          showToast(`Copied ${selectedCode}`);
        } catch {
          showToast("Copy failed");
        }
        return;
      }
      if (key === "d") {
        e.preventDefault();
        if (isFavorite(selectedCode)) {
          removeFavorite(selectedCode);
          showToast("Removed from favorites");
          return;
        }
        try {
          const d = await getCodeDetail(selectedCode);
          if (!d) { showToast("Code not found"); return; }
          toggleFavorite({
            code: d.code,
            description: d.description,
            isBillable: d.isBillable,
            chapterDescription: d.chapterDescription,
            blockDescription: d.blockDescription,
          });
          showToast("Added to favorites");
        } catch {
          showToast("Failed to add favorite");
        }
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedCode, isFavorite, toggleFavorite, removeFavorite]);

  // Phase B narrow-window: row selection opens the detail overlay.
  const handleSelect = useCallback((code: string | null) => {
    setSelectedCode(code);
    if (code !== null) setNarrowDetailOpen(true);
  }, []);

  useEffect(() => {
    setNarrowDetailOpen(false);
  }, [tab]);

  // Phase D — wire native menu events to the same handlers the keyboard
  // shortcuts use. Menu IDs are defined in src-tauri/src/menu.rs and
  // must match exactly (kept stable as a hard-coded contract).
  //
  // Listeners register ONCE on mount and read live state via refs so we
  // never re-register. Previously the effect depended on selectedCode,
  // which unmounted + re-registered listeners every selection change —
  // async `listen()` resolution meant menu clicks during that window
  // could be silently dropped.
  const selectedCodeRef = useRef(selectedCode);
  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);

  useEffect(() => {
    const unlistens: Array<Promise<() => void>> = [];

    function on(id: string, fn: () => void) {
      // Tauri 2 event names disallow '.'. Menu IDs in menu.rs use dots
      // for scope readability (file.new_search) but the actual event
      // name substitutes '.' → '_' on both sides.
      const eventName = `menu:${id.replace(/\./g, "_")}`;
      unlistens.push(listen(eventName, fn));
    }

    function focusSearchInput() {
      setTab("search");
      setTimeout(() => {
        const input = document.querySelector(
          ".search-bar__input",
        ) as HTMLInputElement | null;
        input?.focus();
      }, 0);
    }

    on("file.new_search", focusSearchInput);
    on("file.command_palette", () => setPaletteOpen(true));
    on("file.export_collection", () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "e", metaKey: true }),
      );
    });

    on("edit.copy_code", () => {
      const code = selectedCodeRef.current;
      if (!code) {
        showToast("No code selected");
        return;
      }
      navigator.clipboard
        .writeText(code)
        .then(() => showToast(`Copied ${code}`))
        .catch(() => showToast("Copy failed"));
    });
    on("edit.find", focusSearchInput);

    on("view.tab_search", () => setTab("search"));
    on("view.tab_favorites", () => setTab("favorites"));
    on("view.tab_collections", () => setTab("collections"));
    on("view.tab_settings", () => setTab("settings"));
    on("view.reset_splitter", () => {
      localStorage.removeItem("snap.listWidth");
      document.documentElement.style.setProperty("--list-width", "380px");
      showToast("Splitter width reset");
    });

    on("help.how_to_use", () => {
      setTab("settings");
      setSettingsPanel("howToUse");
    });
    on("help.database_details", () => {
      setTab("settings");
      setSettingsPanel("database");
    });

    return () => {
      unlistens.forEach((p) => p.then((fn) => fn()).catch(() => {}));
    };
  }, []);

  // Phase B+C — Esc priority: cmdk owns its own Esc > narrow detail close > Search input focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (paletteOpen) return; // cmdk handles its own Esc

      if (isNarrow && narrowDetailOpen) {
        setNarrowDetailOpen(false);
        return;
      }

      if (tab === "search") {
        const active = document.activeElement as HTMLElement | null;
        const aTag = active?.tagName?.toLowerCase();
        if (aTag === "input" || aTag === "textarea") return;
        const input = document.querySelector(
          ".search-bar__input",
        ) as HTMLInputElement | null;
        input?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isNarrow, narrowDetailOpen, paletteOpen, tab]);

  return (
    <div className="app">
      <div className="app__main">
      <nav className="rail">
          <div className="rail__brand">ICD</div>
          <RailTab
            label="Search"
            icon="⌕"
            active={tab === "search"}
            onClick={() => setTab("search")}
          />
          <RailTab
            label="Favorites"
            icon="★"
            active={tab === "favorites"}
            onClick={() => setTab("favorites")}
          />
          <RailTab
            label="Collections"
            icon="🗂"
            active={tab === "collections"}
            onClick={() => setTab("collections")}
          />
          <div className="rail__spacer" />
          <RailTab
            label="Settings"
            icon="⚙"
            active={tab === "settings"}
            onClick={() => setTab("settings")}
          />
        </nav>

        <main
          className={`content${
            isNarrow ? " content--narrow" : ""
          }${isNarrow && narrowDetailOpen ? " content--detail-overlay" : ""}`}
        >
          {tab === "search" && (
            <SearchView selectedCode={selectedCode} onSelect={handleSelect} />
          )}
          {tab === "favorites" && (
            <FavoritesView selectedCode={selectedCode} onSelect={handleSelect} />
          )}
          {tab === "collections" && (
            <CollectionsView selectedCode={selectedCode} onSelect={handleSelect} />
          )}
          {tab === "settings" ? (
            <SettingsView
              initialPanel={settingsPanel}
              onPanelChange={setSettingsPanel}
            />
          ) : (
            <>
              {!isNarrow && <Splitter />}
              <CodeDetailView
                code={selectedCode}
                onClose={isNarrow ? () => setNarrowDetailOpen(false) : undefined}
              />
            </>
          )}
        </main>
      </div>{/* /.app__main */}
      <StatusBar />

      {premiumPrompt && (
        <PremiumPromptModal
          message={premiumPrompt}
          onClose={clearPremiumPrompt}
          onGoSettings={() => {
            clearPremiumPrompt();
            setTab("settings");
          }}
        />
      )}

      {!hasSeenOnboarding && (
        <OnboardingView onDismiss={dismissOnboarding} />
      )}

      <Toaster />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onJumpToCode={(code) => {
          setTab("search");
          setSelectedCode(code);
          setNarrowDetailOpen(true);
        }}
        onJumpToTab={(t) => setTab(t)}
      />
    </div>
  );
}

function RailTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rail__tab${active ? " rail__tab--active" : ""}`}
      onClick={onClick}
      title={label}
    >
      <span className="rail__icon">{icon}</span>
      <span className="rail__label">{label}</span>
    </button>
  );
}

export default App;
