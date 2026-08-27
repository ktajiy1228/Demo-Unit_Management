import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { AddCategoryForm, AddLocationForm, AddUserForm } from "./MasterForms";
import { UserRow } from "./UserRow";
import { deleteCategory } from "./actions";

export const metadata = { title: "マスタ管理 | デモ機運用管理" };

export default async function MastersPage() {
  await requireRole("ADMIN");

  const [locations, categories, users, unitCountByCat] = await Promise.all([
    prisma.location.findMany({ orderBy: { code: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { location: true },
    }),
    prisma.demoUnit.groupBy({ by: ["categoryId"], _count: { _all: true } }),
  ]);

  const catCount = (id: string) =>
    unitCountByCat.find((x) => x.categoryId === id)?._count._all ?? 0;

  return (
    <>
      <PageHeader title="マスタ管理" description="拠点・カテゴリ・ユーザー" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 拠点 */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">拠点</h2>
          <Table>
            <thead>
              <tr>
                <Th>コード</Th>
                <Th>名称</Th>
                <Th>住所</Th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id}>
                  <Td className="tabular">{l.code}</Td>
                  <Td>{l.name}</Td>
                  <Td className="text-slate-500">{l.address ?? "-"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <AddLocationForm />
          </div>
        </Card>

        {/* カテゴリ */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">カテゴリ</h2>
          <Table>
            <thead>
              <tr>
                <Th>名称</Th>
                <Th>デモ機数</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <Td>{c.name}</Td>
                  <Td className="tabular">{catCount(c.id)}</Td>
                  <Td>
                    {catCount(c.id) === 0 && (
                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-600 underline hover:text-red-800"
                        >
                          削除
                        </button>
                      </form>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <AddCategoryForm />
          </div>
        </Card>

        {/* ユーザー */}
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">ユーザー</h2>
          <Table>
            <thead>
              <tr>
                <Th>氏名</Th>
                <Th>メール</Th>
                <Th>権限</Th>
                <Th>所属拠点</Th>
                <Th>状態</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={{
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    active: u.active,
                    locationId: u.locationId,
                    location: { name: u.location.name },
                  }}
                  locations={locations.map((l) => ({ id: l.id, name: l.name }))}
                />
              ))}
            </tbody>
          </Table>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <AddUserForm
              locations={locations.map((l) => ({ id: l.id, name: l.name }))}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
