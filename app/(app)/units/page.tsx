import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/rbac";
import {
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { UnitStatusBadge } from "@/components/StatusBadge";
import { UNIT_STATUS_LABEL } from "@/lib/constants";

export const metadata = { title: "デモ機一覧 | デモ機運用管理" };

type SP = Promise<{
  q?: string;
  categoryId?: string;
  locationId?: string;
  status?: string;
}>;

export default async function UnitsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const canManage = hasRole(user, "MANAGER");

  const [categories, locations, units] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { code: "asc" } }),
    prisma.demoUnit.findMany({
      where: {
        ...(sp.categoryId ? { categoryId: sp.categoryId } : {}),
        ...(sp.locationId ? { homeLocationId: sp.locationId } : {}),
        ...(sp.status ? { status: sp.status } : {}),
        ...(sp.q
          ? {
              OR: [
                { name: { contains: sp.q } },
                { assetNo: { contains: sp.q } },
                { modelNumber: { contains: sp.q } },
                { serialNumber: { contains: sp.q } },
                { maker: { contains: sp.q } },
              ],
            }
          : {}),
      },
      include: { category: true, homeLocation: true },
      orderBy: { assetNo: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="デモ機一覧"
        description={`${units.length} 台`}
        actions={
          canManage ? (
            <LinkButton href="/units/new">＋ デモ機を登録</LinkButton>
          ) : null
        }
      />

      <form
        className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5"
        method="get"
      >
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="名称・管理番号・型番"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm lg:col-span-2"
        />
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
        <div className="flex gap-2">
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全状態</option>
            {Object.entries(UNIT_STATUS_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            絞込
          </button>
        </div>
      </form>

      {units.length === 0 ? (
        <EmptyState>該当するデモ機がありません。</EmptyState>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <Th>管理番号</Th>
                <Th>名称 / 型番</Th>
                <Th>シリアル№</Th>
                <Th>カテゴリ</Th>
                <Th>配置拠点</Th>
                <Th>状態</Th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <Td className="tabular font-medium">
                    <Link href={`/units/${u.id}`} className="text-slate-900 underline">
                      {u.assetNo}
                    </Link>
                  </Td>
                  <Td>
                    <div className="font-medium text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.modelNumber}</div>
                  </Td>
                  <Td className="tabular whitespace-nowrap text-slate-600">
                    {u.serialNumber ?? "-"}
                  </Td>
                  <Td>{u.category.name}</Td>
                  <Td>{u.homeLocation.name}</Td>
                  <Td>
                    <UnitStatusBadge status={u.status} />
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
