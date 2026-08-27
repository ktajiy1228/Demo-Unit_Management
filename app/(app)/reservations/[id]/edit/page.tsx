import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { toDateInput } from "@/lib/format";
import { ReservationEditForm } from "../ReservationEditForm";
import { updateReservation } from "../../actions";

export const metadata = { title: "予約を編集 | デモ機運用管理" };

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [reservation, users, locations] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id },
      include: { demoUnit: true },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      orderBy: { code: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!reservation) notFound();

  // 返却済み・キャンセル済みは編集不可 → 詳細へ戻す
  if (["RETURNED", "CANCELLED"].includes(reservation.status)) {
    redirect(`/reservations/${id}`);
  }

  return (
    <>
      <PageHeader
        title="予約を編集"
        description={`${reservation.customerCompany}`}
      />
      <ReservationEditForm
        id={id}
        action={updateReservation.bind(null, id)}
        users={users}
        locations={locations}
        unitLabel={`${reservation.demoUnit.name}（${reservation.demoUnit.assetNo} / ${reservation.demoUnit.modelNumber}）`}
        defaults={{
          startDate: toDateInput(reservation.startDate),
          endDate: toDateInput(reservation.endDate),
          plannedShipDate: toDateInput(reservation.plannedShipDate),
          requestedById: reservation.requestedById,
          customerCompany: reservation.customerCompany,
          customerName: reservation.customerName ?? "",
          shipToName: reservation.shipToName ?? "",
          shipToContact: reservation.shipToContact ?? "",
          shipToPhone: reservation.shipToPhone ?? "",
          shipToPostal: reservation.shipToPostal ?? "",
          shipToAddress: reservation.shipToAddress ?? "",
          pickupLocationId: reservation.pickupLocationId,
          returnLocationId: reservation.returnLocationId,
          notes: reservation.notes ?? "",
        }}
      />
    </>
  );
}
