# ICD Snap Desktop — Handoff Document

<!-- snap-series:manager-block:start -->
- **App:** ICD Snap
- **Platform:** desktop
- **Wave:** 1
- **Stage:** 2 features  (0 spec / 1 scaffold / 2 features / 3 release / shipped) — bumped back from 3 release after Phase A~D + Polish UX work on 2026-06-09; the Phase A~D + Polish UI work itself is still un-smoke-tested and still needs its own v1.1.0 (see "Next 3 steps" — unrelated to the v1.0.1 bump below)
- **Last updated:** 2026-08-06
- **Repo:** https://github.com/RangeAreaScent/ICD-Snap-Desktop
- **Latest release:** v1.0.0 — **published** 2026-08-06 (was a draft since 2026-05-29; still pre-dates Phase A~D + Polish, but the user chose to publish it anyway for real cross-Mac testing convenience — see §6.5). A signed + notarized universal Mac DMG is live on this release and linked from the marketing site (`doie.cc/snap/icd-snap`, macOS "Download for Mac" badge → direct GitHub asset). v1.0.1 (Gumroad + signing/override fixes below) is about to be tagged on top of this — same release lineage, not a separate stale draft.
- **Latest CI:** success on v1.0.0 (Windows-only, commit `4b1c1d0`, **pre-dates** the 2026-08-06 Gumroad/override changes — that Windows .msi/.exe is stale, still Lemon Squeezy + hidden override, unsigned). v1.0.1 CI run is what will pick up today's changes. Mac DMG for v1.0.0 built locally via `tauri build` + `hdiutil` fallback (§13 gotcha #6), signed + notarized successfully with the DOIE LLC Developer ID cert (§6.5 verify recipe passed: codesign / spctl / stapler all green).
- **Bundle id:** cc.doie.icdsnap
- **Dataset:** `icd10cm_2026.sqlite`, ~98K rows (74,714 billable), 40 MB, license: public domain (CDC / NCHS)
- **Dataset update cadence:** Annual (Oct 1, U.S. FY rollover), next refresh window 2026-10 for FY 2027
- **Deviations from playbook (4-tab ICD vs Tariff UK 6-tab reference):**
  - No Calculator tab (ICD is reference-only, no dollar math)
  - No Browse tab (chapter browse deferred — FTS5 search covers most discovery)
  - No domain mode toggle (ICD has no NI-Mode-equivalent; ⌘K Actions group removed accordingly)
  - Tabs ⌘1~3 + ⌘, (Settings on standard macOS Preferences key only, no ⌘4)
  - ⌘K palette: no Recent group (state.tsx has no `recents`), no Actions group
  - DatabaseModal cites **Public Domain** rather than Tariff UK's OGL v3.0
- **Active blockers:** (mostly cleared 2026-08-05/06)
  - ~~Apple Developer cert not acquired~~ **DONE, verified end-to-end 2026-08-06.** DOIE LLC account active, Team ID `8636DYWLSV` (same team as the iOS app and the rest of the portfolio). The "Developer ID Application" cert already exists in Keychain (shared with mMDd/PasteLight, not newly generated), `.env` wired up (§6.5). A real universal build was signed + notarized + stapled successfully; `codesign -dv` / `spctl -a -vv` (→ "accepted", "Notarized Developer ID") / `xcrun stapler validate` (→ "worked!") all passed.
  - Windows code-signing cert not acquired → SmartScreen warning on install. Separate, unrelated purchase from the Apple side — see §6.5.
  - **Monetization switched from Lemon Squeezy to Gumroad** (2026-08-05) — `license.rs` was rewritten for Gumroad's `licenses/verify` API (see §10, rewritten). `PRODUCT_ID` in `license.rs` is set to `2vVCDdu-jffvO16Ks-FpGA==` — confirm this matches the real Gumroad product before relying on it; license activation is otherwise still untested end-to-end.
  - The hidden `SecretTapDetector`-equivalent premium override (`useSecretRhythm` in `SettingsView.tsx` + `toggle_override` in `license.rs`) was **removed** 2026-08-05, same reasoning as the iOS app's removal (silent free bypass of the paywall for anyone who found the gesture) — see §7 and the iOS project's `GOTCHAS.md` §20.
  - `ICD Snap_Win/` (a nested, gitignored, undocumented copy of this whole project) is **stale** — it predates Phase A~D + Polish and now also predates the Gumroad switch. It was NOT updated as part of the 2026-08-05 changes. It doesn't appear to be part of the actual build path (§6.3 says clone fresh onto the Windows machine; §6.4 CI builds Windows from this repo directly) — worth confirming it's unused and deleting it, since a second `license.rs` sitting around with the old Lemon Squeezy + hidden-override code is exactly the kind of stale copy that gets accidentally shipped later.
- **Next 3 steps:**
  1. **In progress 2026-08-06:** bumped to v1.0.1 (4 places), tagging + pushing now to trigger the Windows CI build with today's Gumroad + signing + hidden-override-removal changes — the v1.0.0 Windows .msi/.exe on the release is stale (pre-dates all of that). Still unsigned (Windows cert not acquired) — SmartScreen warning expected.
  2. Create the Gumroad product for real (or confirm the existing one) and end-to-end test a real license key activation — `PRODUCT_ID` in `license.rs` is set to `2vVCDdu-jffvO16Ks-FpGA==` but that hasn't been confirmed against a real purchase yet.
  3. Separately (unrelated to the above): manual smoke test of Phase A~D + Polish (keyboard nav, ⌘K palette, native menu, status bar, Favorites multi-select, 3 modals across 7 themes) — see Phase D/Step 4 smoke checklists in conversation logs — then bump to v1.1.0 for that UI work specifically.
- **Report-back trigger:** any `v*` tag push, any commit touching `license.rs` / `tauri.conf.json` / `.github/workflows/` / `src-tauri/src/menu.rs`, any Gumroad milestone, any signing config change, any new dataset bundled, any further IMPROVEMENT_PLAN Polish round
<!-- snap-series:manager-block:end -->

> Last updated 2026-08-06. App version 1.0.2.
> Repository: <https://github.com/RangeAreaScent/ICD-Snap-Desktop>
>
> **Series context.** ICD Snap is one of ten apps in the Snap series
> (Wave 1: ICD, Code, Drug, HCPCS, NAICS, Tariff — Wave 2: DOT, LOINC,
> NIOSH, IRS).
> For series-wide conventions, the live cross-app dashboard, and the
> bootstrap prompts for Claude sessions, see
> `../Snap Series Plan/` (especially `SNAP_SERIES_GUIDE.md` and
> `SNAP_SERIES_STATUS.md`). This document is the canonical reference
> for the **desktop side of ICD Snap specifically**.
>
> Read sections 1–6 first, then dip into the rest as needed.

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [Tech stack](#2-tech-stack)
3. [Repository layout](#3-repository-layout)
4. [Prerequisites](#4-prerequisites)
5. [Running in development](#5-running-in-development)
6. [Building for distribution](#6-building-for-distribution)
7. [Architecture](#7-architecture)
8. [Feature map — where each thing lives](#8-feature-map)
9. [Configuration](#9-configuration)
10. [Gumroad setup (the remaining external task)](#10-gumroad-setup)
11. [Updating the ICD-10-CM data (FY 2027 and beyond)](#11-updating-the-icd-10-cm-data)
12. [Maintenance recipes](#12-maintenance-recipes)
13. [Known gotchas](#13-known-gotchas)
14. [Testing](#14-testing)
15. [Command cheatsheet](#15-command-cheatsheet)
16. [Appendix A — Sample GitHub Actions CI](#appendix-a--sample-github-actions-ci)
17. [Appendix B — Hardening Gumroad (product_id check)](#appendix-b--hardening-gumroad)

---

## 1. What this is

ICD Snap Desktop is a Mac + Windows desktop port of the existing **ICD Snap**
iOS app — a fast, offline ICD-10-CM medical code lookup tool. It shares no
code with the iOS app; the iOS source (sibling folder `ICD Snap/`) is the
product reference only.

**Status as of handoff:** feature-complete.
- macOS universal DMG (Intel + Apple Silicon) packaged and verified
  locally end-to-end.
- Both macOS and Windows are built by the GitHub Actions CI workflow
  on every `v*` tag push (see §6.6 and Appendix A).
- Apple Developer signing and a Windows code-signing certificate are
  **not yet configured** — current artifacts are unsigned. Users see a
  Gatekeeper / SmartScreen warning on first launch.

**Core promise:** "Find ICD-10-CM codes in 2 seconds. No ads, no
subscription, works offline."

**Differentiation from the iOS app:**
- No alternate app icons (desktop app icons are fixed at install time).
- Premium = 4 themes **plus** unlimited favorites/collections (the iOS app's
  premium was cosmetic-only; we add freemium capacity limits to make
  premium an honest productivity upsell).
- Monetization via **Gumroad license keys** with online verification, not
  App Store IAP — avoids store fees and review cycles, works the same on
  Mac and Windows. (Switched from Lemon Squeezy 2026-08-05.)

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Shell | Tauri 2 (Rust backend, system webview frontend) |
| UI | React 19 + TypeScript + Vite |
| Backend lang | Rust (stable, edition 2021) |
| Read-only ICD data | `icd10cm_2026.sqlite` (~40 MB), bundled as a Tauri resource; FTS5 full-text + a prefix index. Accessed from Rust via `rusqlite` with the `bundled` feature (compiles SQLite + FTS5 in-tree). |
| User data | Plain JSON files in the app data directory, written atomically (`store.rs`). |
| Search abbreviations | Static dictionary (~125 entries) in `abbreviations.rs`, ported verbatim from the iOS app. |
| Premium license | Gumroad `licenses/verify` API (HTTP) via `ureq`. Online activate / validate / (local-only) deactivate. Device cap approximated client-side via the `uses` counter Gumroad returns — no server-side "instance" concept like Lemon Squeezy had. |
| PDF export | Native generation in Rust via `printpdf 0.8` (font subsetting). Bundled NanumGothic (SIL OFL 1.1) so Korean notes render correctly while keeping output small. |
| CSV export | Built in JS, written to a user-chosen path via Tauri's dialog plugin + a Rust `write_text_file` command. |
| Window zoom | `webview.setZoom()` for the text-size setting. |

---

## 3. Repository layout

```
ICD Snap_mac_win_app/
├── HANDOFF.md                      ← this file
├── package.json                    ← npm scripts + frontend deps
├── tsconfig.json
├── vite.config.ts
├── index.html
├── app-icon-source.png             ← original iOS logo (1024×1024, square)
├── app-icon-rounded.png            ← macOS-style rounded version
├── src/                            ← React/TS frontend
│   ├── main.tsx                    ← React root + bundled font imports
│   ├── App.tsx                     ← Providers + tab shell + premium modal + onboarding overlay
│   ├── state.tsx                   ← AppDataProvider (favorites, collections,
│   │                                   notes, freemium limits, prompt)
│   ├── settings.tsx                ← SettingsProvider (theme, font, size,
│   │                                   hasSeenOnboarding, license)
│   ├── api.ts                      ← Tauri invoke wrappers
│   ├── export.ts                   ← CSV / PDF export drivers
│   ├── types.ts
│   ├── styles.css                  ← Theme variable blocks + all UI styles
│   ├── assets/
│   │   └── app-icon.png            ← bundled by vite for in-UI rendering (onboarding hero)
│   └── components/
│       ├── SearchView.tsx
│       ├── FavoritesView.tsx
│       ├── CollectionsView.tsx     ← list + detail + menu + export wiring
│       ├── CodeRow.tsx
│       ├── CodeDetailView.tsx      ← detail pane, copy buttons, notes section
│       ├── SettingsView.tsx        ← appearance, premium, data, about
│       ├── OnboardingView.tsx      ← first-launch full-screen overlay (icon hero + 4 features + CTA)
│       ├── Modal.tsx
│       ├── AddToCollectionModal.tsx
│       ├── AddCodeModal.tsx
│       ├── CollectionFormModal.tsx ← new / rename
│       └── PremiumPromptModal.tsx  ← shown when a free-tier limit blocks an add
└── src-tauri/                      ← Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json             ← productName, identifier, bundle config
    ├── build.rs                    ← tauri-build
    ├── capabilities/default.json   ← webview permissions (dialog, opener, zoom)
    ├── icons/                      ← generated by `tauri icon`
    │   ├── icon.icns               ← macOS
    │   ├── icon.ico                ← Windows
    │   └── *.png                   ← various sizes
    ├── resources/
    │   ├── icd10cm_2026.sqlite     ← 40 MB FY 2026 dataset, bundled
    │   └── fonts/
    │       ├── NanumGothic-Regular.ttf  ← embedded for Korean PDF export
    │       ├── NanumGothic-Bold.ttf
    │       └── OFL.txt                  ← font license
    └── src/
        ├── main.rs                 ← thin entry; calls icdsnap_lib::run()
        ├── lib.rs                  ← Tauri builder, AppState, command list
        ├── icd.rs                  ← SQLite + FTS5 search + detail fetch
        ├── abbreviations.rs        ← 125+ clinical abbreviation expansions
        ├── store.rs                ← atomic JSON document store
        ├── license.rs              ← Gumroad license verification
        └── pdf.rs                  ← collection → PDF (with subsetting + CJK)
```

---

## 4. Prerequisites

### Common (all platforms)
- **Node.js 18+** (developed/tested on 24.15)
- **Rust stable** via [rustup](https://rustup.rs) (tested 1.95)
- **npm 9+**

### macOS
- **Xcode Command Line Tools** — `xcode-select --install`
- That's it. WebView (WKWebView) is part of the OS.

### Windows
- **rustup** — install from <https://rustup.rs>. The Windows installer
  defaults to the `x86_64-pc-windows-msvc` toolchain (what you want).
  **The rustup installer will offer to install the Visual Studio Build
  Tools 2022 for you (~1.3 GB download).** Say yes — it covers the
  next bullet automatically. No need to install Build Tools separately.
- **Microsoft Visual Studio 2022 Build Tools** with the
  "Desktop development with C++" workload — provides the MSVC linker and
  C runtime that the Rust `x86_64-pc-windows-msvc` toolchain links against.
  Installed by rustup as above; just verify the "Desktop development with
  C++" workload checkbox is checked during the VS Installer step.
- **Node.js 18+** for Windows.
- **WebView2 Runtime** — preinstalled on Windows 11. On Windows 10 the
  Tauri installer will download it during install (or the user can pre-
  install the Microsoft Evergreen Bootstrapper).

> **Cross-compiling Mac → Windows is not supported in practice.** Use a
> Windows machine, a VM, or GitHub Actions CI (Appendix A).

---

## 5. Running in development

```bash
# one-time
npm install

# every session
npm run tauri dev
```

What this does: starts Vite on `http://localhost:1420`, compiles the Rust
binary in dev mode, opens the app window. Frontend changes hot-reload
automatically; Rust changes trigger a recompile-and-relaunch on save.

**Devtools.** In dev builds, right-click anywhere in the app → "Inspect
Element" → standard Chromium DevTools.

**Logs.** Frontend: browser console (devtools). Rust: stdout of the
`npm run tauri dev` process.

**Stale port 1420.** Sometimes `tauri dev` exits but the Vite node process
keeps the port:
```bash
lsof -ti:1420 | xargs kill -9      # macOS / Linux
```
On Windows: `Get-Process -Name node | Stop-Process` (be careful — this
kills all node processes).

---

## 6. Building for distribution

### 6.1 macOS — Apple Silicon only

> Useful for fast local debugging. **Don't ship this as the public Mac
> release** — Intel Macs will refuse to launch it. The universal build
> below is what goes on the Releases page.

```bash
npm run tauri build
```

Output (`src-tauri/target/release/bundle/`):
- `macos/ICD Snap.app` (~49 MB — includes the 40 MB ICD DB)
- `dmg/ICD Snap_1.0.0_aarch64.dmg` (~10 MB — DMGs compress aggressively)

### 6.2 macOS — Universal (Intel + Apple Silicon, what ships)

```bash
rustup target add x86_64-apple-darwin
npm run tauri build -- --target universal-apple-darwin
```

Output: `ICD Snap_1.0.0_universal.dmg`. The `.app` binary becomes a fat
Mach-O containing both architectures (~2× the arm64 size). Use this for
public distribution.

### 6.3 Windows

On a Windows machine that satisfies the prerequisites in §4:

```cmd
git clone <repo>            REM or copy the project folder
cd ICD Snap_mac_win_app
npm install
npm run tauri build
```

Output (`src-tauri\target\release\bundle\`):
- `msi\ICD Snap_1.0.0_x64_en-US.msi`   ← MSI installer (recommended)
- `nsis\ICD Snap_1.0.0_x64-setup.exe`  ← NSIS setup wizard

Either one is a valid installer; ship whichever your audience prefers. The
MSI is more enterprise-friendly; the NSIS .exe is smaller and a friendlier
double-click flow for individual users.

#### 6.3.1 Windows build gotchas (learned the hard way)

These are the practical tripwires when doing the first Windows build,
especially if the project was originally developed on macOS. Hitting any
of them produces opaque error messages — save yourself the hour.

1. **Put the project at a space-free path.** Use `C:\dev\icdsnap` rather
   than `C:\Users\<you>\Desktop\ICD Snap_Win`. Tauri/cargo *usually*
   handle spaces, but rusqlite's build script and `cargo metadata`
   occasionally trip on them with cryptic errors. The fix is cheap, so
   just avoid the problem.

2. **Purge macOS metadata files (`._*`) before building on Windows.**
   If the project lived on iCloud Drive, an external drive, or any
   non-HFS volume on macOS, the OS scattered AppleDouble metadata
   files (`._default.json`, `._tauri.conf.json`, etc.) throughout the
   tree. They're invisible on Mac, fully visible on Windows, and Tauri
   chokes when its config loader reads one expecting UTF-8 JSON:

   ```
   failed to read file 'capabilities\._default.json':
   stream did not contain valid UTF-8
   ```

   Clean them on the Windows side before the first build:

   ```cmd
   cd C:\dev\icdsnap
   for /r %i in (._*) do @del "%i"
   ```

   Or via PowerShell (more reliable, handles edge cases):

   ```cmd
   powershell -Command "Get-ChildItem -Path . -Recurse -Force | Where-Object { $_.Name -like '._*' } | Remove-Item -Force"
   ```

   The repo's `.gitignore` excludes `._*` so this is a one-time
   cleanup *if you use Git* (recommended). For ZIP/USB transfers the
   metadata travels with the files — clean on Windows each time.

3. **Open a fresh terminal after installing rustup.** The installer
   updates `PATH`, but already-open `cmd`/PowerShell windows won't see
   it. Symptom: `npm run tauri build` fails with `failed to run 'cargo
   metadata' command... program not found`. Close and reopen the
   terminal, verify with `cargo --version`, then retry.

4. **"Desktop development with C++" workload must be checked in the
   Visual Studio Installer.** rustup auto-checks it during its
   first-time setup, but if you ran the VS Installer separately and
   unchecked it, the rust toolchain has no linker. Re-run the VS
   Installer → Modify → tick the workload.

5. **SmartScreen warning on first run is expected.** The installer
   isn't code-signed (see §6.5), so Windows shows "Windows protected
   your PC". Users click "More info" → "Run anyway". To eliminate the
   warning, buy a code-signing certificate and configure it per §6.5.

6. **Don't trust output silence.** `for /r %i in (._*) do @del "%i"`
   produces no output whether it found files or not (the `@` suppresses
   the echo). Always verify with `dir /s /b /a ._*` afterwards — if
   nothing matches, you'll get "File Not Found", which is the success
   case.

**WebView2.** Tauri's default `tauri.conf.json` doesn't specify a WebView2
install mode. On Windows 11 WebView2 is preinstalled. On older Windows 10
machines the installer will prompt to install it. If you want to bundle it
into the installer (~150 MB larger), edit `tauri.conf.json`:
```json
"bundle": {
  ...
  "windows": {
    "webviewInstallMode": { "type": "embedBootstrapper" }
  }
}
```

### 6.4 GitHub Actions CI — Windows-only (as currently shipped)

The shipped workflow (`.github/workflows/build.yml`) builds **only the
Windows artifacts** on tag push. Mac is intentionally excluded from CI
and is built locally on the maintainer's Mac via the §6.1 / §6.2 flow.

Why: locally we can drive the universal Mac DMG end-to-end (including
the `hdiutil` fallback in §13 gotcha #6 when `bundle_dmg.sh` chokes on
sandboxed shells), and we get to inspect the `.app` before publishing.
GitHub's macOS runner can do the build but adds compile time + DMG
quirks without giving us anything the local build doesn't already
produce.

Appendix A still includes the older Mac+Windows matrix as a reference
sample if you want to flip CI to do both — useful if/when there's no
local Mac to drive releases from. The minimal Windows-only workflow
that's currently shipped is what you'll find in the repo.

### 6.5 Code signing & notarization

Unsigned builds work but trigger scary warnings on other users' machines.

#### macOS — Developer ID + notarization (done, 2026-08-05)

DOIE LLC Apple Developer Program membership is active. The "Developer ID
Application" cert (SHA1 `744CB0A90F5B7DCD1D4BCD924E3566C62F07555A`) is
already in the login Keychain — it's the **same cert shared with mMDd and
PasteLight**, not a new one generated for this app. Confirm it's there:

```bash
security find-identity -v -p codesigning
# → "Developer ID Application: DOIE LLC (8636DYWLSV)"
```

Credentials live in a gitignored `.env` (see `.env.example` for the
shape) with the real values copied from `~/Projects/mMDd/.env` — same
team, same App Store Connect API key, reused across the portfolio.
**Tauri's env var names differ from electron-builder's** (which mMDd and
PasteLight use) even though the underlying credentials are identical —
see the warning comment in `.env.example` before copying values over;
mixing up `APPLE_API_KEY` (Key ID in Tauri vs. the `.p8` file path in
electron-builder) silently breaks notarization.

Build with the env vars sourced from `.env` automatically:
```bash
npm run tauri:mac              # Apple Silicon only, local debug (§6.1)
npm run tauri:mac:universal    # universal build, what ships (§6.2)
```
Tauri signs the `.app` and submits it for notarization in one step.
`APPLE_CERTIFICATE` / `APPLE_CERTIFICATE_PASSWORD` (base64 `.p12` +
password) are only needed in CI, where there's no Keychain to pull the
cert from — not needed for local builds.

**Verify a fresh build** (same recipe as mMDd, see its `HANDOFF.md` §7):
```bash
codesign -dv --verbose=2 "src-tauri/target/release/bundle/macos/ICD Snap.app"   # authority chain
spctl -a -vv "src-tauri/target/release/bundle/macos/ICD Snap.app"               # Gatekeeper accept
xcrun stapler validate "src-tauri/target/release/bundle/macos/ICD Snap.app"     # notary ticket stapled
```

#### Windows — code signing certificate
Requires a Code Signing Certificate (~$60–300/yr from Sectigo, DigiCert,
etc., or an EV cert for SmartScreen reputation). Add to
`tauri.conf.json`:
```json
"bundle": {
  "windows": {
    "certificateThumbprint": "AB12CD34...",
    "digestAlgorithm": "sha256",
    "timestampUrl": "http://timestamp.digicert.com"
  }
}
```

### 6.6 Cutting a release

The shipping path is **split: CI builds Windows, local builds Mac.**
Push a `v*` tag and the workflow produces the Windows MSI + NSIS .exe
in a draft GitHub Release. In parallel (or after), build the Mac
universal DMG locally and attach it to the same draft. The full
sequence:

1. **Bump the version in four places** (they must all match):
   - `src-tauri/Cargo.toml` → `version = "1.0.1"`
   - `src-tauri/tauri.conf.json` → `"version": "1.0.1"`
   - `package.json` → `"version": "1.0.1"`
   - `HANDOFF.md` header (manager-block + the preamble's
     `App version` line) → `1.0.1`
2. **Commit on `main`** with a `chore: bump to vX.Y.Z` message.
3. **Tag and push:**
   ```bash
   git tag v1.0.1
   git push origin main v1.0.1
   ```
4. **Watch the Windows CI run:**
   ```bash
   gh run watch                          # live status of the latest run
   gh run view --log-failed              # if anything fails, scoped logs
   ```
5. **Build the Mac universal DMG locally:**
   ```bash
   rustup target add x86_64-apple-darwin   # one-time
   npm run tauri build -- --target universal-apple-darwin
   # if bundle_dmg.sh fails, use the hdiutil fallback from §13 gotcha #6
   ```
6. **Attach the Mac DMG to the draft release** that CI created:
   ```bash
   gh release upload v1.0.1 \
     "src-tauri/target/universal-apple-darwin/release/bundle/dmg/ICD Snap_1.0.1_universal.dmg"
   ```
7. **Review the draft release** at
   `https://github.com/RangeAreaScent/ICD-Snap-Desktop/releases` — confirm
   the Mac `.dmg` and the Windows `.msi` + `.exe` are all attached and
   have sensible sizes (Mac ~18 MB DMG, Windows ~13 MB MSI).
8. **Smoke-test** at least the universal DMG on Apple Silicon (and Intel
   if you have access). See §14 for the checklist.
9. **Publish** the draft release in the GitHub UI when satisfied.

#### Redoing a botched tag

CI can fail after a tag is pushed (the failed run leaves a draft release
with partial or no artifacts attached). To redo cleanly:

```bash
gh release delete v1.0.1 --cleanup-tag --yes   # removes the draft + tag
git fetch --tags --prune --prune-tags          # sync local view
# fix whatever was broken, commit on main
git tag v1.0.1                                  # re-tag from new HEAD
git push origin v1.0.1                          # re-trigger CI
```

This is exactly what we did to recover the initial `v1.0.0` after the
Apple-codesign workflow misconfiguration was fixed (see §13 #13).

---

## 7. Architecture

### 7.1 Backend (Rust)

The Rust crate is named `icdsnap`, with a `_lib` suffix on the library
(`icdsnap_lib`) — required for Windows lib/bin coexistence.

Modules in `src-tauri/src/`:

- **`main.rs`** — 4-line entry: `fn main() { icdsnap_lib::run() }`.
- **`lib.rs`** — Tauri `Builder`, `AppState` (resolved db_path + data_dir),
  command registration. Plugins: `tauri-plugin-opener`,
  `tauri-plugin-dialog`. Capability: `core:webview:allow-set-webview-zoom`
  so `setZoom()` works from JS.
- **`icd.rs`** — actor-style read-only SQLite access. Each command opens a
  fresh `Connection` with `SQLITE_OPEN_READ_ONLY | SQLITE_OPEN_NO_MUTEX` —
  cheap (just a file handle), no shared locking, no contention. Two-stage
  search: code-prefix `LIKE` query first, then FTS5 `MATCH`, deduped.
- **`abbreviations.rs`** — `&[(&str, &str)]` constant + an `expand(query)`
  that tokenizes on non-alphanumerics, looks up uppercase tokens, joins
  matches into the expanded query. Mirrors the iOS dictionary 1:1.
- **`store.rs`** — `read(dir, name) -> Option<String>` and
  `write(dir, name, content)`. Atomic write = write `<name>.json.tmp` →
  `rename` to `<name>.json`. Validates JSON before persisting so a crash
  can never leave a half-written file.
- **`license.rs`** — Gumroad `licenses/verify` API client. No manual/hidden
  override of any kind (removed 2026-08-05 — see the "Active blockers"
  note at the top of this file):
  - `status(dir)` — instant, no network. Loads the stored license only.
  - `validate(dir)` — calls `verify` with `increment_uses_count=false`.
    Network failure → grace period (keep current state). Explicit invalid
    (bad key, refunded/chargebacked/disputed/cancelled purchase) → lock.
  - `activate(dir, key)` — a read-only `verify` first to read the current
    `uses` count against `MAX_ACTIVATIONS`, then a real `verify` with
    `increment_uses_count=true` if under the cap. On success stores
    `{unlocked, key}`.
  - `deactivate(dir)` — clears the local license file only. Gumroad has no
    API to release a used activation slot server-side.
- **`pdf.rs`** — collection → PDF. Uses `printpdf 0.8` which auto-subsets
  embedded fonts (only the glyphs actually used are stored in the PDF).
  Always embeds NanumGothic Regular + Bold (cheap with subsetting; ASCII
  exports → ~80 KB, Korean exports → ~40 KB). Manual page-flow layout,
  with a CJK-aware text wrapper that counts Hangul as ~2× the width of
  Latin characters. Three unit tests verify the output is a valid PDF.

### 7.2 Frontend (React / TypeScript)

- **`main.tsx`** — boots React, imports the bundled fonts:
  ```ts
  import "@fontsource-variable/inter";
  import "@fontsource/atkinson-hyperlegible/400.css";
  import "@fontsource/atkinson-hyperlegible/700.css";
  ```
- **`App.tsx`** — wraps everything in `<SettingsProvider><AppDataProvider>`,
  then `<AppShell>` (tab state + content + PremiumPromptModal + first-launch
  OnboardingView overlay gated by `hasSeenOnboarding`).
- **`state.tsx` — AppDataProvider** — exposes favorites, collections, notes,
  the freemium limits (`favoritesMax`, `collectionsMax`), and the pending
  `premiumPrompt`. Internally uses `usePersistentState` which loads once
  and persists on every change.
- **`settings.tsx` — SettingsProvider** — theme, fontFamily, fontSize,
  hasSeenOnboarding, and the license state. Settings persist together as
  one `settings.json` doc. Theme application uses a `data-theme` attribute
  on `<html>`. Font family sets the `--ui-font` CSS variable. Text size
  calls `getCurrentWebview().setZoom(factor)`.
- **`components/OnboardingView.tsx`** — first-launch full-screen overlay.
  Shows the app icon (loaded from `src/assets/app-icon.png`, vite-bundled),
  app name, tagline, 4 feature rows, footer, and a Get Started CTA. On
  dismiss it sets `hasSeenOnboarding = true` and the overlay never returns
  unless the user clears `settings.json`. Theme-aware via CSS variables.
- **`api.ts`** — `searchCodes`, `getCodeDetail`, `storeRead`, `storeWrite`.
- **`export.ts`** — collection → CSV (built in JS, written via the dialog
  plugin + the `write_text_file` Rust command) or PDF (calls the Rust
  `export_pdf` command). Both enrich items with full classification + the
  saved note before exporting.

### 7.3 IPC commands

| Command | Direction | Purpose | Inputs | Output |
|---|---|---|---|---|
| `search_codes` | JS → Rust | FTS5 + prefix search | `query`, `limit?` | `SearchResult[]` |
| `get_code_detail` | JS → Rust | Fetch full row by code | `code` | `CodeDetail \| null` |
| `store_read` | JS → Rust | Read a JSON doc | `name` | `string \| null` |
| `store_write` | JS → Rust | Atomically write a JSON doc | `name`, `content` | `()` |
| `write_text_file` | JS → Rust | Write text to a user-picked path | `path`, `content` | `()` |
| `export_pdf` | JS → Rust | Render a PDF from entries | `path`, `title`, `entries` | `()` |
| `license_status` | JS → Rust | Instant load (no network) | — | `LicenseState` |
| `license_activate` | JS → Rust | Gumroad verify + increment (online) | `key` | `LicenseState` |
| `license_validate` | JS → Rust | Gumroad verify, no increment (online + grace) | — | `LicenseState` |
| `license_deactivate` | JS → Rust | Clear local license (no server-side release) | — | `LicenseState` |

### 7.4 Data persistence

User data lives in the OS-standard app data directory under the bundle
identifier `cc.doie.icdsnap`:

- **macOS:** `~/Library/Application Support/cc.doie.icdsnap/`
- **Windows:** `%APPDATA%\cc.doie.icdsnap\` (i.e. `C:\Users\<you>\AppData\Roaming\cc.doie.icdsnap\`)
- **Linux:** `~/.config/cc.doie.icdsnap/` (if anyone ever builds for Linux)

Files written:
- `favorites.json` — `Favorite[]`
- `collections.json` — `Collection[]` (each with `items[]`)
- `notes.json` — `Record<code, {text, editedAt}>`
- `settings.json` — `{theme, fontFamily, fontSize, hasSeenOnboarding}`
- `license.json` — `{unlocked, key}`

The bundled SQLite DB is read-only at the app's Resource path; it never
moves to the user's data dir.

---

## 8. Feature map

Use this to jump straight to where a feature lives.

| Feature | Frontend | Backend |
|---|---|---|
| Search | `components/SearchView.tsx` | `icd.rs::search` + `abbreviations.rs` |
| Code detail | `components/CodeDetailView.tsx` | `icd.rs::fetch_detail` |
| Copy buttons | `CodeDetailView.tsx` (`navigator.clipboard`) | — |
| Favorites | `components/FavoritesView.tsx`, `state.tsx` | `store.rs` (`favorites`) |
| Collections | `components/CollectionsView.tsx`, `state.tsx` | `store.rs` (`collections`) |
| Add code to collection | `AddToCollectionModal.tsx`, `AddCodeModal.tsx` | — |
| Notes | `CodeDetailView.tsx` (`NoteSection`), `state.tsx` | `store.rs` (`notes`) |
| CSV export | `export.ts`, `CollectionsView.tsx` menu | `write_text_file` |
| PDF export | `export.ts` | `pdf.rs` (`export_pdf`) |
| Themes | `settings.tsx`, `styles.css` `[data-theme]` blocks | — |
| Font family | `main.tsx` imports, `settings.tsx` `FONT_STACKS` | — |
| Text size | `settings.tsx` `ZOOM_FACTORS` (`webview.setZoom`) | — |
| Gumroad license | `SettingsView.tsx` `PremiumSection`, `settings.tsx` | `license.rs` |
| Freemium limits | `state.tsx` `FREE_FAVORITES_MAX`, `FREE_COLLECTIONS_MAX` | — |
| Premium prompt modal | `components/PremiumPromptModal.tsx`, `App.tsx` | — |
| App icon (OS dock / installer) | `src-tauri/icons/`, `app-icon-*.png` | — |
| First-launch onboarding | `components/OnboardingView.tsx`, `src/assets/app-icon.png`, `settings.tsx` `hasSeenOnboarding` | — |

---

## 9. Configuration

Version is in four places — bump them together on a release (see §6.6
for the full release flow):
- `src-tauri/Cargo.toml` — `version = "1.0.0"`
- `src-tauri/tauri.conf.json` — `"version": "1.0.0"`
- `package.json` — `"version": "1.0.0"`
- `HANDOFF.md` header — `App version 1.0.0`

Bundle identifier (`cc.doie.icdsnap`) and product name (`ICD Snap`) live
in `src-tauri/tauri.conf.json`. Don't change the identifier post-launch
— it determines the app data directory path; changing it would orphan
existing users' data.

**Changed 2026-08-09**: was `com.ryan.icdsnap`, renamed to `cc.doie.icdsnap`
as part of a Snap-series-wide rebrand to the `cc.doie.*` prefix (matching
the DOIE LLC entity, not the earlier personal `com.ryan.*` convention). The
"don't change post-launch" rule above was knowingly overridden here — the
user judged v1.0.0–v1.0.2 hadn't seen real adoption yet, so the
orphaned-local-data risk for anyone who *did* install one of those was
accepted. Any Mac/Windows build shipped 2026-08-09 or later uses the new
identifier; local data from the older `com.ryan.icdsnap` installs will not
carry over automatically.

No secrets are stored in the repo. The Gumroad license API endpoint used
is unauthenticated (public) — that's how Gumroad's client-facing license
verification is designed to work.

---

## 10. Gumroad setup

The license integration is fully built (rewritten from Lemon Squeezy
2026-08-05 — see the "Active blockers" note at the top of this file) but
cannot work end-to-end until someone creates the actual Gumroad product.
The flow once set up:

1. **Sign up** at <https://gumroad.com>. Gumroad acts as merchant of
   record — handles global tax, payment, refunds, fraud.
2. **Create a Product:**
   - Name: e.g. "ICD Snap Premium"
   - Pricing: one-time, e.g. $4.99
   - **Generate license keys: enabled** (a checkbox on the product's
     Content tab).
3. **Product ID: already set** (2026-08-05) — `PRODUCT_ID` in
   `src-tauri/src/license.rs` is `2vVCDdu-jffvO16Ks-FpGA==`. Gumroad
   products created on/after 2023-01-09 need `product_id` (not
   `product_permalink`) for the verify call. See
   [Appendix B](#appendix-b--hardening-gumroad) if this ever needs
   changing (new product, moved to a different Gumroad account, etc).
4. **Test** with a real or Gumroad-generated test purchase:
   - In the app: Settings → Premium → paste key → Activate.
   - Gumroad has no separate sandbox environment or per-key "instance"
     list like Lemon Squeezy did — `license.rs` approximates the 2-device
     cap client-side using the `uses` counter Gumroad returns from
     `licenses/verify` (see `activate()` for the read-then-increment
     logic). Activating on a 3rd machine should be refused; there is no
     server-side "deactivate" call to free a slot again — `Deactivate on
     this computer` only clears the local file (see the note in
     `license.rs`).
5. **Point users at the Gumroad product page** from the in-app About page
   or marketing site. After purchase Gumroad emails the buyer their
   license key.

API endpoint used by the app (anonymous, no API key needed):
- `POST https://api.gumroad.com/v2/licenses/verify`

The activation flow stores `{key}` locally (no instance ID — Gumroad
doesn't have that concept). On each launch `validate` calls `verify` with
`increment_uses_count=false` (a read that doesn't burn an activation);
offline / Gumroad-down keeps the existing state (grace period). Only an
explicit invalid verdict (bad key, or a refunded/chargebacked/disputed/
cancelled purchase) locks premium.

---

## 11. Updating the ICD-10-CM data

CDC publishes annual ICD-10-CM updates (fiscal year, October cutover).
When FY 2027 comes out:

1. Download the FY 2027 CDC source files (public domain).
2. Build a SQLite with the same schema as the current `icd10cm_2026.sqlite`
   (a Python script does this in the iOS project's data pipeline):
   ```sql
   CREATE TABLE codes (
       code                 TEXT PRIMARY KEY,
       description          TEXT NOT NULL,
       is_billable          INTEGER NOT NULL,
       chapter_number       TEXT,
       chapter_description  TEXT,
       block_code           TEXT,
       block_description    TEXT,
       category_code        TEXT,
       category_description TEXT
   );
   CREATE VIRTUAL TABLE codes_fts USING fts5(
       code, description, content='codes', content_rowid='rowid'
   );
   CREATE INDEX idx_billable ON codes(is_billable);
   CREATE INDEX idx_chapter  ON codes(chapter_number);
   CREATE INDEX idx_block    ON codes(block_code);
   ```
   Don't forget to populate `codes_fts` from `codes`.
3. Drop `icd10cm_2027.sqlite` into `src-tauri/resources/`. Remove the 2026
   file or keep it around for diffs.
4. Update the path in two places:
   - `src-tauri/src/lib.rs` — the `app.path().resolve("resources/icd10cm_2026.sqlite", ...)` call.
   - `src-tauri/tauri.conf.json` — `bundle.resources`.
5. Update the version label in `src/components/SettingsView.tsx` (Data
   section: "FY 2026" → "FY 2027") and the billable code count.
6. Update the same in `src-tauri/src/pdf.rs` (the export header line).
7. Bump the app version (§9) and rebuild.

Existing users' favorites/collections/notes survive — they're keyed by
ICD code string, which is stable across years (deprecated codes still
exist in the new dataset, just not billable).

---

## 12. Maintenance recipes

### Change the free-tier limits
`src/state.tsx` — edit `FREE_FAVORITES_MAX` / `FREE_COLLECTIONS_MAX`.
Frontend-only; HMR picks it up. Also update the user-facing copy in
`src/components/SettingsView.tsx` (the "Free plan: X / 15 favorites…"
line) and in the prompt messages inside `state.tsx`.

### Add a new theme
1. `src/settings.tsx` — add to the `Theme` union, the `PREMIUM_THEMES` or
   `FREE_THEMES` array, and `THEME_LABELS`.
2. `src/styles.css` — add a `[data-theme="newname"] { --bg: ...; ... }`
   block. Keep all 16 CSS variables defined.
3. `src/components/SettingsView.tsx` — add a `SWATCH` entry (two hex
   values: outer background and accent dot).

### Add a new font family
1. `npm install @fontsource/<font>` (or `@fontsource-variable/<font>` for a
   variable font).
2. Import the CSS in `src/main.tsx`:
   ```ts
   import "@fontsource/your-font/400.css";
   import "@fontsource/your-font/700.css";
   ```
3. `src/settings.tsx` — add to `FontFamily` union, `FONT_FAMILIES`,
   `FONT_LABELS`, and `FONT_STACKS` (use the family name fontsource
   registered, e.g. `"Your Font"`).
4. `src/components/SettingsView.tsx` — add a `FONT_PREVIEW` stack so the
   preview card uses the right font.

### Add a new abbreviation
`src-tauri/src/abbreviations.rs` — add a `("ABBR", "expansion")` tuple to
the `DICTIONARY` constant. Lookup is uppercase-insensitive. Make sure the
expansion phrase appears verbatim in at least one ICD description, or
add multiple variants.

### Change zoom factors / add another text size
`src/settings.tsx` — `FontSize` union, `FONT_SIZES`, `FONT_SIZE_LABELS`,
`ZOOM_FACTORS`. The segmented control auto-renders the new option.

### Change the app icon
1. Replace `app-icon-source.png` (square) or `app-icon-rounded.png`
   (macOS-style rounded). Keep both for future regeneration.
2. `npm run tauri icon app-icon-rounded.png` — overwrites
   `src-tauri/icons/*`.
3. **Touch `src-tauri/src/lib.rs`** (so `generate_context!` re-embeds the
   window icon — see Gotcha #1).
4. Rebuild.

### Set the Gumroad `product_id` / device cap
See [Appendix B](#appendix-b--hardening-gumroad).

---

## 13. Known gotchas

1. **Icon changes don't auto-rebuild `lib.rs`.** The window icon is
   embedded by the `generate_context!` macro at compile time. Changing
   files in `src-tauri/icons/` doesn't change any `.rs` file, so cargo
   thinks nothing needs rebuilding. After `tauri icon`, `touch src-tauri/src/lib.rs`
   to force a recompile.

2. **Port 1420 lingers** sometimes after killing `tauri dev`. The Vite
   node child outlives the parent. `lsof -ti:1420 | xargs kill -9` on
   macOS; on Windows kill the node process via Task Manager.

3. **WKWebView (macOS) doesn't support `window.print()`.** That's why PDF
   export is implemented natively in Rust via `printpdf`. Don't be tempted
   to "simplify" by switching to webview print — it will silently no-op on
   Mac.

4. **macOS dock icon won't update in `tauri dev` without a lib.rs
   recompile.** Same root cause as #1. In packaged `.app` builds the icon
   comes from the embedded `.icns`, which is rebuilt every `tauri build`.

5. **Spaces in the project path.** The iCloud path contains spaces; most
   tools handle it but some need quoting. Always quote paths in shell
   commands.

6. **DMG creation runs `osascript`** to set the window layout — can fail
   silently when AppleScript can't reach Finder (CI, non-interactive
   shells, automation tools without Accessibility permission). The `.app`
   is still built; only the final DMG packaging aborts. Hand-create a DMG
   with `hdiutil` as a fallback — produces a clean drag-to-Applications
   DMG without any AppleScript:
   ```bash
   cd src-tauri/target/universal-apple-darwin/release/bundle
   rm -f "macos/rw."*".dmg"             # clean abandoned bundle_dmg tempfile
   mkdir -p _dmg_staging
   cp -R "macos/ICD Snap.app" _dmg_staging/
   ln -sf /Applications _dmg_staging/Applications
   hdiutil create -fs HFS+ -volname "ICD Snap" \
       -srcfolder _dmg_staging -format UDZO -ov \
       "dmg/ICD Snap_1.0.0_universal.dmg"
   rm -rf _dmg_staging
   ```
   This is what we used to produce the shipped universal DMG. The GitHub
   `macos-latest` runner has AppleScript access and `bundle_dmg.sh` works
   there — only local sandboxed shells hit the failure.

7. **No premium override exists (removed 2026-08-05).** There used to be
   a hidden version-tap rhythm (`useSecretRhythm` in `SettingsView.tsx`)
   toggling a `premium_override.json` flag that was OR-ed into the real
   license state, in every build — same idea as the iOS app's
   `SecretTapDetector`, which was removed the same day for the same
   reason: it's a silent, permanent, free bypass of the paywall for
   anyone who finds the gesture (see the iOS project's `GOTCHAS.md` §20
   for the full writeup). `isUnlocked` is now real license state only.
   `license.rs`'s `deactivate()` clears the local key but — unlike Lemon
   Squeezy's `/deactivate` — Gumroad has no API call to free the slot on
   their side; the device cap is a client-side approximation only (see
   §7 architecture notes and §10).

8. **printpdf 0.8 builtin font fallback:** if no `ParsedFont` is added,
   the builtin Helvetica is usable via `Op::WriteTextBuiltinFont` — but
   builtin fonts can't render non-Latin-1 chars. The current code always
   uses the embedded NanumGothic (subsetted, tiny) so any input renders
   correctly. Don't switch back to builtins without a non-Latin
   detection fallback.

9. **SwiftData/iOS schema-migration notes don't apply.** The desktop app
   uses plain JSON. To add a field, just default it on read.

10. **Korean PDF size scales with unique Hangul characters.** Subsetting
    embeds only the glyphs used. A PDF with 200 unique Hangul chars
    might be ~50 KB; one with 2000 unique chars ~200 KB. Still tiny vs.
    the unsubset 2 MB.

11. **macOS `._*` metadata files break Windows builds.** When the
    project lives on iCloud Drive or any non-HFS volume, macOS writes
    AppleDouble metadata files (`._default.json`, etc.) alongside
    every real file. They're invisible on macOS but visible on Windows,
    and Tauri's config loader fails with `stream did not contain
    valid UTF-8` when it tries to parse one. The repo's `.gitignore`
    excludes `._*`, so Git-based transfers are safe. For ZIP/USB
    transfers, clean on Windows before building (see §6.3.1 #2). When
    setting up a new Snap-series project, add `._*` to `.gitignore`
    on day one.

12. **GitHub Actions default token is read-only.** New repos created
    after ~mid-2023 get a workflow `GITHUB_TOKEN` with read-only
    `contents` permission by default. The `tauri-action` needs write
    access to create the Release, and the token must also be
    *explicitly* passed via `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.
    Without both, builds succeed but fail at the publish step with
    `Error: GITHUB_TOKEN is required` — see Appendix A for the
    workflow that already includes both fixes.

13. **Don't pass `APPLE_*` env vars on CI until you actually have a
    Developer ID cert.** If `APPLE_SIGNING_IDENTITY` is set as a
    secret (even partially set, or set to a stale value) but the
    matching `.p12` isn't imported into a keychain on the runner, the
    macOS build runs for ~15 min compiling everything and then dies at
    bundling with:
    ```
    error: The specified item could not be found in the keychain.
    failed codesign application: failed to run command codesign
    ```
    Tauri attempts to sign because *some* identity env var was provided;
    it cannot find the cert; the whole job fails. Fix: leave the
    `APPLE_*` env block out of the workflow until the full set
    (`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
    `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`) is configured as
    repo secrets. The current `.github/workflows/build.yml` ships
    *without* the APPLE_* lines for this reason — see the comment block
    inside it for the one-shot edit to add them when ready.

---

## 14. Testing

### Rust
```bash
cd src-tauri
cargo test --lib
```
Current suite (in `src/pdf.rs`):
- `produces_a_valid_ascii_pdf` — generates an English PDF with page break,
  asserts `%PDF-` header + `%%EOF`.
- `produces_a_small_korean_pdf` — Korean content with em-dash, asserts
  file size < 400 KB (verifies subsetting actually happened).
- `wrap_handles_long_words_and_cjk` — word wrap unit tests.

No tests for `icd.rs` / `license.rs` / `store.rs` yet — manual smoke
tests cover them. Worth adding once you have a CI pipeline.

### Frontend
No automated tests yet. The UI is small enough that manual smoke is
faster, and the components are decoupled (state vs. presentation) so
testing them in isolation is straightforward when you want to add Vitest.

### Manual smoke test (every release)
- [ ] Search: "hypertension" (description) / "I10" (code) / "HTN"
      (abbreviation) — all return relevant results.
- [ ] Code detail: click a result → details + copy buttons all paste
      correctly into a text app (4 buttons when a note exists: code only,
      code + description, code + note, full detail; 3 when no note).
      Full detail includes the note inline.
- [ ] Favorite: ☆ a code → switches state → appears in Favorites tab →
      survives app restart.
- [ ] Collection: create → add codes → ⋯ menu → CSV exports correctly
      (open in Numbers/Excel) → PDF exports correctly (open in Preview).
- [ ] Notes: add Korean text to a code's note → restart → still there →
      export PDF → Korean renders.
- [ ] Theme: pick each theme → UI updates → restart → persisted.
- [ ] Font: try each family + each size → restart → persisted.
- [ ] Free-tier limits: with no license activated, add 16th favorite →
      upsell modal. Try to create 11th collection → upsell modal.
      Existing data is not deleted.
- [ ] License: with the Gumroad product live, paste a real key →
      Activate succeeds → second machine activates → third machine
      refused (per `MAX_ACTIVATIONS` in `license.rs`).

---

## 15. Command cheatsheet

```bash
# install (once)
npm install

# dev
npm run tauri dev

# release — macOS Apple Silicon
npm run tauri build

# release — macOS universal (Intel + ARM)
rustup target add x86_64-apple-darwin
npm run tauri build -- --target universal-apple-darwin

# release — Windows (run on Windows)
npm run tauri build

# Rust tests
cd src-tauri && cargo test --lib

# regenerate app icons from a 1024×1024 PNG
npm run tauri icon app-icon-rounded.png
touch src-tauri/src/lib.rs   # force re-embed

# kill stuck dev server (macOS)
lsof -ti:1420 | xargs kill -9

# Mac signing env vars (before tauri build)
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAMID"

# release / CI flow (gh CLI)
git tag v1.0.1 && git push origin main v1.0.1   # trigger CI on tag
gh run watch                                     # live status of latest run
gh run list --workflow=build.yml --limit 5       # recent runs
gh run view <id> --log-failed                    # only failed steps' logs
gh release view v1.0.1                           # check draft release
gh release delete v1.0.1 --cleanup-tag --yes     # nuke a botched tag+release
```

---

## Appendix A — Sample GitHub Actions CI

Save as `.github/workflows/build.yml`. Triggers on every push of a tag
matching `v*` and produces Mac + Windows artifacts attached to a draft
release.

```yaml
name: build

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    permissions:
      contents: write          # required to create the Release
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            args: --target universal-apple-darwin
          - platform: windows-latest
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: setup node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: setup rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: cache cargo
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri

      - name: install frontend deps
        run: npm ci

      - name: build with tauri
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}   # required by tauri-action
          # No Apple signing yet — produces unsigned artifacts. Once an
          # Apple Developer cert is available, add these as repo secrets
          # and pass them here:
          #   APPLE_CERTIFICATE          (base64 of the exported .p12)
          #   APPLE_CERTIFICATE_PASSWORD
          #   APPLE_SIGNING_IDENTITY     ("Developer ID Application: Name (TEAMID)")
          #   APPLE_ID
          #   APPLE_PASSWORD             (app-specific password)
          #   APPLE_TEAM_ID
        with:
          args: ${{ matrix.args }}
          tagName: ${{ github.ref_name }}
          releaseName: 'ICD Snap ${{ github.ref_name }}'
          releaseDraft: true
```

On a release push (e.g. `git tag v1.0.0 && git push --tags`) this builds
a universal macOS DMG and a Windows MSI + NSIS and attaches them to a
draft GitHub Release for you to review and publish.

> **Why both `permissions: contents: write` AND the `GITHUB_TOKEN` env
> var?** Two separate requirements. The `permissions:` block widens
> the auto-token's scope from read-only (the post-2023 default for new
> repos) to read+write so it's *allowed* to create a release. The env
> var is needed because `tauri-action` reads `GITHUB_TOKEN` from the
> environment, not from the implicit context — without it the action
> exits early with `Error: GITHUB_TOKEN is required`. Omit either and
> the build succeeds (15+ minutes) but produces no Release. This bit
> us on the first attempted CI build; both lines are non-optional.

> **PAT `workflow` scope (one-time, for the developer pushing).** When
> first pushing this workflow file from a local machine, the developer's
> Personal Access Token must have the **`workflow`** scope in addition
> to `repo`. Otherwise `git push` is rejected with `refusing to allow
> a Personal Access Token to create or update workflow ... without
> workflow scope`. Fix: edit the PAT at
> <https://github.com/settings/tokens>, tick `workflow`, save. This is
> distinct from the `GITHUB_TOKEN` discussed above — the PAT is *your
> credential to push code*; `GITHUB_TOKEN` is *the runner's credential
> to create a release*. Same word "token", entirely different scopes
> and lifetimes.

---

## Appendix B — Hardening Gumroad

`PRODUCT_ID` in `src-tauri/src/license.rs` is already set (2026-08-05):

```rust
/// From the Gumroad product dashboard for "ICD Snap" — see HANDOFF.md §10.
const PRODUCT_ID: &str = "2vVCDdu-jffvO16Ks-FpGA==";
```

If this ever needs to change (new Gumroad product, moved accounts, etc),
find the real ID from the product's dashboard URL or the Gumroad API. An
empty `PRODUCT_ID` would make every `licenses/verify` call fail (or,
worse, could theoretically match against the wrong product if Gumroad
ever tolerates an empty value — don't rely on that).

**Tune the device cap.** `MAX_ACTIVATIONS` (also in `license.rs`,
currently `2`) controls how many machines one key can activate. This is
enforced entirely client-side — `activate()` reads the current `uses`
count with a non-incrementing `verify` call and refuses to proceed if
it's already at the cap, then makes a second `verify` call with
`increment_uses_count=true` to actually register this machine. There is
no Gumroad API to decrement `uses` or free a slot, so a user who
reinstalls without deactivating first will eventually hit the cap even
though they only ever used one real machine — worth a note in the UI
error message, or a generous cap, or accept it as a known rough edge for
a v1.

**Purchase validity.** `Purchase::is_valid()` checks `refunded`,
`chargebacked`, `disputed`, `subscription_cancelled_at`, and
`subscription_failed_at` from the `purchase` object Gumroad returns.
ICD Snap's product is a one-time non-subscription purchase, so only
`refunded`/`chargebacked`/`disputed` will realistically ever fire — the
subscription fields are there in case a future Snap-series product on
Gumroad is a subscription instead.

---

*End of handoff.*
