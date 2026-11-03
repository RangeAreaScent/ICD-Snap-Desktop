import { useDataset } from "../dataset";

/** Phase D (SNAP_DESKTOP_IMPROVEMENT_PLAN.md) — bottom status bar.
 *
 * Single fixed-height strip at the bottom of the window. Left: dataset
 * metadata (codes count, snapshot version, source name). Right: a quiet
 * hint that ⌘K opens the command palette.
 *
 * Styles use CSS variables so the status bar follows whichever of the 7
 * themes is active — no per-theme branching needed.
 *
 * The numbers come from the bundled database's meta table (see dataset.tsx).
 */
export function StatusBar() {
  const ds = useDataset();
  return (
    <div className="status-bar" aria-label="Status">
      <div className="status-bar__left">
        <span className="status-bar__dot" aria-hidden />
        <span className="status-bar__text">
          {ds.billableLabel} billable codes · CDC {ds.label} · ICD-10-CM
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
