import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Plus, UserPlus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function QuickAddMenu({ actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const availableActions = actions.filter((action) => action.visible !== false);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (availableActions.length === 0) return null;

  const icons = {
    patient: UserPlus,
    appointment: CalendarPlus,
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-700/20 transition hover:bg-blue-500"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Plus className="size-4" />
        Quick Add
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          {availableActions.map((action) => {
            const Icon = icons[action.kind] ?? Plus;
            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate(action.to, {
                    state: { returnTo: location.pathname },
                  });
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <Icon className="size-4" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
