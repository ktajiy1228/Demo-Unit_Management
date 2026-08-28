import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import {
  ScheduleTimeline,
  type TimelineUnit,
} from "@/components/ScheduleTimeline";
import { ACTIVE_RESV_STATUSES, RU_STATUS, UNIT_STATUS } from "@/lib/constants";
import { toDateInput } from "@/lib/format";

export const metadata = { title: "予約カレンダー | デモ機運用管理" };

const DAYS = 28;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    categoryId?: string;
    locationId?: string;
  }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const rangeStart = startOfDay(
    sp.from && !Number.isNaN(Date.parse(sp.from))
      ? new Date(sp.from)
      : new Date(),
  );
  const rangeEnd = addDays(rangeStart, DAYS - 1);

  const [categories, locations, units] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { code: "asc" } }),
    prisma.demoUnit.findMany({
      where: {
        status: { not: UNIT_STATUS.RETIRED },
        ...(sp.categoryId ? { categoryId: sp.categoryId } : {}),
        ...(sp.locationId ? { homeLocationId: sp.locationId } : {}),
      },
      orderBy: { assetNo: "asc" },
      include: {
        reservations: {
          where: {
            status: { in: ACTIVE_RESV_STATUSES },
            startDate: { lte: rangeEnd },
            endDate: { gte: rangeStart },
          },
        },
        // 子デモ機として押さえられている予約（キャンセル済みの子は除外）
        reservationUnits: {
          where: {
            status: RU_STATUS.ACTIVE,
            reservation: {
              status: { in: ACTIVE_RESV_STATUSES },
              startDate: { lte: rangeEnd },
              endDate: { gte: rangeStart },
            },
          },
          include: { reservation: true },
        },
        maintenance: {
          where: {
            startDate: { lte: rangeEnd },
            OR: [{ endDate: null }, { endDate: { gte: rangeStart } }],
          },
        },
      },
    }),
  ]);

  const timelineUnits: TimelineUnit[] = units.map((u) => ({
    id: u.id,
    assetNo: u.assetNo,
    name: u.name,
    bars: [
      ...u.reservations.map((r) => ({
        id: r.id,
        kind: "reservation" as const,
        label: r.customerCompany,
        status: r.status,
        start: r.startDate,
        end: r.endDate,
      })),
      ...u.reservationUnits.map((ru) => ({
        id: ru.reservation.id,
        kind: "reservation" as const,
        label: ru.reservation.customerCompany,
        status: ru.reservation.status,
        start: ru.reservation.startDate,
        end: ru.reservation.endDate,
      })),
      ...u.maintenance.map((m) => ({
        id: m.id,
        kind: "maintenance" as const,
        label: m.type === "REPAIR" ? "修理" : "点検",
        start: m.startDate,
        end: m.endDate ?? rangeEnd,
      })),
    ],
  }));

  const prevFrom = toDateInput(addDays(rangeStart, -DAYS));
  const nextFrom = toDateInput(addDays(rangeStart, DAYS));
  const qs = (from: string) => {
    const p = new URLSearchParams({ from });
    if (sp.categoryId) p.set("categoryId", sp.categoryId);
    if (sp.locationId) p.set("locationId", sp.locationId);
    return `/schedule?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="予約カレンダー"
        description={`${format(rangeStart, "yyyy/MM/dd")} 〜 ${format(
          rangeEnd,
          "yyyy/MM/dd",
        )}`}
        actions={
          <>
            <Link
              href={qs(prevFrom)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              ← 前の4週
            </Link>
            <Link
              href={qs(toDateInput(new Date()))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              今日
            </Link>
            <Link
              href={qs(nextFrom)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              次の4週 →
            </Link>
          </>
        }
      />

      <form
        method="get"
        className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3"
      >
        <input type="hidden" name="from" value={toDateInput(rangeStart)} />
        <select
          name="categoryId"
          defaultValue={sp.categoryId ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全カテゴリ</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="locationId"
          defaultValue={sp.locationId ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全拠点</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          絞込
        </button>
      </form>

      <ScheduleTimeline
        units={timelineUnits}
        rangeStart={rangeStart}
        days={DAYS}
      />

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-indigo-500" />確定
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-blue-600" />貸出中
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-orange-500" />点検/修理
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-px bg-red-400" />今日
        </span>
      </div>
    </>
  );
}
