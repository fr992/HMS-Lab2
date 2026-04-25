import { useRef, useEffect, useState } from "react";

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
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
        aria-label="Row actions"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-lg leading-none">&#8942;</span>
      </button>
      {open && (
        <ul className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {onView && (
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100"
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
                className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100"
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
                className="w-full px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
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
                className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100"
                onClick={() => {
                  setOpen(false);
                  onModifyContact();
                }}
              >
                Modify contact
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
