import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/rbac";
import {
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { ResvStatusBadge, UnitStatusBadge, OverdueBadge } from "@/components/StatusBadge";
import { MAINT_TYPE_LABEL, ACTIVE_RESV_STATUSES } from "@/lib/constants";
import { fmtDate, isOverdue } from "@/lib/format";
import { MaintenancePanel } from "./MaintenancePanel";
import { closeMaintenance } from "../actions";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-24 shrink-0 text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children || "-"}</dd>
    </div>
  );
}

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const canManage = hasRole(user, "MANAGER");

  const unit = await prisma.demoUnit.findUnique({
    where: { id },
    include: {
      category: true,
      homeLocation: true,
      reservations: {
        include: { requestedBy: true, pickupLocation: true, returnLocation: true },
        orderBy: { startDate: "desc" },
      },
      maintenance: {
        include: { createdBy: true },
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!unit) notFound();

  const upcoming = unit.reservations.filter(
    (r) => ACTIVE_RESV_STATUSES.includes(r.status),
  );
  const history = unit.reservations.filter(
    (r) => !ACTIVE_RESV_STATUSES.includes(r.status),
  );

  return (
    <>
      <PageHeader
        title={unit.name}
        description={`${unit.assetNo}・${unit.modelNumber}`}
        actions={
          <>
            <UnitStatusBadge status={unit.status} />
            {canManage && (
              <LinkButton href={`/units/${unit.id}/edit`} variant="secondary">
                編集
              </LinkButton>
            )}
            <LinkButton href={`/reservations/new?unitId=${unit.id}`}>
              このデモ機を予約
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">台帳情報</h2>
          {unit.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={unit.imageUrl}
              alt={unit.name}
              className="mb-3 max-h-48 w-full rounded-md object-cover"
            />
          )}
          <dl>
            <Row label="カテゴリ">{unit.category.name}</Row>
            <Row label="メーカー">{unit.maker}</Row>
            <Row label="シリアル">{unit.serialNumber}</Row>
            <Row label="配置拠点">{unit.homeLocation.name}</Row>
            <Row label="購入日">{unit.purchaseDate ? fmtDate(unit.purchaseDate) : "-"}</Row>
            <Row label="付属品">
              <span className="whitespace-pre-wrap">{unit.accessories}</span>
            </Row>
            <Row label="備考">
              <span className="whitespace-pre-wrap">{unit.notes}</span>
            </Row>
          </dl>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              予約・貸出（進行中 / 予定）
            </h2>
            {upcoming.length === 0 ? (
              <EmptyState>進行中・予定の予約はありません。</EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>期間</Th>
                    <Th>顧客 / 案件</Th>
                    <Th>担当</Th>
                    <Th>状態</Th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <Td className="tabular whitespace-nowrap">
                        <Link href={`/reservations/${r.id}`} className="underline">
                          {fmtDate(r.startDate)} 〜 {fmtDate(r.endDate)}
                        </Link>
                      </Td>
                      <Td>
                        <div>{r.customerCompany}</div>
                        <div className="text-xs text-slate-500">{r.projectName}</div>
                      </Td>
                      <Td>{r.requestedBy.name}</Td>
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
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">貸出履歴</h2>
            {history.length === 0 ? (
              <EmptyState>履歴はありません。</EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>期間</Th>
                    <Th>顧客 / 案件</Th>
                    <Th>状態</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <Td className="tabular whitespace-nowrap">
                        <Link href={`/reservations/${r.id}`} className="underline">
                          {fmtDate(r.startDate)} 〜 {fmtDate(r.endDate)}
                        </Link>
                      </Td>
                      <Td>
                        <div>{r.customerCompany}</div>
                        <div className="text-xs text-slate-500">{r.projectName}</div>
                      </Td>
                      <Td>
                        <ResvStatusBadge status={r.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">点検・修理</h2>
            {unit.maintenance.length === 0 ? (
              <EmptyState>記録はありません。</EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>区分</Th>
                    <Th>期間</Th>
                    <Th>内容</Th>
                    <Th>費用</Th>
                    {canManage && <Th />}
                  </tr>
                </thead>
                <tbody>
                  {unit.maintenance.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <Td>{MAINT_TYPE_LABEL[m.type] ?? m.type}</Td>
                      <Td className="tabular whitespace-nowrap">
                        {fmtDate(m.startDate)} 〜{" "}
                        {m.endDate ? (
                          fmtDate(m.endDate)
                        ) : (
                          <span className="text-orange-600">継続中</span>
                        )}
                      </Td>
                      <Td>
                        <span className="whitespace-pre-wrap">{m.description}</span>
                      </Td>
                      <Td className="tabular whitespace-nowrap">
                        {m.cost != null ? `¥${m.cost.toLocaleString()}` : "-"}
                      </Td>
                      {canManage && (
                        <Td>
                          {!m.endDate && (
                            <form action={closeMaintenance}>
                              <input type="hidden" name="id" value={m.id} />
                              <input
                                type="hidden"
                                name="demoUnitId"
                                value={unit.id}
                              />
                              <button
                                type="submit"
                                className="text-xs text-slate-600 underline hover:text-slate-900"
                              >
                                完了にする
                              </button>
                            </form>
                          )}
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            {canManage && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <MaintenancePanel unitId={unit.id} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
