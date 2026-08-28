import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { Alert, Card, LinkButton, PageHeader } from "@/components/ui";
import { OverdueBadge, ResvStatusBadge } from "@/components/StatusBadge";
import { fmtDate, fmtDateTime, fmtDateW, isOverdue, loanDays } from "@/lib/format";
import { LifecycleActions } from "./LifecycleActions";
import { cancelReservation, cancelReservationUnit } from "../actions";
import { RESV_STATUS, RU_STATUS } from "@/lib/constants";

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
      childUnits: {
        where: { status: RU_STATUS.ACTIVE },
        include: { demoUnit: { include: { category: true } } },
        orderBy: { createdAt: "asc" },
      },
      requestedBy: true,
      pickedUpBy: true,
      returnedBy: true,
      pickupLocation: true,
      returnLocation: true,
    },
  });
  if (!r) notFound();

  const overdue = isOverdue(r.endDate, r.status);
  // 出荷後（貸出中）・返却後・キャンセル後はキャンセル不可。
  const canCancel = r.status === RESV_STATUS.CONFIRMED;
  const childCount = r.childUnits.length;

  return (
    <>
      <PageHeader
        title={`予約: ${r.demoUnit.name}${childCount > 0 ? ` 他${childCount}件` : ""}`}
        description={r.customerCompany}
        actions={
          <>
            <ResvStatusBadge status={r.status} />
            {overdue && <OverdueBadge />}
            {canCancel && (
              <LinkButton href={`/reservations/${r.id}/edit`} variant="secondary">
                編集
              </LinkButton>
            )}
          </>
        }
      />

      {overdue && (
        <div className="mb-4">
          <Alert tone="error">
            返却予定日（{fmtDateW(r.endDate)}）を過ぎています。至急返却処理を行ってください。
          </Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">予約内容</h2>
          <dl>
            <Row label={childCount > 0 ? "主デモ機" : "デモ機"}>
              <Link href={`/units/${r.demoUnit.id}`} className="underline">
                {r.demoUnit.name}（{r.demoUnit.assetNo} / {r.demoUnit.modelNumber}）
              </Link>
              <span className="ml-2 text-xs text-slate-500">
                {r.demoUnit.category.name}
              </span>
            </Row>
            {childCount > 0 && (
              <Row label="子デモ機">
                <ul className="space-y-1">
                  {r.childUnits.map((cu) => (
                    <li
                      key={cu.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Link
                        href={`/units/${cu.demoUnit.id}`}
                        className="underline"
                      >
                        {cu.demoUnit.name}（{cu.demoUnit.assetNo} /{" "}
                        {cu.demoUnit.modelNumber}）
                      </Link>
                      <span className="text-xs text-slate-500">
                        {cu.demoUnit.category.name}
                      </span>
                      {canCancel && (
                        <form action={cancelReservationUnit}>
                          <input
                            type="hidden"
                            name="reservationUnitId"
                            value={cu.id}
                          />
                          <button
                            type="submit"
                            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            この子機をキャンセル
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </Row>
            )}
            <Row label="期間">
              <span className="tabular">
                {fmtDateW(r.startDate)} 〜 {fmtDateW(r.endDate)}
              </span>{" "}
              <span className="text-slate-500">
                （{loanDays(r.startDate, r.endDate)}日間）
              </span>
            </Row>
            <Row label="出荷予定日">
              {r.plannedShipDate ? fmtDateW(r.plannedShipDate) : "-"}
            </Row>
            <Row label="担当営業">{r.requestedBy.name}</Row>
            <Row label="顧客会社">{r.customerCompany}</Row>
            <Row label="先方担当">{r.customerName}</Row>
            <Row label="返却拠点">{r.returnLocation.name}</Row>
            <Row label="備考">
              <span className="whitespace-pre-wrap">{r.notes}</span>
            </Row>
          </dl>

          <dl className="mt-3 border-t border-slate-100 pt-3">
            <div className="mb-1 text-xs font-semibold text-slate-500">
              送付先（デモ機の配送先）
            </div>
            <Row label="送付先名称">{r.shipToName}</Row>
            <Row label="担当者">{r.shipToContact}</Row>
            <Row label="電話番号">
              <span className="tabular">{r.shipToPhone}</span>
            </Row>
            <Row label="住所">
              {r.shipToPostal || r.shipToAddress ? (
                <span>
                  {r.shipToPostal && (
                    <span className="tabular">〒{r.shipToPostal} </span>
                  )}
                  {r.shipToAddress}
                </span>
              ) : (
                "-"
              )}
            </Row>
          </dl>

          <dl className="mt-3 border-t border-slate-100 pt-3">
            <Row label="予約ID">
              <span className="tabular text-slate-500">{r.id}</span>
            </Row>
            <Row label="作成日時">
              <span className="text-slate-500">{fmtDateTime(r.createdAt)}</span>
            </Row>
            <Row label="更新日時">
              <span className="text-slate-500">{fmtDateTime(r.updatedAt)}</span>
            </Row>
          </dl>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">操作</h2>
            <div className="space-y-2">
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
              <Row label="着指定日">
                {r.desiredArrivalDate ? fmtDate(r.desiredArrivalDate) : "-"}
              </Row>
              <Row label="時間指定">{r.desiredArrivalTime}</Row>
              <Row label="運送会社">{r.carrier}</Row>
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
