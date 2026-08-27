"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { fd, zodFieldErrors, type FormState } from "@/lib/form";
import {
  checkoutSchema,
  lifecycleNoteSchema,
  reservationSchema,
} from "@/lib/validators";
import { getConflicts, isUnitAvailable, recomputeUnitStatus } from "@/lib/availability";
import { RESV_STATUS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";

export async function createReservation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertRole("STAFF");

  const parsed = reservationSchema.safeParse({
    demoUnitId: fd(formData, "demoUnitId"),
    requestedById: fd(formData, "requestedById"),
    customerCompany: fd(formData, "customerCompany"),
    customerName: fd(formData, "customerName"),
    endUser: fd(formData, "endUser"),
    projectName: fd(formData, "projectName"),
    startDate: fd(formData, "startDate"),
    endDate: fd(formData, "endDate"),
    pickupLocationId: fd(formData, "pickupLocationId"),
    returnLocationId: fd(formData, "returnLocationId"),
    notes: fd(formData, "notes"),
  });
  if (!parsed.success) {
    return {
      error: "入力内容を確認してください",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const d = parsed.data;

  // サーバ側でダブルブッキングを最終チェック
  const available = await isUnitAvailable(d.demoUnitId, d.startDate, d.endDate);
  if (!available) {
    const { reservations, maintenance } = await getConflicts(
      d.demoUnitId,
      d.startDate,
      d.endDate,
    );
    const parts = [
      ...reservations.map(
        (r) =>
          `予約: ${fmtDate(r.startDate)}〜${fmtDate(r.endDate)}（${r.customerCompany}）`,
      ),
      ...maintenance.map(
        (m) => `点検/修理: ${fmtDate(m.startDate)}〜${m.endDate ? fmtDate(m.endDate) : "継続中"}`,
      ),
    ];
    return {
      error:
        `この期間は他の予約・点検と重複しています。${parts.join(" / ") || "対象機器は貸出できません。"}`,
      fieldErrors: { demoUnitId: "別の機器か期間を選んでください" },
    };
  }

  const created = await prisma.reservation.create({
    data: {
      demoUnitId: d.demoUnitId,
      requestedById: d.requestedById,
      customerCompany: d.customerCompany,
      customerName: d.customerName || null,
      endUser: d.endUser || null,
      projectName: d.projectName,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      pickupLocationId: d.pickupLocationId,
      returnLocationId: d.returnLocationId,
      notes: d.notes || null,
      status: RESV_STATUS.REQUESTED,
    },
  });
  await recomputeUnitStatus(d.demoUnitId);
  revalidatePath("/reservations");
  revalidatePath("/schedule");
  redirect(`/reservations/${created.id}`);
}

async function loadReservation(id: string) {
  const r = await prisma.reservation.findUnique({ where: { id } });
  if (!r) throw new Error("予約が見つかりません");
  return r;
}

export async function confirmReservation(formData: FormData): Promise<void> {
  await assertRole("STAFF");
  const id = fd(formData, "id");
  const r = await loadReservation(id);
  if (r.status !== RESV_STATUS.REQUESTED) throw new Error("確定できる状態ではありません");

  await prisma.reservation.update({
    where: { id },
    data: { status: RESV_STATUS.CONFIRMED },
  });
  await recomputeUnitStatus(r.demoUnitId);
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/reservations");
}

export async function checkoutReservation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await assertRole("STAFF");
  const id = fd(formData, "id");
  const parsed = checkoutSchema.safeParse({
    note: fd(formData, "note"),
    shippingTrackingNo: fd(formData, "shippingTrackingNo"),
    shipDate: fd(formData, "shipDate"),
    partsChecked: fd(formData, "partsChecked"),
    maintenanceChecked: fd(formData, "maintenanceChecked"),
    inverterChecked: fd(formData, "inverterChecked"),
  });
  if (!parsed.success) {
    return { error: "入力内容を確認してください" };
  }
  const c = parsed.data;

  const r = await loadReservation(id);
  if (
    !([RESV_STATUS.REQUESTED, RESV_STATUS.CONFIRMED] as string[]).includes(
      r.status,
    )
  ) {
    return { error: "出庫できる状態ではありません" };
  }

  // 出荷前チェック（資料の依頼事項: 整備・同梱部品・インバーター）を必須にする
  const missing: string[] = [];
  if (c.maintenanceChecked !== "on") missing.push("整備完了");
  if (c.partsChecked !== "on") missing.push("同梱部品（ネジ等）");
  if (c.inverterChecked !== "on") missing.push("インバーター");
  if (missing.length > 0) {
    return {
      error: `出荷前チェックが未完了です: ${missing.join(" / ")}`,
      fieldErrors: { checks: "すべてチェックしてください" },
    };
  }

  await prisma.reservation.update({
    where: { id },
    data: {
      status: RESV_STATUS.PICKED_UP,
      pickedUpAt: new Date(),
      pickedUpById: user.id,
      checkoutNote: c.note || null,
      shippingTrackingNo: c.shippingTrackingNo || null,
      shipDate: c.shipDate ? new Date(c.shipDate) : new Date(),
      partsChecked: true,
      maintenanceChecked: true,
      inverterChecked: true,
    },
  });
  await recomputeUnitStatus(r.demoUnitId);
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/reservations");
  revalidatePath("/schedule");
  revalidatePath("/");
  return { ok: true };
}

export async function checkinReservation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await assertRole("STAFF");
  const id = fd(formData, "id");
  const note = lifecycleNoteSchema.safeParse({ note: fd(formData, "note") });
  const r = await loadReservation(id);
  if (r.status !== RESV_STATUS.PICKED_UP) {
    return { error: "返却できる状態ではありません" };
  }

  await prisma.reservation.update({
    where: { id },
    data: {
      status: RESV_STATUS.RETURNED,
      returnedAt: new Date(),
      returnedById: user.id,
      returnNote: note.success ? note.data.note || null : null,
    },
  });
  await recomputeUnitStatus(r.demoUnitId);
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/reservations");
  revalidatePath("/schedule");
  revalidatePath("/");
  return { ok: true };
}

export async function cancelReservation(formData: FormData): Promise<void> {
  await assertRole("STAFF");
  const id = fd(formData, "id");
  const r = await loadReservation(id);
  if (
    ([RESV_STATUS.RETURNED, RESV_STATUS.CANCELLED] as string[]).includes(
      r.status,
    )
  ) {
    throw new Error("キャンセルできる状態ではありません");
  }

  await prisma.reservation.update({
    where: { id },
    data: { status: RESV_STATUS.CANCELLED },
  });
  await recomputeUnitStatus(r.demoUnitId);
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/reservations");
  revalidatePath("/schedule");
}
