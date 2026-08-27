import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { Alert, Card, PageHeader } from "@/components/ui";
import { OverdueBadge, ResvStatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtDateTime, isOverdue, loanDays } from "@/lib/format";
import { LifecycleActions } from "./LifecycleActions";
import { cancelReservation, confirmReservation } from "../actions";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children || "-"}</dd>
    </div>
  );
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const r = await prisma.reservation.findUnique({
    where: { id },
    include: {
      demoUnit: { include: { category: true } },
      requestedBy: true,
      pickedUpBy: true,
      returnedBy: true,
      pickupLocation: true,
      returnLocation: true,
    },
  });
  if (!r) notFound();

  const overdue = isOverdue(r.endDate, r.status);
  const canConfirm = r.status === "REQUESTED";
  const canCancel = !["RETURNED", "CANCELLED"].includes(r.status);

  return (
    <>
      <PageHeader
        title={`予約: ${r.demoUnit.name}`}
        description={`${r.customerCompany}・${r.projectName}`}
        actions={
          <>
            <ResvStatusBadge status={r.status} />
            {overdue && <OverdueBadge />}
          </>
        }
      />

      {overdue && (
        <div className="mb-4">
          <Alert tone="error">
            返却予定日（{fmtDate(r.endDate)}）を過ぎています。至急返却処理を行ってください。
          </Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">予約内容</h2>
          <dl>
            <Row label="デモ機">
              <Link href={`/units/${r.demoUnit.id}`} className="underline">
                {r.demoUnit.name}（{r.demoUnit.assetNo} / {r.demoUnit.modelNumber}）
              </Link>
            </Row>
            <Row label="カテゴリ">{r.demoUnit.category.name}</Row>
            <Row label="期間">
              <span className="tabular">
                {fmtDate(r.startDate)} 〜 {fmtDate(r.endDate)}
              </span>{" "}
              <span className="text-slate-500">
                （{loanDays(r.startDate, r.endDate)}日間）
              </span>
            </Row>
            <Row label="担当営業">{r.requestedBy.name}</Row>
            <Row label="顧客会社">{r.customerCompany}</Row>
            <Row label="先方担当">{r.customerName}</Row>
            <Row label="納入先">{r.endUser}</Row>
            <Row label="案件名">{r.projectName}</Row>
            <Row label="受渡拠点">{r.pickupLocation.name}</Row>
            <Row label="返却拠点">{r.returnLocation.name}</Row>
            <Row label="備考">
              <span className="whitespace-pre-wrap">{r.notes}</span>
            </Row>
          </dl>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">操作</h2>
            <div className="space-y-2">
              {canConfirm && (
                <form action={confirmReservation}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="w-full rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
                  >
                    予約を確定する
                  </button>
                </form>
              )}

              <LifecycleActions id={r.id} status={r.status} />

              {canCancel && (
                <form action={cancelReservation}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    予約をキャンセル
                  </button>
                </form>
              )}

              {r.status === "RETURNED" && (
                <p className="text-sm text-emerald-700">返却完了しています。</p>
              )}
              {r.status === "CANCELLED" && (
                <p className="text-sm text-slate-500">この予約はキャンセルされました。</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">出庫 / 返却の記録</h2>
            <dl>
              <Row label="出荷日">
                {r.shipDate ? fmtDate(r.shipDate) : "-"}
              </Row>
              <Row label="送り状No.">
                <span className="tabular">{r.shippingTrackingNo}</span>
              </Row>
              <Row label="出庫日時">
                {r.pickedUpAt ? fmtDateTime(r.pickedUpAt) : "-"}
              </Row>
              <Row label="出庫対応">{r.pickedUpBy?.name}</Row>
              <Row label="出荷前チェック">
                {r.pickedUpAt ? (
                  <span className="text-emerald-700">
                    整備・同梱部品・インバーター 確認済み
                  </span>
                ) : (
                  "-"
                )}
              </Row>
              <Row label="出庫メモ">
                <span className="whitespace-pre-wrap">{r.checkoutNote}</span>
              </Row>
              <Row label="返却日時">
                {r.returnedAt ? fmtDateTime(r.returnedAt) : "-"}
              </Row>
              <Row label="返却対応">{r.returnedBy?.name}</Row>
              <Row label="返却メモ">
                <span className="whitespace-pre-wrap">{r.returnNote}</span>
              </Row>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
