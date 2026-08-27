import Link from "next/link";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { Button, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { OverdueBadge, ResvStatusBadge } from "@/components/StatusBadge";
import { RESV_STATUS } from "@/lib/constants";
import { fmtDate, fmtDateW } from "@/lib/format";
import { logout } from "./actions";

export const metadata = { title: "ダッシュボード | デモ機運用管理" };

function ResvLine({
  r,
}: {
  r: {
    id: string;
    customerCompany: string;
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
          {r.customerCompany}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="tabular text-xs text-slate-500">
          {fmtDateW(r.startDate)}〜{fmtDateW(r.endDate)}
        </div>
        <ResvStatusBadge status={r.status} />
      </div>
    </li>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const dayAfterTomorrowStart = addDays(todayStart, 2);

  const [
    todaysShipments,
    todaysReturns,
    tomorrowsShipments,
    tomorrowsReturns,
    overdue,
    maintenance,
    stats,
  ] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          status: RESV_STATUS.CONFIRMED,
          plannedShipDate: { gte: todayStart, lt: tomorrowStart },
        },
        include: { demoUnit: true },
        orderBy: { plannedShipDate: "asc" },
      }),
      prisma.reservation.findMany({
        where: {
          status: RESV_STATUS.PICKED_UP,
          endDate: { gte: todayStart, lt: tomorrowStart },
        },
        include: { demoUnit: true },
        orderBy: { endDate: "asc" },
      }),
      prisma.reservation.findMany({
        where: {
          status: RESV_STATUS.CONFIRMED,
          plannedShipDate: { gte: tomorrowStart, lt: dayAfterTomorrowStart },
        },
        include: { demoUnit: true },
        orderBy: { plannedShipDate: "asc" },
      }),
      prisma.reservation.findMany({
        where: {
          status: RESV_STATUS.PICKED_UP,
          endDate: { gte: tomorrowStart, lt: dayAfterTomorrowStart },
        },
        include: { demoUnit: true },
        orderBy: { endDate: "asc" },
      }),
      prisma.reservation.findMany({
        where: {
          status: RESV_STATUS.PICKED_UP,
          endDate: { lt: todayStart },
        },
        include: { demoUnit: true },
        orderBy: { endDate: "asc" },
      }),
      prisma.maintenanceRecord.findMany({
        where: {
          startDate: { lte: todayStart },
          OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
        },
        include: { demoUnit: true },
        orderBy: { startDate: "asc" },
      }),
      prisma.demoUnit.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

  const statusCount = (s: string) =>
    stats.find((x) => x.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description={`${user.name} さん`}
        actions={
          <>
            <LinkButton href="/reservations/new">＋ 新規予約</LinkButton>
            <form action={logout}>
              <Button type="submit" variant="secondary">
                ログアウト
              </Button>
            </form>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            label: "予約あり",
            value: statusCount("RESERVED"),
            tone: "text-amber-700",
            href: "/reservations?status=CONFIRMED",
          },
          {
            label: "貸出中",
            value: statusCount("LOANED"),
            tone: "text-blue-700",
            href: "/reservations?status=PICKED_UP",
          },
          {
            label: "点検・修理中",
            value: statusCount("MAINTENANCE"),
            tone: "text-orange-700",
          },
        ].map((s) => {
          const body = (
            <>
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className={`text-2xl font-bold ${s.tone}`}>{s.value}</div>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block">
              <Card className="p-3 transition-colors hover:bg-slate-50">
                {body}
              </Card>
            </Link>
          ) : (
            <Card key={s.label} className="p-3">
              {body}
            </Card>
          );
        })}
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
            本日の出荷予定（{todaysShipments.length}）
          </h2>
          {todaysShipments.length === 0 ? (
            <EmptyState>本日の出荷予定はありません。</EmptyState>
          ) : (
            <ul>
              {todaysShipments.map((r) => (
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

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            明日の出荷予定（{tomorrowsShipments.length}）
          </h2>
          {tomorrowsShipments.length === 0 ? (
            <EmptyState>明日の出荷予定はありません。</EmptyState>
          ) : (
            <ul>
              {tomorrowsShipments.map((r) => (
                <ResvLine key={r.id} r={r} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            明日の返却予定（{tomorrowsReturns.length}）
          </h2>
          {tomorrowsReturns.length === 0 ? (
            <EmptyState>明日の返却予定はありません。</EmptyState>
          ) : (
            <ul>
              {tomorrowsReturns.map((r) => (
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
