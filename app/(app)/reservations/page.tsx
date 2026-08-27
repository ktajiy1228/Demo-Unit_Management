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
import { fmtDate, isOverdue } from "@/lib/format";

export const metadata = { title: "予約一覧 | デモ機運用管理" };

const TABS: { key: string; label: string }[] = [
  { key: "", label: "すべて" },
  { key: "REQUESTED", label: "申請中" },
  { key: "CONFIRMED", label: "確定" },
  { key: "PICKED_UP", label: "出庫済み" },
  { key: "RETURNED", label: "返却済み" },
  { key: "CANCELLED", label: "キャンセル" },
];

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireUser();
  const { status } = await searchParams;

  const reservations = await prisma.reservation.findMany({
    where: status ? { status } : {},
    include: {
      demoUnit: true,
      requestedBy: true,
      pickupLocation: true,
    },
    orderBy: [{ startDate: "desc" }],
  });

  return (
    <>
      <PageHeader
        title="予約一覧"
        description={`${reservations.length} 件`}
        actions={<LinkButton href="/reservations/new">＋ 新規予約</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/reservations?status=${t.key}` : "/reservations"}
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
      </div>

      {reservations.length === 0 ? (
        <EmptyState>該当する予約がありません。</EmptyState>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <Th>期間</Th>
                <Th>デモ機</Th>
                <Th>顧客 / 案件</Th>
                <Th>担当</Th>
                <Th>受渡拠点</Th>
                <Th>送り状No.</Th>
                <Th>状態</Th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td className="tabular whitespace-nowrap">
                    <Link href={`/reservations/${r.id}`} className="underline">
                      {fmtDate(r.startDate)} 〜 {fmtDate(r.endDate)}
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
                    <div className="text-xs text-slate-500">{r.projectName}</div>
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
