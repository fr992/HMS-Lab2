import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

const MENU_W = 192; // w-48
const ROW_PX = 40;
const PAD_PX = 8;

/**
 * @param {object} props
 * @param {() => void} [props.onView]
 * @param {() => void} [props.onEdit]
 * @param {() => void} [props.onDelete]
 * @param {() => void} [props.onModifyContact]
 */
export default function PatientActionsMenu({
  onView,
  onEdit,
  onDelete,
  onModifyContact,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const nudgedForOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (!open) {
      nudgedForOpenRef.current = false;
      setPos(null);
      return;
    }

    const el = buttonRef.current;
    if (!el) return;
    const n = [onView, onEdit, onDelete, onModifyContact].filter(Boolean)
      .length;
    if (n < 1) return;

    const r = el.getBoundingClientRect();
    const menuH = PAD_PX * 2 + n * ROW_PX;
    const gap = 4;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const margin = 8;

    nudgedForOpenRef.current = false;
    let top = r.bottom + gap;
    if (r.bottom + gap + menuH > vh - margin && r.top - gap - menuH > margin) {
      top = r.top - gap - menuH;
    }
    if (top + menuH > vh - margin) {
      top = Math.max(margin, vh - margin - menuH);
    }
    if (top < margin) top = margin;

    let left = r.right - MENU_W;
    if (left < margin) left = margin;
    if (left + MENU_W > vw - margin) {
      left = Math.max(margin, vw - MENU_W - margin);
    }

    setPos({ top, left });
  }, [open, onView, onEdit, onDelete, onModifyContact]);

  useLayoutEffect(() => {
    if (!open || !pos || nudgedForOpenRef.current) return;
    const menu = menuRef.current;
    if (!menu) return;
    const m = menu.getBoundingClientRect();
    const vh = window.innerHeight;
    if (m.bottom <= vh - 4) return;
    nudgedForOpenRef.current = true;
    const nudge = m.bottom - (vh - 4);
    setPos((p) =>
      p ? { left: p.left, top: Math.max(4, p.top - nudge) } : p
    );
  }, [open, pos]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", close, true);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", close, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onRe = () => setOpen(false);
    window.addEventListener("resize", onRe);
    return () => window.removeEventListener("resize", onRe);
  }, [open]);

  const menu = open && pos
    ? createPortal(
        <ul
          ref={menuRef}
          className="pointer-events-auto fixed m-0 list-none p-0 text-slate-900 [z-index:200] w-48 min-w-48 max-w-48 rounded-lg border border-slate-200/90 bg-white py-1.5 shadow-xl"
          style={{ top: pos.top, left: pos.left }}
          role="menu"
        >
          {onView && (
            <li>
              <button
                type="button"
                className="w-full cursor-pointer select-none px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-100"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onView();
                }}
              >
                View
              </button>
            </li>
          )}
          {onEdit && (
            <li>
              <button
                type="button"
                className="w-full cursor-pointer select-none px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-100"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                Edit
              </button>
            </li>
          )}
          {onDelete && (
            <li>
              <button
                type="button"
                className="w-full cursor-pointer select-none px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              >
                Delete
              </button>
            </li>
          )}
          {onModifyContact && (
            <li>
              <button
                type="button"
                className="w-full cursor-pointer select-none px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-100"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onModifyContact();
                }}
              >
                Modify contact
              </button>
            </li>
          )}
        </ul>,
        document.body
      )
    : null;

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          ref={buttonRef}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
          aria-label="Row actions"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <span className="text-lg leading-none">&#8942;</span>
        </button>
      </div>
      {menu}
    </>
  );
}
