import { cn } from "@/lib/cn";
import {
  RESV_STATUS_LABEL,
  UNIT_STATUS_LABEL,
} from "@/lib/constants";

const unitTone: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  RESERVED: "bg-amber-100 text-amber-800",
  LOANED: "bg-blue-100 text-blue-800",
  MAINTENANCE: "bg-orange-100 text-orange-800",
  RETIRED: "bg-slate-200 text-slate-600",
};

const resvTone: Record<string, string> = {
  REQUESTED: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  PICKED_UP: "bg-blue-100 text-blue-800",
  RETURNED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-500 line-through",
};

const badgeBase =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

export function UnitStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(badgeBase, unitTone[status] ?? "bg-slate-100 text-slate-700")}>
      {UNIT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function ResvStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(badgeBase, resvTone[status] ?? "bg-slate-100 text-slate-700")}>
      {RESV_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className={cn(badgeBase, "bg-red-600 text-white")}>返却遅延</span>
  );
}
