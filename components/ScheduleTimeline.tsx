import Link from "next/link";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isWeekend,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/cn";
import { RESV_STATUS_LABEL } from "@/lib/constants";

const DAY_W = 40; // px / 1日

export type TimelineUnit = {
  id: string;
  assetNo: string;
  name: string;
  bars: {
    id: string;
    kind: "reservation" | "maintenance";
    label: string;
    status?: string;
    start: Date;
    end: Date;
  }[];
};

const statusColor: Record<string, string> = {
  REQUESTED: "bg-slate-400",
  CONFIRMED: "bg-indigo-500",
  PICKED_UP: "bg-blue-600",
  RETURNED: "bg-emerald-500",
  CANCELLED: "bg-slate-300",
};

export function ScheduleTimeline({
  units,
  rangeStart,
  days,
}: {
  units: TimelineUnit[];
  rangeStart: Date;
  days: number;
}) {
  const start = startOfDay(rangeStart);
  const end = addDays(start, days - 1);
  const trackW = days * DAY_W;
  const dayList = Array.from({ length: days }, (_, i) => addDays(start, i));
  const today = startOfDay(new Date());
  const todayOffset = differenceInCalendarDays(today, start);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="min-w-fit">
        {/* 日付ヘッダ */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="sticky left-0 z-10 w-72 shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            デモ機
          </div>
          <div className="relative" style={{ width: trackW }}>
            <div className="flex">
              {dayList.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "shrink-0 border-r border-slate-100 py-1 text-center text-[10px] leading-tight",
                    isWeekend(d) ? "bg-slate-100 text-slate-400" : "text-slate-500",
                  )}
                  style={{ width: DAY_W }}
                >
                  <div>{format(d, "M/d")}</div>
                  <div>{format(d, "EEEEE")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 行 */}
        {units.map((u) => (
          <div key={u.id} className="flex items-stretch border-b border-slate-100">
            <div className="sticky left-0 z-10 w-72 shrink-0 border-r border-slate-200 bg-white px-3 py-2">
              <Link
                href={`/units/${u.id}`}
                className="block whitespace-normal break-words text-sm font-medium leading-snug text-slate-900 hover:underline"
              >
                {u.name}
              </Link>
              <div className="flex items-center justify-between">
                <span className="tabular text-[10px] text-slate-400">
                  {u.assetNo}
                </span>
                <Link
                  href={`/reservations/new?unitId=${u.id}`}
                  className="text-[10px] text-slate-500 underline hover:text-slate-800"
                >
                  ＋予約
                </Link>
              </div>
            </div>

            <div
              className="relative min-h-12 self-stretch"
              style={{ width: trackW }}
            >
              {/* 週末の縦帯 */}
              {dayList.map((d, i) =>
                isWeekend(d) ? (
                  <div
                    key={i}
                    className="absolute top-0 h-full bg-slate-50"
                    style={{ left: i * DAY_W, width: DAY_W }}
                  />
                ) : null,
              )}
              {/* 今日ライン */}
              {todayOffset >= 0 && todayOffset < days && (
                <div
                  className="absolute top-0 z-10 h-full w-px bg-red-400"
                  style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
                />
              )}

              {/* バー */}
              {u.bars.map((b) => {
                const s = startOfDay(b.start) < start ? start : startOfDay(b.start);
                const e = startOfDay(b.end) > end ? end : startOfDay(b.end);
                const offset = differenceInCalendarDays(s, start);
                const span = differenceInCalendarDays(e, s) + 1;
                if (span <= 0) return null;
                const color =
                  b.kind === "maintenance"
                    ? "bg-orange-500"
                    : statusColor[b.status ?? ""] ?? "bg-slate-400";
                const inner = (
                  <div
                    className={cn(
                      "absolute top-1/2 flex h-8 -translate-y-1/2 items-center overflow-hidden rounded px-1.5 text-[10px] font-medium text-white",
                      color,
                    )}
                    style={{
                      left: offset * DAY_W + 2,
                      width: span * DAY_W - 4,
                    }}
                    title={`${b.label}（${
                      b.kind === "maintenance"
                        ? "点検/修理"
                        : RESV_STATUS_LABEL[b.status ?? ""] ?? ""
                    }）`}
                  >
                    <span className="truncate">{b.label}</span>
                  </div>
                );
                return b.kind === "reservation" ? (
                  <Link key={b.id} href={`/reservations/${b.id}`}>
                    {inner}
                  </Link>
                ) : (
                  <div key={b.id}>{inner}</div>
                );
              })}
            </div>
          </div>
        ))}

        {units.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            表示できるデモ機がありません。
          </div>
        )}
      </div>
    </div>
  );
}
