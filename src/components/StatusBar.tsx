/** Phase D (SNAP_DESKTOP_IMPROVEMENT_PLAN.md) — bottom status bar.
 *
 * Single fixed-height strip at the bottom of the window. Left: dataset
 * metadata (codes count, snapshot version, source name). Right: a quiet
 * hint that ⌘K opens the command palette.
 *
 * Styles use CSS variables so the status bar follows whichever of the 7
 * themes is active — no per-theme branching needed.
 *
 * Stats are hard-coded for v1 — the bundle is refreshed annually (CDC
 * fiscal year, Oct 1) and these numbers change at the same cadence as
 * the SQLite.
 */
export function StatusBar() {
  return (
    <div className="status-bar" aria-label="Status">
      <div className="status-bar__left">
        <span className="status-bar__dot" aria-hidden />
        <span className="status-bar__text">
          74,714 billable codes · CDC FY 2026 · ICD-10-CM
        </span>
      </div>
      <div className="status-bar__right">
        <span className="status-bar__hint">
          Press <kbd className="status-bar__kbd">⌘K</kbd> for commands
        </span>
      </div>
    </div>
  );
}
