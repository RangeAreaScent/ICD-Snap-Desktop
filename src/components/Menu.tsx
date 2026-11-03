import { useEffect, useRef, useState, type ReactNode } from "react";

/** A header icon button with a dropdown menu. Closes on an outside click or Esc,
 *  and carries the ARIA attributes a menu button needs. */
export function ActionMenu({
  icon,
  title,
  disabled,
  children,
}: {
  icon: ReactNode;
  title: string;
  disabled?: boolean;
  /** Menu items; call `close` after an action that should dismiss the menu. */
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        className="pane-header__action"
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
      </button>
      {open && (
        <div className="menu" role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** One row of an `ActionMenu`: label on the left, optional icon on the right. */
export function MenuItem({
  icon,
  danger,
  onClick,
  children,
}: {
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`menu__item${danger ? " menu__item--danger" : ""}`}
      role="menuitem"
      onClick={onClick}
    >
      <span>{children}</span>
      {icon}
    </button>
  );
}
