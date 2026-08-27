import Link from "next/link";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { OverdueBadge, ResvStatusBadge } from "@/components/StatusBadge";
import { RESV_STATUS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "ダッシュボード | デモ機運用管理" };

function ResvLine({
  r,
}: {
  r: {
    id: string;
    customerCompany: string;
    projectName: string;
    startDate: Date;
    endDate: Date;
    status: string;
    demoUnit: { name: string; assetNo: string };
  };
}) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
      <div className="min-w-0">
        <Link href={`/reservations/${r.id}`} className="font-medium underline">
          {r.demoUnit.name}
        </Link>
        <span className="tabular ml-1 text-xs text-slate-400">
          {r.demoUnit.assetNo}
        </span>
        <div className="truncate text-xs text-slate-500">
          {r.customerCompany}・{r.projectName}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="tabular text-xs text-slate-500">
          {fmtDate(r.startDate)}〜{fmtDate(r.endDate)}
        </div>
        <ResvStatusBadge status={r.status} />
      </div>
    </li>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const locId = sp.locationId;

  const unitWhere = locId ? { demoUnit: { homeLocationId: locId } } : {};

  const [locations, todaysPickups, todaysReturns, overdue, maintenance, stats] =
    await Promise.all([
      prisma.location.findMany({ orderBy: { code: "asc" } }),
      prisma.reservation.findMany({
        where: {
          status: { in: [RESV_STATUS.REQUESTED, RESV_STATUS.CONFIRMED] },
          startDate: { gte: todayStart, lt: tomorrowStart },
          ...unitWhere,
        },
        include: { demoUnit: true },
        orderBy: { startDate: "asc" },
      }),
      prisma.reservation.findMany({
        where: {
          status: RESV_STATUS.PICKED_UP,
          endDate: { gte: todayStart, lt: tomorrowStart },
          ...unitWhere,
        },
        include: { demoUnit: true },
        orderBy: { endDate: "asc" },
      }),
      prisma.reservation.findMany({
        where: {
          status: RESV_STATUS.PICKED_UP,
          endDate: { lt: todayStart },
          ...unitWhere,
        },
        include: { demoUnit: true },
        orderBy: { endDate: "asc" },
      }),
      prisma.maintenanceRecord.findMany({
        where: {
          startDate: { lte: todayStart },
          OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
          ...(locId ? { demoUnit: { homeLocationId: locId } } : {}),
        },
        include: { demoUnit: true },
        orderBy: { startDate: "asc" },
      }),
      prisma.demoUnit.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: locId ? { homeLocationId: locId } : {},
      }),
    ]);

  const statusCount = (s: string) =>
    stats.find((x) => x.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description={`${user.name} さん`}
        actions={<LinkButton href="/reservations/new">＋ 新規予約</LinkButton>}
      />

      <form method="get" className="mb-4 flex gap-2">
        <select
          name="locationId"
          defaultValue={locId ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          表示
        </button>
      </form>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "空き", value: statusCount("AVAILABLE"), tone: "text-emerald-700" },
          { label: "予約あり", value: statusCount("RESERVED"), tone: "text-amber-700" },
          { label: "貸出中", value: statusCount("LOANED"), tone: "text-blue-700" },
          {
            label: "点検・修理中",
            value: statusCount("MAINTENANCE"),
            tone: "text-orange-700",
          },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      {overdue.length > 0 && (
        <Card className="mb-4 border-red-200 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
            <OverdueBadge /> 返却遅延 {overdue.length} 件
          </h2>
          <ul>
            {overdue.map((r) => (
              <ResvLine key={r.id} r={r} />
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            本日の出庫予定（{todaysPickups.length}）
          </h2>
          {todaysPickups.length === 0 ? (
            <EmptyState>本日の出庫予定はありません。</EmptyState>
          ) : (
            <ul>
              {todaysPickups.map((r) => (
                <ResvLine key={r.id} r={r} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            本日の返却予定（{todaysReturns.length}）
          </h2>
          {todaysReturns.length === 0 ? (
            <EmptyState>本日の返却予定はありません。</EmptyState>
          ) : (
            <ul>
              {todaysReturns.map((r) => (
                <ResvLine key={r.id} r={r} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            点検・修理中（{maintenance.length}）
          </h2>
          {maintenance.length === 0 ? (
            <EmptyState>点検・修理中のデモ機はありません。</EmptyState>
          ) : (
            <ul>
              {maintenance.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0"
                >
                  <Link href={`/units/${m.demoUnit.id}`} className="underline">
                    {m.demoUnit.name}
                    <span className="tabular ml-1 text-xs text-slate-400">
                      {m.demoUnit.assetNo}
                    </span>
                  </Link>
                  <span className="text-xs text-slate-500">
                    {m.type === "REPAIR" ? "修理" : "点検"}・{fmtDate(m.startDate)}
                    〜{m.endDate ? fmtDate(m.endDate) : "継続中"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
