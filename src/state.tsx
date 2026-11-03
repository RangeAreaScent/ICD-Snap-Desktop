import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getCurrentRows, storeRead, storeWrite } from "./api";
import { missingFrom, refreshCollections, refreshFavorites } from "./reconcile";
import type {
  Collection,
  CollectionItem,
  Favorite,
  NoteMap,
  SearchResult,
} from "./types";

/** Loads a JSON document once, then persists every change atomically. */
function usePersistentState<T>(
  name: string,
  initial: T,
): [T, (updater: (prev: T) => T) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    storeRead<T>(name)
      .then((data) => {
        if (data != null) setValue(data);
      })
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, [name]);

  useEffect(() => {
    if (!loaded.current) return;
    storeWrite(name, value).catch((e) =>
      console.error(`failed to persist ${name}:`, e),
    );
  }, [name, value]);

  const update = useCallback((updater: (prev: T) => T) => {
    setValue((prev) => updater(prev));
  }, []);

  return [value, update, ready];
}

function toItem(item: SearchResult): CollectionItem {
  return {
    code: item.code,
    description: item.description,
    isBillable: item.isBillable,
    chapterDescription: item.chapterDescription,
    addedAt: Date.now(),
  };
}

interface AppData {
  ready: boolean;

  favorites: Favorite[];
  /** True when a saved code is no longer in the bundled ICD-10-CM data. */
  isMissing: (code: string) => boolean;
  isFavorite: (code: string) => boolean;
  toggleFavorite: (item: SearchResult) => void;
  removeFavorite: (code: string) => void;

  collections: Collection[];
  createCollection: (name: string, emoji: string) => string;
  renameCollection: (id: string, name: string, emoji: string) => void;
  deleteCollection: (id: string) => void;
  addToCollection: (id: string, item: SearchResult) => void;
  removeFromCollection: (id: string, code: string) => void;
  isInCollection: (id: string, code: string) => boolean;

  notes: NoteMap;
  setNote: (code: string, text: string) => void;
  deleteNote: (code: string) => void;

}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [favorites, updateFavorites, favReady] = usePersistentState<Favorite[]>(
    "favorites",
    [],
  );
  const [collections, updateCollections, colReady] = usePersistentState<
    Collection[]
  >("collections", []);
  const [notes, updateNotes, notesReady] = usePersistentState<NoteMap>(
    "notes",
    {},
  );
  const [missing, setMissing] = useState<Set<string>>(() => new Set());
  const reconciled = useRef(false);

  // Once the saved lists are loaded, bring their snapshots up to date with the
  // bundled data and flag codes it no longer contains (data refresh each October).
  useEffect(() => {
    if (!favReady || !colReady || reconciled.current) return;
    reconciled.current = true;
    const codes = [
      ...new Set([
        ...favorites.map((f) => f.code),
        ...collections.flatMap((c) => c.items.map((i) => i.code)),
      ]),
    ];
    if (codes.length === 0) return;
    getCurrentRows(codes)
      .then((list) => {
        const rows = new Map(list.map((r) => [r.code, r]));
        updateFavorites((prev) => refreshFavorites(prev, rows));
        updateCollections((prev) => refreshCollections(prev, rows));
        setMissing(missingFrom(codes, rows));
      })
      .catch((e) => console.error("failed to refresh saved codes:", e));
    // Runs once, when the lists first become ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favReady, colReady]);

  const isMissing = useCallback((code: string) => missing.has(code), [missing]);

  const isFavorite = useCallback(
    (code: string) => favorites.some((f) => f.code === code),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (item: SearchResult) => {
      updateFavorites((prev) => {
        if (prev.some((f) => f.code === item.code)) {
          return prev.filter((f) => f.code !== item.code);
        }
        return [
          {
            code: item.code,
            description: item.description,
            isBillable: item.isBillable,
            chapterDescription: item.chapterDescription,
            addedAt: Date.now(),
          },
          ...prev,
        ];
      });
    },
    [updateFavorites],
  );

  const removeFavorite = useCallback(
    (code: string) => {
      updateFavorites((prev) => prev.filter((f) => f.code !== code));
    },
    [updateFavorites],
  );

  const createCollection = useCallback(
    (name: string, emoji: string): string => {
      const id = crypto.randomUUID();
      updateCollections((prev) => [
        ...prev,
        { id, name, emoji, createdAt: Date.now(), items: [] },
      ]);
      return id;
    },
    [updateCollections],
  );

  const renameCollection = useCallback(
    (id: string, name: string, emoji: string) => {
      updateCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name, emoji } : c)),
      );
    },
    [updateCollections],
  );

  const deleteCollection = useCallback(
    (id: string) => {
      updateCollections((prev) => prev.filter((c) => c.id !== id));
    },
    [updateCollections],
  );

  const addToCollection = useCallback(
    (id: string, item: SearchResult) => {
      updateCollections((prev) =>
        prev.map((c) => {
          if (c.id !== id || c.items.some((i) => i.code === item.code)) {
            return c;
          }
          return { ...c, items: [...c.items, toItem(item)] };
        }),
      );
    },
    [updateCollections],
  );

  const removeFromCollection = useCallback(
    (id: string, code: string) => {
      updateCollections((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, items: c.items.filter((i) => i.code !== code) }
            : c,
        ),
      );
    },
    [updateCollections],
  );

  const isInCollection = useCallback(
    (id: string, code: string) =>
      collections
        .find((c) => c.id === id)
        ?.items.some((i) => i.code === code) ?? false,
    [collections],
  );

  const setNote = useCallback(
    (code: string, text: string) => {
      updateNotes((prev) => ({
        ...prev,
        [code]: { text, editedAt: Date.now() },
      }));
    },
    [updateNotes],
  );

  const deleteNote = useCallback(
    (code: string) => {
      updateNotes((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
    },
    [updateNotes],
  );

  return (
    <AppDataContext.Provider
      value={{
        ready: favReady && colReady && notesReady,
        favorites,
        isMissing,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        collections,
        createCollection,
        renameCollection,
        deleteCollection,
        addToCollection,
        removeFromCollection,
        isInCollection,
        notes,
        setNote,
        deleteNote,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
