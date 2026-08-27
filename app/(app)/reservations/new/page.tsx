import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { ReservationForm } from "../ReservationForm";
import { createReservation } from "../actions";

export const metadata = { title: "新規予約 | デモ機運用管理" };

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string }>;
}) {
  const user = await requireUser();
  const { unitId } = await searchParams;

  const [users, locations, categories, unit] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      orderBy: { code: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    unitId
      ? prisma.demoUnit.findUnique({
          where: { id: unitId },
          include: { category: true, homeLocation: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        title="新規予約"
        description="期間を検索して空きデモ機を押さえます。重複はサーバ側で拒否されます。"
      />
      <ReservationForm
        action={createReservation}
        users={users}
        locations={locations}
        categories={categories}
        defaultRequestedById={user.role !== "ADMIN" ? user.id : undefined}
        defaultUnit={
          unit && unit.status !== "RETIRED"
            ? {
                id: unit.id,
                assetNo: unit.assetNo,
                name: unit.name,
                modelNumber: unit.modelNumber,
                categoryName: unit.category.name,
                locationId: unit.homeLocationId,
                locationName: unit.homeLocation.name,
              }
            : undefined
        }
      />
    </>
  );
}
