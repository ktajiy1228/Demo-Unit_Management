import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import {
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { OverdueBadge, ResvStatusBadge } from "@/components/StatusBadge";
import { RESV_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDateW, isOverdue } from "@/lib/format";

// 一覧の並び: 状態（確定→貸出中→返却済み→キャンセル）を最優先。
const STATUS_ORDER: Record<string, number> = {
  CONFIRMED: 0,
  PICKED_UP: 1,
  RETURNED: 2,
  CANCELLED: 3,
};

export const metadata = { title: "予約一覧 | デモ機運用管理" };

const TABS: { key: string; label: string }[] = [
  { key: "", label: "すべて" },
  { key: "CONFIRMED", label: "確定" },
  { key: "PICKED_UP", label: "貸出中" },
  { key: "RETURNED", label: "返却済み" },
  { key: "CANCELLED", label: "キャンセル" },
];

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; requestedById?: string }>;
}) {
  await requireUser();
  const { status, requestedById } = await searchParams;

  const [rows, users] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(requestedById ? { requestedById } : {}),
      },
      include: {
        demoUnit: true,
        requestedBy: true,
        pickupLocation: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // status / requestedById を保持したままリンク先を組み立てる。
  const hrefWith = (next: { status?: string; requestedById?: string }) => {
    const st = next.status ?? status;
    const rb = next.requestedById ?? requestedById;
    const p = new URLSearchParams();
    if (st) p.set("status", st);
    if (rb) p.set("requestedById", rb);
    const qs = p.toString();
    return qs ? `/reservations?${qs}` : "/reservations";
  };

  // 状態（確定→貸出中→返却済み→キャンセル）→ 出荷予定日 昇順 → 期間開始日 昇順。
  // 出荷予定日が未設定の予約は末尾。
  const reservations = rows.sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (s !== 0) return s;
    const ap = a.plannedShipDate?.getTime() ?? Infinity;
    const bp = b.plannedShipDate?.getTime() ?? Infinity;
    if (ap !== bp) return ap - bp;
    return a.startDate.getTime() - b.startDate.getTime();
  });

  return (
    <>
      <PageHeader
        title="予約一覧"
        description={`${reservations.length} 件`}
        actions={<LinkButton href="/reservations/new">＋ 新規予約</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={hrefWith({ status: t.key })}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              (status ?? "") === t.key
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
            )}
          >
            {t.label}
          </Link>
        ))}

        <form method="get" className="ml-auto flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <select
            name="requestedById"
            defaultValue={requestedById ?? ""}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">担当者：すべて</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            絞り込み
          </button>
          {requestedById && (
            <Link
              href={hrefWith({ requestedById: "" })}
              className="rounded-md px-2 py-1.5 text-sm text-slate-500 hover:text-slate-800"
            >
              解除
            </Link>
          )}
        </form>
      </div>

      {reservations.length === 0 ? (
        <EmptyState>該当する予約がありません。</EmptyState>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <Th>出荷予定日</Th>
                <Th>期間</Th>
                <Th>デモ機</Th>
                <Th>顧客</Th>
                <Th>担当</Th>
                <Th>発送拠点</Th>
                <Th>送り状No.</Th>
                <Th>状態</Th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td className="tabular whitespace-nowrap text-slate-600">
                    {fmtDate(r.plannedShipDate)}
                  </Td>
                  <Td className="tabular whitespace-nowrap">
                    <Link href={`/reservations/${r.id}`} className="underline">
                      {fmtDateW(r.startDate)} 〜 {fmtDateW(r.endDate)}
                    </Link>
                  </Td>
                  <Td>
                    <div className="font-medium text-slate-900">
                      {r.demoUnit.name}
                    </div>
                    <div className="tabular text-xs text-slate-500">
                      {r.demoUnit.assetNo}
                    </div>
                  </Td>
                  <Td>
                    <div>{r.customerCompany}</div>
                  </Td>
                  <Td className="whitespace-nowrap">{r.requestedBy.name}</Td>
                  <Td className="whitespace-nowrap">{r.pickupLocation.name}</Td>
                  <Td className="tabular whitespace-nowrap text-slate-600">
                    {r.shippingTrackingNo ?? "-"}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <ResvStatusBadge status={r.status} />
                    {isOverdue(r.endDate, r.status) && (
                      <span className="ml-1">
                        <OverdueBadge />
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}
