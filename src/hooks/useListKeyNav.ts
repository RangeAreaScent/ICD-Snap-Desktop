import { useEffect } from "react";

/** Phase A (SNAP_DESKTOP_IMPROVEMENT_PLAN.md) — list keyboard navigation.
 *
 * Wires ↑↓ to a result list so the user can drive the app without a
 * mouse. Selection lives in the parent (selectedCode + onSelect) so the
 * detail pane re-renders for free.
 *
 * Behaviour:
 *  - When a text input/textarea is focused, ↓ jumps to the first row and
 *    blurs the input so subsequent arrows keep navigating the list.
 *  - Once on the list, ↑↓ moves selection. Wrapping is intentionally off.
 *  - When `selectedCode` changes, the matching row is scrolled into view
 *    (the row carries `data-code={code}`).
 *  - Modifier keys are skipped so global ⌘ shortcuts win.
 *  - When the ⌘K palette is open ([cmdk-root] present), the hook bails
 *    so cmdk owns keyboard handling without our blur-on-↓ breaking it.
 */
export function useListKeyNav<T extends { code: string }>(
  items: T[],
  selectedCode: string | null,
  onSelect: (code: string) => void,
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (items.length === 0) return;

      if (document.querySelector("[cmdk-root]")) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inEditable = tag === "input" || tag === "textarea";

      if (e.key === "ArrowDown") {
        if (inEditable) {
          e.preventDefault();
          target?.blur();
          onSelect(items[0].code);
          return;
        }
        e.preventDefault();
        const idx = items.findIndex((i) => i.code === selectedCode);
        const next = idx < 0 ? 0 : Math.min(idx + 1, items.length - 1);
        onSelect(items[next].code);
      } else if (e.key === "ArrowUp") {
        if (inEditable) return;
        e.preventDefault();
        const idx = items.findIndex((i) => i.code === selectedCode);
        const next = idx <= 0 ? 0 : idx - 1;
        onSelect(items[next].code);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, selectedCode, onSelect]);

  useEffect(() => {
    if (!selectedCode) return;
    const el = document.querySelector(`[data-code="${selectedCode}"]`);
    if (el) {
      (el as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [selectedCode]);
}
