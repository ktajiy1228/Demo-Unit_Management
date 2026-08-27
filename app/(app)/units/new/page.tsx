import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { UnitForm } from "../UnitForm";
import { createUnit } from "../actions";

export const metadata = { title: "デモ機を登録 | デモ機運用管理" };

export default async function NewUnitPage() {
  await requireRole("MANAGER");
  const [categories, locations] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="デモ機を登録" />
      <UnitForm
        action={createUnit}
        categories={categories}
        locations={locations}
        submitLabel="登録する"
      />
    </>
  );
}
