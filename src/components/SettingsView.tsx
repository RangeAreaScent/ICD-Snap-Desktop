import { ask } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FONT_FAMILIES,
  FONT_LABELS,
  FONT_SIZE_LABELS,
  FONT_SIZES,
  FREE_THEMES,
  PREMIUM_THEMES,
  THEME_LABELS,
  useSettings,
  type FontFamily,
  type Theme,
} from "../settings";
import { FREE_COLLECTIONS_MAX, FREE_FAVORITES_MAX, useAppData } from "../state";

const FONT_PREVIEW: Record<FontFamily, string> = {
  system: '-apple-system, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter Variable", sans-serif',
  atkinson: '"Atkinson Hyperlegible", sans-serif',
  quattro: '"iA Writer Quattro", sans-serif',
};

/** Detects the hidden unlock rhythm: tap-tap · pause · tap-tap · pause ·
 *  tap-tap (6 clicks). Mirrors the iOS app's SecretTapDetector. */
function useSecretRhythm(onTrigger: () => void) {
  const taps = useRef<number[]>([]);
  return useCallback(() => {
    const now = Date.now();
    const t = taps.current;
    if (t.length > 0 && now - t[t.length - 1] > 6000) t.length = 0;
    t.push(now);
    if (t.length > 6) t.splice(0, t.length - 6);
    if (t.length === 6) {
      const g = [
        t[1] - t[0],
        t[2] - t[1],
        t[3] - t[2],
        t[4] - t[3],
        t[5] - t[4],
      ];
      const pair = (x: number) => x < 700;
      const gap = (x: number) => x >= 700 && x <= 4500;
      if (pair(g[0]) && gap(g[1]) && pair(g[2]) && gap(g[3]) && pair(g[4])) {
        taps.current = [];
        onTrigger();
      }
    }
  }, [onTrigger]);
}

const SWATCH: Record<Theme, [string, string]> = {
  system: ["#ffffff", "#1c1d21"],
  light: ["#f4f5f7", "#2f6df0"],
  dark: ["#1e2023", "#5a8df5"],
  "sky-blue": ["#c9d3de", "#5c7ba3"],
  "peach-pink": ["#eac3b7", "#c77f66"],
  "deep-charcoal": ["#262424", "#e8b87a"],
  blueberry: ["#3e4e66", "#b8c9e0"],
};

type InfoPanel = "howToUse" | "database" | "about" | null;

interface Props {
  /** Optional initial modal — used when the user picks Help → How to Use
   * from the native menu so the modal opens directly. */
  initialPanel?: InfoPanel;
  /** Called whenever the panel state changes (mainly to clear an
   * externally-triggered initialPanel). */
  onPanelChange?: (panel: InfoPanel) => void;
}

export function SettingsView({ initialPanel = null, onPanelChange }: Props = {}) {
  const {
    theme,
    setTheme,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    unlocked,
    licenseKey,
    activateLicense,
    deactivateLicense,
    togglePremiumOverride,
  } = useSettings();

  const [flash, setFlash] = useState<string | null>(null);
  const secretTap = useSecretRhythm(() => {
    togglePremiumOverride().then(() => {
      setFlash("Premium override toggled");
      setTimeout(() => setFlash((f) => (f ? null : f)), 2500);
    });
  });

  const [open, setOpen] = useState<InfoPanel>(initialPanel);
  useEffect(() => {
    setOpen(initialPanel);
  }, [initialPanel]);
  const setPanel = useCallback(
    (next: InfoPanel) => {
      setOpen(next);
      onPanelChange?.(next);
    },
    [onPanelChange],
  );
  const close = () => setPanel(null);

  return (
    <div className="settings-pane">
      <div className="settings-scroll">
        <h1 className="settings-title">Settings</h1>

        <section className="settings-section">
          <h2 className="settings-heading">Appearance</h2>
          <p className="settings-sub">Free themes</p>
          <div className="theme-grid">
            {FREE_THEMES.map((t) => (
              <ThemeCard
                key={t}
                theme={t}
                selected={theme === t}
                locked={false}
                onClick={() => setTheme(t)}
              />
            ))}
          </div>
          <p className="settings-sub">
            Premium themes {unlocked ? "" : "🔒"}
          </p>
          <div className="theme-grid">
            {PREMIUM_THEMES.map((t) => (
              <ThemeCard
                key={t}
                theme={t}
                selected={theme === t}
                locked={!unlocked}
                onClick={() => unlocked && setTheme(t)}
              />
            ))}
          </div>
          {!unlocked && (
            <p className="settings-hint">
              Unlock all premium themes below.
            </p>
          )}

          <p className="settings-sub">Font</p>
          <div className="theme-grid">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f}
                className={`theme-card${
                  fontFamily === f ? " theme-card--selected" : ""
                }`}
                onClick={() => setFontFamily(f)}
              >
                <span
                  className="font-preview"
                  style={{ fontFamily: FONT_PREVIEW[f] }}
                >
                  Aa
                </span>
                <span className="theme-card__label">{FONT_LABELS[f]}</span>
                {fontFamily === f && (
                  <span className="theme-card__check">✓</span>
                )}
              </button>
            ))}
          </div>

          <p className="settings-sub">Text size</p>
          <div className="segmented">
            {FONT_SIZES.map((s) => (
              <button
                key={s}
                className={`segmented__opt${
                  fontSize === s ? " segmented__opt--on" : ""
                }`}
                onClick={() => setFontSize(s)}
              >
                {FONT_SIZE_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        <PremiumSection
          unlocked={unlocked}
          licenseKey={licenseKey}
          activateLicense={activateLicense}
          deactivateLicense={deactivateLicense}
          togglePremiumOverride={togglePremiumOverride}
        />

        <section className="settings-section">
          <h2 className="settings-heading">Help</h2>
          <NavRow label="How to Use" onClick={() => setPanel("howToUse")} />
        </section>

        <section className="settings-section">
          <h2 className="settings-heading">Data</h2>
          <InfoRow label="Source" value="CDC / NCHS (public domain)" />
          <InfoRow label="Snapshot" value="FY 2026 · 2025-10-01" />
          <InfoRow label="Coverage" value="74,714 billable codes" />
          <InfoRow label="Update cadence" value="Annual · Oct 1 (U.S. FY)" />
          <NavRow label="Database Details" onClick={() => setPanel("database")} />
        </section>

        <section className="settings-section">
          <h2 className="settings-heading">About</h2>
          <div className="info-row">
            <span className="info-row__label">ICD Snap</span>
            <span
              className="info-row__value"
              onClick={secretTap}
              style={{ cursor: "default" }}
            >
              Version 1.0.0
            </span>
          </div>
          {flash && <p className="settings-hint">{flash}</p>}
          <NavRow label="About This App" onClick={() => setPanel("about")} />
        </section>
      </div>

      {open === "howToUse" && <HowToUseModal onClose={close} />}
      {open === "database" && <DatabaseModal onClose={close} />}
      {open === "about" && <AboutModal onClose={close} />}
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  locked,
  onClick,
}: {
  theme: Theme;
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const [bg, accent] = SWATCH[theme];
  return (
    <button
      className={`theme-card${selected ? " theme-card--selected" : ""}${
        locked ? " theme-card--locked" : ""
      }`}
      onClick={onClick}
    >
      <span className="theme-swatch" style={{ background: bg }}>
        <span className="theme-swatch__dot" style={{ background: accent }} />
        {locked && <span className="theme-swatch__lock">🔒</span>}
      </span>
      <span className="theme-card__label">{THEME_LABELS[theme]}</span>
      {selected && <span className="theme-card__check">✓</span>}
    </button>
  );
}

function PremiumSection({
  unlocked,
  licenseKey,
  activateLicense,
  deactivateLicense,
  togglePremiumOverride,
}: {
  unlocked: boolean;
  licenseKey: string | null;
  activateLicense: (key: string) => Promise<void>;
  deactivateLicense: () => Promise<void>;
  togglePremiumOverride: () => Promise<void>;
}) {
  const { favorites, collections } = useAppData();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDev = import.meta.env.DEV;

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      await activateLicense(key);
      setKey("");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    const ok = await ask("Deactivate premium on this computer?", {
      title: "Deactivate premium",
      kind: "warning",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await deactivateLicense();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-heading">Premium</h2>
      {unlocked ? (
        <div className="premium-box premium-box--on">
          <p className="premium-box__title">✓ Premium unlocked</p>
          <p className="premium-box__text">
            Thank you for supporting ICD Snap.
          </p>
          {licenseKey && (
            <p className="premium-box__key">Key: {maskKey(licenseKey)}</p>
          )}
          <button className="btn" onClick={deactivate} disabled={busy}>
            Deactivate on this computer
          </button>
        </div>
      ) : (
        <div className="premium-box">
          <p className="premium-box__text">
            ICD Snap is free to use. A one-time premium license unlocks all
            four premium themes plus unlimited favorites and collections.
          </p>
          <p className="premium-box__text">
            Free plan: {favorites.length} / {FREE_FAVORITES_MAX} favorites
            {" · "}
            {collections.length} / {FREE_COLLECTIONS_MAX} collections. Notes
            and export are always unlimited.
          </p>
          <p className="premium-box__text">
            Enter your license key (one key works on up to 2 computers):
          </p>
          <div className="license-row">
            <input
              className="text-input"
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              spellCheck={false}
              disabled={busy}
            />
            <button
              className="btn btn--primary"
              onClick={activate}
              disabled={busy || !key.trim()}
            >
              {busy ? "Activating…" : "Activate"}
            </button>
          </div>
          {error && <p className="license-error">{error}</p>}
        </div>
      )}
      {isDev && (
        <button
          className="btn dev-btn"
          onClick={() => togglePremiumOverride()}
        >
          Dev: toggle premium override
        </button>
      )}
    </section>
  );
}

function maskKey(key: string): string {
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-row__label">{label}</span>
      <span className="info-row__value">{value}</span>
    </div>
  );
}

function NavRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="nav-row" onClick={onClick}>
      <span className="nav-row__label">{label}</span>
      <span className="nav-row__chevron">›</span>
    </button>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function InfoModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="info-modal__header">
          <h3 className="info-modal__title">{title}</h3>
          <button className="modal__close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="info-modal__body">{children}</div>
      </div>
    </div>
  );
}

function ModalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="info-modal__section">
      <h4 className="info-modal__section-heading">{heading}</h4>
      {children}
    </div>
  );
}

function HowToUseModal({ onClose }: { onClose: () => void }) {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac/i.test(navigator.platform || navigator.userAgent);
  const mod = isMac ? "⌘" : "Ctrl";

  return (
    <InfoModal title="How to Use" onClose={onClose}>
      <ModalSection heading="Search">
        <p>
          Type a diagnosis name or ICD-10-CM code into the search bar.
          Common clinical abbreviations are mapped to full terms automatically.
        </p>
        <table className="howto-table">
          <tbody>
            <tr>
              <td>By name</td>
              <td>
                <code>hypertension</code>, <code>diabetes</code>,{" "}
                <code>fracture</code>, <code>asthma</code>
              </td>
            </tr>
            <tr>
              <td>By code</td>
              <td>
                <code>I10</code>, <code>E11.9</code>, <code>S52.501A</code>
              </td>
            </tr>
            <tr>
              <td>By abbreviation</td>
              <td>
                <code>HTN</code> → hypertension, <code>T2DM</code> →
                type 2 diabetes, <code>COPD</code> → chronic obstructive
                pulmonary disease
              </td>
            </tr>
            <tr>
              <td>By category</td>
              <td>
                <code>E11</code> (3-character prefix) returns the diabetes
                family
              </td>
            </tr>
          </tbody>
        </table>
      </ModalSection>

      <ModalSection heading="Favorites & Collections">
        <p>
          Click the ☆ on any code to save it to <strong>Favorites</strong>.
          Group related codes into named <strong>Collections</strong> —
          useful for recurring encounters, problem lists, or audit packets.
        </p>
        <p className="howto-note">
          Free plan: up to {FREE_FAVORITES_MAX} favorites and{" "}
          {FREE_COLLECTIONS_MAX} collections. Premium removes both limits.
        </p>
        <p>
          On Favorites, click <strong>Select</strong> to enter multi-select
          mode: pick rows then 📁 (add to a collection), 📄 (export PDF),
          or 🗑 (remove).
        </p>
      </ModalSection>

      <ModalSection heading="Notes">
        <p>
          Every code can carry a personal note (free-text, Korean OK). The
          note is included in the "Copy full detail" clipboard action and
          embedded in the collection PDF export.
        </p>
      </ModalSection>

      <ModalSection heading="Export">
        <table className="howto-table">
          <tbody>
            <tr>
              <td>Collection (CSV)</td>
              <td>Open a collection → ⋯ menu → Export as CSV</td>
            </tr>
            <tr>
              <td>Collection (PDF, A4)</td>
              <td>Open a collection → ⋯ menu → Export as PDF</td>
            </tr>
            <tr>
              <td>Favorites batch</td>
              <td>Favorites → Select → 📄 icon</td>
            </tr>
          </tbody>
        </table>
      </ModalSection>

      <ModalSection heading="Keyboard Shortcuts">
        <table className="howto-table howto-table--kbd">
          <tbody>
            <tr>
              <td>
                <kbd>↑</kbd> <kbd>↓</kbd>
              </td>
              <td>Move through results</td>
            </tr>
            <tr>
              <td>
                <kbd>Enter</kbd>
              </td>
              <td>Open the selected code</td>
            </tr>
            <tr>
              <td>
                <kbd>Esc</kbd>
              </td>
              <td>Back to the search box</td>
            </tr>
            <tr>
              <td>
                <kbd>{mod}K</kbd>
              </td>
              <td>Command palette (search anywhere, jump anywhere)</td>
            </tr>
            <tr>
              <td>
                <kbd>{mod}F</kbd>
              </td>
              <td>Focus search</td>
            </tr>
            <tr>
              <td>
                <kbd>{mod}C</kbd>
              </td>
              <td>Copy the selected code</td>
            </tr>
            <tr>
              <td>
                <kbd>{mod}D</kbd>
              </td>
              <td>Add / remove favorite</td>
            </tr>
            <tr>
              <td>
                <kbd>{mod}1</kbd>–<kbd>{mod}3</kbd>
              </td>
              <td>Jump between sidebar tabs (Search / Favorites / Collections)</td>
            </tr>
            <tr>
              <td>
                <kbd>{mod}E</kbd>
              </td>
              <td>Export the open collection as CSV</td>
            </tr>
            <tr>
              <td>
                <kbd>{mod}N</kbd>
              </td>
              <td>New search</td>
            </tr>
            <tr>
              <td>
                <kbd>{mod}{","}</kbd>
              </td>
              <td>Settings</td>
            </tr>
          </tbody>
        </table>
      </ModalSection>

      <ModalSection heading="Tips">
        <ul>
          <li>
            Dotted codes (<code>S52.501A</code>) work — dots are stripped.
          </li>
          <li>
            Common abbreviations expand automatically: <code>HTN</code>,{" "}
            <code>T2DM</code>, <code>COPD</code>, <code>CHF</code>,{" "}
            <code>CKD</code>, etc.
          </li>
          <li>
            Non-billable codes (3- and 4-character parent categories) are
            included for browsing; only billable codes are valid on claims.
          </li>
          <li>
            Drag the divider between the result list and detail pane to
            resize. The position is remembered between sessions.
          </li>
          <li>
            All notes and favorites stay on your computer — no account, no
            sync, no telemetry.
          </li>
        </ul>
      </ModalSection>
    </InfoModal>
  );
}

function DatabaseModal({ onClose }: { onClose: () => void }) {
  return (
    <InfoModal title="Database Details" onClose={onClose}>
      <ModalSection heading="Source">
        <p>
          Data is sourced from the{" "}
          <strong>CDC / NCHS ICD-10-CM annual release</strong> — the
          authoritative U.S. clinical modification of WHO's ICD-10
          classification, published by the National Center for Health
          Statistics.
        </p>
        <table className="info-table">
          <tbody>
            <tr>
              <td>Publisher</td>
              <td>CDC / NCHS (U.S. National Center for Health Statistics)</td>
            </tr>
            <tr>
              <td>Format</td>
              <td>SQLite + FTS5 full-text index</td>
            </tr>
            <tr>
              <td>Snapshot</td>
              <td>FY 2026 · effective 2025-10-01</td>
            </tr>
            <tr>
              <td>Base</td>
              <td>ICD-10-CM (U.S. clinical modification of WHO ICD-10)</td>
            </tr>
          </tbody>
        </table>
      </ModalSection>

      <ModalSection heading="Coverage">
        <table className="info-table">
          <tbody>
            <tr>
              <td>Billable codes</td>
              <td>74,714</td>
            </tr>
            <tr>
              <td>Total code rows (incl. parents)</td>
              <td>~98,000</td>
            </tr>
            <tr>
              <td>ICD chapters</td>
              <td>22</td>
            </tr>
            <tr>
              <td>Abbreviation expansions</td>
              <td>~125 clinical shorthand entries</td>
            </tr>
            <tr>
              <td>Bundled database size</td>
              <td>40 MB</td>
            </tr>
          </tbody>
        </table>
      </ModalSection>

      <ModalSection heading="What's Included">
        <ul>
          <li>All ICD-10-CM codes for FY 2026 (effective 2025-10-01)</li>
          <li>Billable / non-billable flag per code</li>
          <li>
            Chapter, block, and category descriptions for every code
          </li>
          <li>Full-text search index (FTS5) over codes and descriptions</li>
          <li>
            Clinical-abbreviation dictionary so lay terms resolve to ICD
            vocabulary (e.g. <code>HTN</code> → hypertension)
          </li>
        </ul>
      </ModalSection>

      <ModalSection heading="What's Not Included">
        <ul>
          <li>
            <strong>ICD-10-PCS</strong> — procedure codes (inpatient
            hospital). This app covers diagnosis codes only.
          </li>
          <li>
            <strong>CPT / HCPCS</strong> — outpatient procedure/service
            codes (AMA / CMS). Out of scope.
          </li>
          <li>
            <strong>NDC drug codes</strong>, <strong>LOINC labs</strong>,
            <strong> SNOMED CT</strong> — other clinical vocabularies.
          </li>
          <li>
            <strong>Coding guidelines / sequencing rules</strong> — refer
            to the ICD-10-CM Official Guidelines (CDC, annual).
          </li>
          <li>
            <strong>Reimbursement / DRG mappings</strong> — payment
            modeling is out of scope for a reference lookup.
          </li>
        </ul>
      </ModalSection>

      <ModalSection heading="Update Cadence">
        <p>
          ICD-10-CM is refreshed <strong>annually</strong> by CDC for the
          U.S. fiscal year (October 1 cutover). The next refresh will
          target <strong>FY 2027</strong>, expected October 2026.
        </p>
      </ModalSection>

      <ModalSection heading="Licence — Public Domain">
        <p className="info-modal__ogl">
          The ICD-10-CM classification is published by the U.S. CDC / NCHS
          and is in the <strong>public domain</strong>.<br />
          Source: CDC ICD-10-CM — cdc.gov/nchs/icd/icd-10-cm<br />
          ICD Snap is not affiliated with the U.S. government, CDC, or
          NCHS. For coding decisions on billed claims, consult an
          AHIMA / AAPC-credentialed coder. Data refreshed annually.
        </p>
      </ModalSection>
    </InfoModal>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <InfoModal title="About ICD Snap" onClose={onClose}>
      <div className="info-modal__app-header">
        <div className="info-modal__app-name">ICD Snap</div>
        <div className="info-modal__app-version">Version 1.0.0</div>
        <div className="info-modal__app-tagline">
          Find an ICD-10-CM code in two seconds. Offline, forever.
        </div>
      </div>

      <ModalSection heading="Why Offline Matters">
        <p>
          ICD-10-CM is the diagnosis vocabulary every U.S. clinician,
          coder, biller, and case manager touches daily. Yet every
          official lookup — CDC, CMS, your EHR's embedded picker — sits
          behind a network round-trip. When the Wi-Fi flakes, the VPN
          drops, or the EHR module times out, your lookup stops with it.
        </p>
        <p>
          <strong>ICD Snap never asks for the network.</strong> The full
          FY 2026 release (~74,714 billable codes + chapter, block, and
          category context) is bundled into the app as a 40 MB SQLite
          file with an FTS5 index. Open the app on a plane, in a clinic
          basement, behind a hospital firewall, on a coding-audit field
          visit — the answer comes back in under a second every time.
        </p>
        <p>
          No telemetry. No analytics. No account. No cloud sync. Your
          searches, favorites, collections, and notes never leave your
          machine.
        </p>
      </ModalSection>

      <ModalSection heading="Beyond Lookup — Code Management">
        <p>
          A lookup tool that forgets what you just found wastes your
          time. ICD Snap is built around the loop a working coder
          actually uses:
        </p>
        <ul>
          <li>
            <strong>Star a code</strong> — the ones you reach for during
            an audit or a recurring patient profile go into{" "}
            <em>Favorites</em>. Up to 15 on the free plan, unlimited on
            premium.
          </li>
          <li>
            <strong>Group codes into collections</strong> — one
            collection per problem list, per audit packet, per teaching
            case. Up to 10 on the free plan, unlimited on premium.
          </li>
          <li>
            <strong>Annotate</strong> — every code carries a personal
            note (free-text, Korean OK, never leaves your machine).
            Notes flow into the "Copy full detail" clipboard action and
            into the collection PDF export.
          </li>
          <li>
            <strong>Multi-select</strong> — click ☐ in Favorites or any
            open collection to enter selection mode, then 📄 export a
            subset to PDF or 🗑 remove a batch in one action.
          </li>
          <li>
            <strong>Export</strong> — CSV for spreadsheets, PDF (A4)
            for chart packets. Both formats embed the chapter context
            and your notes.
          </li>
        </ul>
        <p>
          The keyboard alone covers every step: <kbd>⌘F</kbd> to find,{" "}
          <kbd>↑↓</kbd> to scan, <kbd>⌘D</kbd> to star,{" "}
          <kbd>⌘C</kbd> to copy, <kbd>⌘K</kbd> to jump anywhere. The
          mouse stays optional.
        </p>
      </ModalSection>

      <ModalSection heading="Free for Everyone">
        <p>
          ICD Snap is free to use. Every search, every favorite (up to
          15), every collection (up to 10), every note, every export is
          unlocked by default — no ads, no subscription, no account.
        </p>
        <p>
          A one-time premium license unlocks all four premium themes and
          removes both free-plan capacity limits. It's a genuine help if
          the app earns its place on your dock.
        </p>
      </ModalSection>

      <ModalSection heading="Data Source">
        <p>
          Every code comes from the{" "}
          <strong>CDC / NCHS ICD-10-CM annual release</strong> — the
          authoritative U.S. clinical modification of WHO's ICD-10
          classification, published in the public domain. The bundled
          snapshot is FY 2026 (effective 2025-10-01). Refreshed annually
          for each new U.S. fiscal year (October 1 cutover).
        </p>
        <p className="info-modal__ogl">
          ICD Snap is not affiliated with the U.S. government, CDC, or
          NCHS. Always verify codes against official CDC / NCHS sources
          before billing or clinical documentation.
        </p>
      </ModalSection>

      <ModalSection heading="Privacy">
        <p>
          Every search, every favorite, every note stays on your
          computer. ICD Snap does not collect, transmit, or share any
          personal information. There is no analytics SDK, no crash
          reporter, no telemetry endpoint.
        </p>
        <p>
          The <em>only</em> network call the app ever makes is the
          optional license-key activation check with Lemon Squeezy (our
          payment processor) when you choose to enter a premium key.
          The free app makes zero network calls.
        </p>
      </ModalSection>

      <ModalSection heading="Disclaimer">
        <p>
          ICD Snap is a reference tool. Diagnosis coding for billed
          claims is a regulated act and should be performed or reviewed
          by a credentialed coder (AHIMA / AAPC). Always verify codes,
          billable status, sequencing, and applicable Official
          Guidelines against the current CDC ICD-10-CM release and your
          payer's policies before relying on any output here for a
          submitted claim or clinical record.
        </p>
      </ModalSection>

      <ModalSection heading="Licence Overview">
        <p>
          ICD Snap combines three licence layers — knowing which one
          covers which part matters if you're redistributing or
          embedding output:
        </p>
        <table className="info-table">
          <tbody>
            <tr>
              <td>ICD-10-CM data</td>
              <td>
                <strong>Public Domain</strong> — published by CDC / NCHS.
                Free to use, redistribute, and modify without attribution.
              </td>
            </tr>
            <tr>
              <td>ICD Snap app</td>
              <td>
                Proprietary. The source code is not redistributed; the
                app is delivered as a signed installer per platform.
              </td>
            </tr>
            <tr>
              <td>Bundled fonts</td>
              <td>
                <strong>OFL 1.1</strong> — Inter (Rasmus Andersson) and
                NanumGothic (Naver). Both freely redistributable as part
                of the application.
              </td>
            </tr>
            <tr>
              <td>Bundled libraries</td>
              <td>
                <strong>MIT</strong> / <strong>Apache 2.0</strong> —
                Tauri, React, rusqlite, printpdf, cmdk, ureq. See the
                Open Source section for the full list.
              </td>
            </tr>
            <tr>
              <td>Your data</td>
              <td>
                Yours. Favorites, collections, and notes live only on
                your machine and are not licensed to anyone.
              </td>
            </tr>
          </tbody>
        </table>
      </ModalSection>

      <ModalSection heading="Open Source">
        <p className="howto-note">
          ICD Snap ships with — and gratefully depends on — these open
          source projects. The bundled licence texts are included in
          the installer.
        </p>
        <div className="info-modal__oss-row">
          <strong>Tauri</strong>
          <span>Desktop app framework (Rust + system webview). MIT / Apache 2.0.</span>
        </div>
        <div className="info-modal__oss-row">
          <strong>React</strong>
          <span>UI framework by Meta. MIT License.</span>
        </div>
        <div className="info-modal__oss-row">
          <strong>rusqlite</strong>
          <span>SQLite bindings for Rust (FTS5 enabled). MIT License.</span>
        </div>
        <div className="info-modal__oss-row">
          <strong>printpdf</strong>
          <span>Native PDF generation in Rust (font subsetting). MIT License.</span>
        </div>
        <div className="info-modal__oss-row">
          <strong>cmdk</strong>
          <span>⌘K command palette by Vercel. MIT License.</span>
        </div>
        <div className="info-modal__oss-row">
          <strong>ureq</strong>
          <span>Synchronous HTTP client (license activation). MIT / Apache 2.0.</span>
        </div>
        <div className="info-modal__oss-row">
          <strong>Inter</strong>
          <span>Variable UI font by Rasmus Andersson. SIL OFL 1.1.</span>
        </div>
        <div className="info-modal__oss-row">
          <strong>Atkinson Hyperlegible</strong>
          <span>Accessibility-focused font by the Braille Institute. SIL OFL 1.1.</span>
        </div>
        <div className="info-modal__oss-row">
          <strong>NanumGothic</strong>
          <span>Korean font by Naver (embedded for Korean PDF notes). SIL OFL 1.1.</span>
        </div>
      </ModalSection>
    </InfoModal>
  );
}
