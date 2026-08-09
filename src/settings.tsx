import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { storeRead, storeWrite } from "./api";

export type Theme =
  | "system"
  | "light"
  | "dark"
  | "sky-blue"
  | "peach-pink"
  | "deep-charcoal"
  | "blueberry";

export type FontFamily = "system" | "inter" | "atkinson" | "quattro";
export type FontSize = "small" | "medium" | "large" | "xl";

export const FREE_THEMES: Theme[] = ["system", "light", "dark"];
export const PREMIUM_THEMES: Theme[] = [
  "sky-blue",
  "peach-pink",
  "deep-charcoal",
  "blueberry",
];

export const THEME_LABELS: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
  "sky-blue": "Sky Blue",
  "peach-pink": "Peach Pink",
  "deep-charcoal": "Deep Charcoal",
  blueberry: "Blueberry",
};

export const THEME_DESCRIPTIONS: Record<Theme, string> = {
  system: "Follows your Mac's appearance setting — light or dark, automatically.",
  light: "Clean white cards on a light gray background. Always light, regardless of the system setting.",
  dark: "Dark cards on a near-black background. Always dark, regardless of the system setting.",
  "sky-blue": "Pantone-inspired pastel blue. Crisp white cards float on a soft sky-blue background.",
  "peach-pink": "Warm pastel peach. White cards on a peach background for a soft, gentle feel.",
  "deep-charcoal": "Sophisticated dark theme. Warm dark-gray cards on a near-black background.",
  blueberry: "Deep navy-blueberry theme. Saturated blue-toned cards on a deeper navy background.",
};

export const FONT_FAMILIES: FontFamily[] = [
  "system",
  "inter",
  "atkinson",
  "quattro",
];
export const FONT_LABELS: Record<FontFamily, string> = {
  system: "System",
  inter: "Inter",
  atkinson: "Atkinson Hyperlegible",
  quattro: "iA Writer Quattro",
};

export const FONT_DESCRIPTIONS: Record<FontFamily, string> = {
  system: "Your Mac's default UI font (SF Pro or similar). Familiar and fast to read.",
  inter: "A clean, modern sans-serif designed for screens. Great all-around readability.",
  atkinson: "Designed by the Braille Institute specifically for low-vision readability — the clearest choice if you're reading codes for hours.",
  quattro: "Distinguishes similar characters (0/O, 1/l/I) at a glance, which helps when scanning alphanumeric codes like E11.9.",
};
const FONT_STACKS: Record<FontFamily, string> = {
  system: '-apple-system, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter Variable", "Inter", sans-serif',
  atkinson: '"Atkinson Hyperlegible", sans-serif',
  quattro: '"iA Writer Quattro", sans-serif',
};

export const FONT_SIZES: FontSize[] = ["small", "medium", "large", "xl"];
export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xl: "XL",
};
const ZOOM_FACTORS: Record<FontSize, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.15,
  xl: 1.32,
};

interface StoredSettings {
  theme?: Theme;
  fontFamily?: FontFamily;
  fontSize?: FontSize;
  hasSeenOnboarding?: boolean;
}

interface LicenseState {
  unlocked: boolean;
  key: string | null;
}

interface SettingsCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  fontFamily: FontFamily;
  setFontFamily: (f: FontFamily) => void;
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
  hasSeenOnboarding: boolean;
  dismissOnboarding: () => void;
  unlocked: boolean;
  licenseKey: string | null;
  activateLicense: (key: string) => Promise<void>;
  deactivateLicense: () => Promise<void>;
}

const SettingsContext = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [fontFamily, setFontFamilyState] = useState<FontFamily>("system");
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);
  const [license, setLicense] = useState<LicenseState>({
    unlocked: false,
    key: null,
  });
  const loaded = useRef(false);

  // Load saved settings once.
  useEffect(() => {
    storeRead<StoredSettings>("settings")
      .then((data) => {
        if (data?.theme) setThemeState(data.theme);
        if (data?.fontFamily) setFontFamilyState(data.fontFamily);
        if (data?.fontSize) setFontSizeState(data.fontSize);
        if (data?.hasSeenOnboarding) setHasSeenOnboarding(true);
      })
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  // Load license instantly, then re-validate online in the background.
  useEffect(() => {
    invoke<LicenseState>("license_status")
      .then(setLicense)
      .catch((e) => console.error("license_status failed:", e));
    invoke<LicenseState>("license_validate")
      .then(setLicense)
      .catch((e) => console.error("license_validate failed:", e));
  }, []);

  // Persist whenever any setting changes (after the initial load).
  useEffect(() => {
    if (!loaded.current) return;
    storeWrite("settings", {
      theme,
      fontFamily,
      fontSize,
      hasSeenOnboarding,
    }).catch((e) => console.error("failed to persist settings:", e));
  }, [theme, fontFamily, fontSize, hasSeenOnboarding]);

  // Apply theme. A premium theme only takes effect while premium is unlocked.
  useEffect(() => {
    const isPremium = PREMIUM_THEMES.includes(theme);
    const effective = isPremium && !license.unlocked ? "system" : theme;
    document.documentElement.setAttribute("data-theme", effective);
  }, [theme, license.unlocked]);

  // Apply UI font.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ui-font",
      FONT_STACKS[fontFamily],
    );
  }, [fontFamily]);

  // Apply text size via the webview zoom.
  useEffect(() => {
    getCurrentWebview()
      .setZoom(ZOOM_FACTORS[fontSize])
      .catch((e) => console.error("setZoom failed:", e));
  }, [fontSize]);

  const activateLicense = useCallback(async (key: string) => {
    setLicense(await invoke<LicenseState>("license_activate", { key }));
  }, []);

  const deactivateLicense = useCallback(async () => {
    setLicense(await invoke<LicenseState>("license_deactivate"));
  }, []);

  const dismissOnboarding = useCallback(() => {
    setHasSeenOnboarding(true);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme: setThemeState,
        fontFamily,
        setFontFamily: setFontFamilyState,
        fontSize,
        setFontSize: setFontSizeState,
        hasSeenOnboarding,
        dismissOnboarding,
        unlocked: license.unlocked,
        licenseKey: license.key,
        activateLicense,
        deactivateLicense,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
