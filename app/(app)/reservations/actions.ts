"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { fd, zodFieldErrors, type FormState } from "@/lib/form";
import {
  checkoutSchema,
  lifecycleNoteSchema,
  reservationEditSchema,
  reservationSchema,
} from "@/lib/validators";
import {
  activeUnitIdsOf,
  getConflicts,
  isUnitAvailable,
  recomputeUnitStatus,
} from "@/lib/availability";
import { RESV_STATUS, RU_STATUS, UNIT_STATUS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { defaultPlannedShipDate, parseYmd } from "@/lib/business-days";

export async function createReservation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertRole("STAFF");

  const childDemoUnitIds = formData
    .getAll("childDemoUnitIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const parsed = reservationSchema.safeParse({
    primaryDemoUnitId: fd(formData, "primaryDemoUnitId"),
    childDemoUnitIds,
    requestedById: fd(formData, "requestedById"),
    customerCompany: fd(formData, "customerCompany"),
    customerName: fd(formData, "customerName"),
    shipToName: fd(formData, "shipToName"),
    shipToContact: fd(formData, "shipToContact"),
    shipToPhone: fd(formData, "shipToPhone"),
    shipToPostal: fd(formData, "shipToPostal"),
    shipToAddress: fd(formData, "shipToAddress"),
    startDate: fd(formData, "startDate"),
    endDate: fd(formData, "endDate"),
    plannedShipDate: fd(formData, "plannedShipDate"),
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
  // 主デモ機を先頭に、主＋子をまとめて扱う。
  const allUnitIds = [d.primaryDemoUnitId, ...d.childDemoUnitIds];

  const units = await prisma.demoUnit.findMany({
    where: { id: { in: allUnitIds } },
    select: {
      id: true,
      name: true,
      assetNo: true,
      status: true,
      homeLocationId: true,
    },
  });
  if (units.length !== allUnitIds.length) {
    return {
      error: "選択できないデモ機が含まれています。選び直してください。",
      fieldErrors: { primaryDemoUnitId: "デモ機を選び直してください" },
    };
  }
  if (units.some((u) => u.status === UNIT_STATUS.RETIRED)) {
    return {
      error: "廃棄・除却済みのデモ機は予約できません。",
      fieldErrors: { primaryDemoUnitId: "別のデモ機を選んでください" },
    };
  }
  // 配置拠点が異なるデモ機は同じ予約にできない。
  if (new Set(units.map((u) => u.homeLocationId)).size > 1) {
    return {
      error: "配置拠点が異なるデモ機は同じ予約にできません。",
      fieldErrors: { childDemoUnitIds: "主デモ機と同じ拠点のデモ機を選んでください" },
    };
  }

  // サーバ側でダブルブッキングを最終チェック（主＋子すべて）。
  const byId = new Map(units.map((u) => [u.id, u]));
  const conflictLines: string[] = [];
  for (const unitId of allUnitIds) {
    if (await isUnitAvailable(unitId, d.startDate, d.endDate)) continue;
    const { reservations, maintenance } = await getConflicts(
      unitId,
      d.startDate,
      d.endDate,
    );
    const parts = [
      ...reservations.map(
        (r) =>
          `予約 ${fmtDate(r.startDate)}〜${fmtDate(r.endDate)}（${r.customerCompany}）`,
      ),
      ...maintenance.map(
        (m) =>
          `点検/修理 ${fmtDate(m.startDate)}〜${m.endDate ? fmtDate(m.endDate) : "継続中"}`,
      ),
    ];
    const u = byId.get(unitId);
    conflictLines.push(
      `${u?.name ?? unitId}（${u?.assetNo ?? ""}）: ${parts.join(" / ") || "貸出不可"}`,
    );
  }
  if (conflictLines.length > 0) {
    return {
      error: `次のデモ機はこの期間に予約できません。${conflictLines.join(" ／ ")}`,
      fieldErrors: { primaryDemoUnitId: "別の機器か期間を選んでください" },
    };
  }

  const created = await prisma.reservation.create({
    data: {
      demoUnitId: d.primaryDemoUnitId,
      childUnits: d.childDemoUnitIds.length
        ? { create: d.childDemoUnitIds.map((id) => ({ demoUnitId: id })) }
        : undefined,
      requestedById: d.requestedById,
      customerCompany: d.customerCompany,
      customerName: d.customerName || null,
      shipToName: d.shipToName || null,
      shipToContact: d.shipToContact || null,
      shipToPhone: d.shipToPhone || null,
      shipToPostal: d.shipToPostal || null,
      shipToAddress: d.shipToAddress || null,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      plannedShipDate: d.plannedShipDate
        ? new Date(d.plannedShipDate)
        : defaultPlannedShipDate(parseYmd(d.startDate)),
      pickupLocationId: d.pickupLocationId,
      returnLocationId: d.returnLocationId,
      notes: d.notes || null,
      // 申請中は廃止。登録＝即確定。
      status: RESV_STATUS.CONFIRMED,
    },
  });
  for (const unitId of allUnitIds) await recomputeUnitStatus(unitId);
  revalidatePath("/reservations");
  revalidatePath("/schedule");
  revalidatePath("/");
  redirect(`/reservations/${created.id}`);
}

async function loadReservation(id: string) {
  const r = await prisma.reservation.findUnique({ where: { id } });
  if (!r) throw new Error("予約が見つかりません");
  return r;
}

export async function updateReservation(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertRole("STAFF");

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) return { error: "予約が見つかりません" };
  if (
    ([RESV_STATUS.RETURNED, RESV_STATUS.CANCELLED] as string[]).includes(
      existing.status,
    )
  ) {
    return { error: "返却済み・キャンセル済みの予約は編集できません" };
  }

  const parsed = reservationEditSchema.safeParse({
    requestedById: fd(formData, "requestedById"),
    customerCompany: fd(formData, "customerCompany"),
    customerName: fd(formData, "customerName"),
    shipToName: fd(formData, "shipToName"),
    shipToContact: fd(formData, "shipToContact"),
    shipToPhone: fd(formData, "shipToPhone"),
    shipToPostal: fd(formData, "shipToPostal"),
    shipToAddress: fd(formData, "shipToAddress"),
    startDate: fd(formData, "startDate"),
    endDate: fd(formData, "endDate"),
    plannedShipDate: fd(formData, "plannedShipDate"),
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

  // 期間を変えた場合は、自分自身を除いてダブルブッキングを再チェック（主＋アクティブな子すべて）。
  const unitIds = await activeUnitIdsOf(id);
  const unitNames = new Map(
    (
      await prisma.demoUnit.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, name: true, assetNo: true },
      })
    ).map((u) => [u.id, u]),
  );
  const conflictLines: string[] = [];
  for (const unitId of unitIds) {
    if (await isUnitAvailable(unitId, d.startDate, d.endDate, id)) continue;
    const { reservations, maintenance } = await getConflicts(
      unitId,
      d.startDate,
      d.endDate,
      id,
    );
    const parts = [
      ...reservations.map(
        (x) =>
          `予約 ${fmtDate(x.startDate)}〜${fmtDate(x.endDate)}（${x.customerCompany}）`,
      ),
      ...maintenance.map(
        (m) =>
          `点検/修理 ${fmtDate(m.startDate)}〜${m.endDate ? fmtDate(m.endDate) : "継続中"}`,
      ),
    ];
    const u = unitNames.get(unitId);
    conflictLines.push(
      `${u?.name ?? unitId}（${u?.assetNo ?? ""}）: ${parts.join(" / ") || "貸出不可"}`,
    );
  }
  if (conflictLines.length > 0) {
    return {
      error: `この期間は他の予約・点検と重複しています。${conflictLines.join(" ／ ")}`,
      fieldErrors: { endDate: "別の期間にしてください" },
    };
  }

  await prisma.reservation.update({
    where: { id },
    data: {
      requestedById: d.requestedById,
      customerCompany: d.customerCompany,
      customerName: d.customerName || null,
      shipToName: d.shipToName || null,
      shipToContact: d.shipToContact || null,
      shipToPhone: d.shipToPhone || null,
      shipToPostal: d.shipToPostal || null,
      shipToAddress: d.shipToAddress || null,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      plannedShipDate: d.plannedShipDate
        ? new Date(d.plannedShipDate)
        : defaultPlannedShipDate(parseYmd(d.startDate)),
      pickupLocationId: d.pickupLocationId,
      returnLocationId: d.returnLocationId,
      notes: d.notes || null,
    },
  });
  for (const unitId of unitIds) await recomputeUnitStatus(unitId);
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/reservations");
  revalidatePath("/schedule");
  revalidatePath("/");
  redirect(`/reservations/${id}`);
}

export async function checkoutReservation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await assertRole("STAFF");
  const id = fd(formData, "id");
  const parsed = checkoutSchema.safeParse({
    note: fd(formData, "note"),
    carrier: fd(formData, "carrier"),
    shippingTrackingNo: fd(formData, "shippingTrackingNo"),
    shipDate: fd(formData, "shipDate"),
    desiredArrivalDate: fd(formData, "desiredArrivalDate"),
    desiredArrivalTime: fd(formData, "desiredArrivalTime"),
    partsChecked: fd(formData, "partsChecked"),
    maintenanceChecked: fd(formData, "maintenanceChecked"),
    inverterChecked: fd(formData, "inverterChecked"),
  });
  if (!parsed.success) {
    return { error: "入力内容を確認してください" };
  }
  const c = parsed.data;

  const r = await loadReservation(id);
  if (r.status !== RESV_STATUS.CONFIRMED) {
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
      carrier: c.carrier || null,
      shippingTrackingNo: c.shippingTrackingNo || null,
      shipDate: c.shipDate ? new Date(c.shipDate) : new Date(),
      desiredArrivalDate: c.desiredArrivalDate
        ? new Date(c.desiredArrivalDate)
        : null,
      desiredArrivalTime: c.desiredArrivalTime || "AM",
      partsChecked: true,
      maintenanceChecked: true,
      inverterChecked: true,
    },
  });
  // 一部出荷は不可。主＋アクティブな子すべてを LOANED に。
  for (const unitId of await activeUnitIdsOf(id)) await recomputeUnitStatus(unitId);
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

  // 一部返却は不可。主＋アクティブな子すべてを返却前に id を取得しておく。
  const unitIds = await activeUnitIdsOf(id);
  await prisma.reservation.update({
    where: { id },
    data: {
      status: RESV_STATUS.RETURNED,
      returnedAt: new Date(),
      returnedById: user.id,
      returnNote: note.success ? note.data.note || null : null,
    },
  });
  for (const unitId of unitIds) await recomputeUnitStatus(unitId);
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
  // 出荷後（貸出中）・返却済み・キャンセル済みは不可。確定状態のみキャンセルできる。
  if (r.status !== RESV_STATUS.CONFIRMED) {
    throw new Error(
      "確定状態の予約のみキャンセルできます（出荷後・返却後は不可）",
    );
  }

  const unitIds = await activeUnitIdsOf(id);
  await prisma.reservation.update({
    where: { id },
    data: { status: RESV_STATUS.CANCELLED },
  });
  for (const unitId of unitIds) await recomputeUnitStatus(unitId);
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/reservations");
  revalidatePath("/schedule");
  revalidatePath("/");
}

/**
 * 子デモ機を1台だけキャンセルする。
 * 案件が確定（CONFIRMED）のときのみ可。主デモ機は対象外（案件キャンセルへ）。
 */
export async function cancelReservationUnit(formData: FormData): Promise<void> {
  await assertRole("STAFF");
  const reservationUnitId = fd(formData, "reservationUnitId");
  const ru = await prisma.reservationUnit.findUnique({
    where: { id: reservationUnitId },
    include: { reservation: { select: { id: true, status: true } } },
  });
  if (!ru) throw new Error("対象の子デモ機が見つかりません");
  if (ru.status !== RU_STATUS.ACTIVE) {
    throw new Error("この子デモ機はすでにキャンセルされています");
  }
  if (ru.reservation.status !== RESV_STATUS.CONFIRMED) {
    throw new Error("出荷後・返却後の子デモ機はキャンセルできません");
  }

  await prisma.reservationUnit.update({
    where: { id: reservationUnitId },
    data: { status: RU_STATUS.CANCELLED, cancelledAt: new Date() },
  });
  await recomputeUnitStatus(ru.demoUnitId);
  revalidatePath(`/reservations/${ru.reservation.id}`);
  revalidatePath("/reservations");
  revalidatePath("/schedule");
  revalidatePath("/");
}
