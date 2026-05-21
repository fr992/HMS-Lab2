import { useRef } from "react";
import { Bed, ChevronLeft, ChevronRight, Edit3, Eye, UserPlus, UserX } from "lucide-react";
import { bedLocation, normalize } from "./bedUtils";

const BOARD_TONES = {
  occupied: {
    tile: "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100",
    icon: "text-blue-500",
    patient: "text-blue-500",
  },
  available: {
    tile: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    icon: "text-emerald-500",
    patient: "text-emerald-500",
  },
  maintenance: {
    tile: "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200",
    icon: "text-slate-400",
    patient: "text-slate-500",
  },
};

export default function BedBoard({
  beds,
  canAssign = false,
  canRelease = false,
  canUpdate = false,
  onAssign,
  onEdit,
  onRelease,
  onView,
}) {
  const groups = groupBeds(beds);

  return (
    <div className="space-y-4">
      <BedLegend />
      {groups.map((group) => (
        <section key={group.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">{group.title}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{group.subtitle}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {group.available} available
            </span>
          </div>

          <div className="-mx-1 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-1 pb-2 [scrollbar-gutter:stable]">
            {group.rooms.map((room) => (
              <div
                key={room.key}
                className="w-fit min-w-48 max-w-none shrink-0 snap-start rounded-lg border border-slate-200 bg-slate-50/70 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Room {room.roomNumber}</h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {room.beds.length} beds
                  </span>
                </div>
                <BedCarousel
                  beds={room.beds}
                  renderBed={(bed) => (
                    <BedBoardTile
                      bed={bed}
                      canAssign={canAssign}
                      canRelease={canRelease}
                      canUpdate={canUpdate}
                      onAssign={onAssign}
                      onEdit={onEdit}
                      onRelease={onRelease}
                      onView={onView}
                    />
                  )}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BedCarousel({ beds, renderBed }) {
  const scrollerRef = useRef(null);
  const showControls = beds.length > 4;

  function move(direction) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * scroller.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <div className="flex items-center gap-2">
      {showControls && (
        <CarouselButton label="Previous 4 beds" onClick={() => move(-1)} icon={ChevronLeft} />
      )}
      <div
        ref={scrollerRef}
        className="flex shrink-0 gap-2 overflow-hidden scroll-smooth"
        style={bedViewportStyle(beds.length)}
      >
        {beds.map((bed) => (
          <div key={bed.id} className="shrink-0">
            {renderBed(bed)}
          </div>
        ))}
      </div>
      {showControls && (
        <CarouselButton label="Next 4 beds" onClick={() => move(1)} icon={ChevronRight} />
      )}
    </div>
  );
}

function CarouselButton({ icon, label, onClick }) {
  const ActionIcon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
      aria-label={label}
      title={label}
    >
      <ActionIcon className="size-4" aria-hidden />
    </button>
  );
}

function bedViewportStyle(bedCount) {
  const visibleBeds = Math.max(1, Math.min(bedCount, 4));
  const gapCount = Math.max(0, visibleBeds - 1);
  return {
    width: `${visibleBeds * 9 + gapCount * 0.5}rem`,
    maxWidth: "calc(100vw - 12rem)",
  };
}

function BedBoardTile({
  bed,
  canAssign,
  canRelease,
  canUpdate,
  onAssign,
  onEdit,
  onRelease,
  onView,
}) {
  const state = getBedState(bed);
  const tone = BOARD_TONES[state];
  const assignment = bed.currentAssignment;
  const canOpen = Boolean(onView && assignment);

  return (
    <article className={`group min-h-20 w-36 shrink-0 rounded-lg border p-2 text-left transition ${tone.tile}`}>
      <button
        type="button"
        onClick={() => canOpen && onView(bed)}
        disabled={!canOpen}
        className="block w-full disabled:cursor-default"
        title={bedLocation(bed)}
      >
        <Bed className={`size-4 shrink-0 ${tone.icon}`} aria-hidden />
        <p className="mt-1 truncate text-sm font-semibold leading-tight">
          Bed {bed.bedNumber || `#${bed.id}`}
        </p>
        <p className={`mt-0.5 min-h-4 truncate text-[11px] ${tone.patient}`}>
          {assignment?.patientName || stateLabel(state)}
        </p>
      </button>

      {(canUpdate || (state === "available" && canAssign) || (state === "occupied" && canRelease)) && (
        <div className="mt-1.5 flex justify-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {canUpdate && (
            <IconButton label="Edit bed" onClick={() => onEdit?.(bed)} icon={Edit3} />
          )}
          {state === "occupied" && onView && (
            <IconButton label="View assignment" onClick={() => onView(bed)} icon={Eye} />
          )}
          {state === "available" && canAssign && (
            <IconButton label="Assign bed" onClick={() => onAssign?.(bed)} icon={UserPlus} />
          )}
          {state === "occupied" && canRelease && (
            <IconButton label="Release bed" onClick={() => onRelease?.(bed)} icon={UserX} />
          )}
        </div>
      )}
    </article>
  );
}

function IconButton({ icon, label, onClick }) {
  const ActionIcon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-6 items-center justify-center rounded-md border border-white/80 bg-white/85 text-slate-700 shadow-sm transition hover:bg-white"
      aria-label={label}
      title={label}
    >
      <ActionIcon className="size-3" aria-hidden />
    </button>
  );
}

function BedLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-slate-700">
      <LegendItem label="Occupied" className="border-blue-300 bg-blue-100" />
      <LegendItem label="Available" className="border-emerald-300 bg-emerald-100" />
      <LegendItem label="Maintenance" className="border-slate-300 bg-slate-200" />
    </div>
  );
}

function LegendItem({ label, className }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-3 rounded border ${className}`} />
      {label}
    </span>
  );
}

function groupBeds(beds) {
  const groups = new Map();

  for (const bed of beds) {
    const key = [bed.departmentName || bed.ward || "Unassigned ward", bed.floor || ""].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: bed.departmentName || bed.ward || "Unassigned ward",
        subtitle: bed.floor || bed.ward || "Floor not set",
        rooms: new Map(),
        available: 0,
      });
    }

    const group = groups.get(key);
    const roomKey = bed.roomNumber || "Unassigned";
    if (!group.rooms.has(roomKey)) {
      group.rooms.set(roomKey, {
        key: `${key}|${roomKey}`,
        roomNumber: roomKey,
        beds: [],
      });
    }
    group.rooms.get(roomKey).beds.push(bed);
    if (getBedState(bed) === "available") group.available += 1;
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      rooms: [...group.rooms.values()]
        .map((room) => ({
          ...room,
          beds: room.beds.sort((a, b) =>
            `${a.bedNumber || ""}`.localeCompare(`${b.bedNumber || ""}`)
          ),
        }))
        .sort((a, b) => `${a.roomNumber}`.localeCompare(`${b.roomNumber}`)),
    }))
    .sort((a, b) => `${a.title} ${a.subtitle}`.localeCompare(`${b.title} ${b.subtitle}`));
}

function getBedState(bed) {
  if (bed.isActive === false || ["inactive", "maintenance"].includes(normalize(bed.status))) {
    return "maintenance";
  }
  if (bed.currentAssignment || normalize(bed.status) === "occupied") {
    return "occupied";
  }
  return "available";
}

function stateLabel(state) {
  if (state === "maintenance") return "Maintenance";
  if (state === "available") return "Available";
  return "Occupied";
}
