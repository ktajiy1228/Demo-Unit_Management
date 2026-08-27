import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { toDateInput } from "@/lib/format";
import { UnitForm } from "../../UnitForm";
import { updateUnit } from "../../actions";

export const metadata = { title: "デモ機を編集 | デモ機運用管理" };

export default async function EditUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER");
  const { id } = await params;

  const [unit, categories, locations] = await Promise.all([
    prisma.demoUnit.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { code: "asc" } }),
  ]);
  if (!unit) notFound();

  return (
    <>
      <PageHeader title={`デモ機を編集: ${unit.name}`} />
      <UnitForm
        action={updateUnit.bind(null, id)}
        categories={categories}
        locations={locations}
        submitLabel="更新する"
        defaults={{
          assetNo: unit.assetNo,
          name: unit.name,
          modelNumber: unit.modelNumber,
          maker: unit.maker ?? "",
          serialNumber: unit.serialNumber ?? "",
          accessories: unit.accessories ?? "",
          purchaseDate: toDateInput(unit.purchaseDate),
          categoryId: unit.categoryId,
          homeLocationId: unit.homeLocationId,
          status: unit.status,
          imageUrl: unit.imageUrl ?? "",
          notes: unit.notes ?? "",
        }}
      />
    </>
  );
}
