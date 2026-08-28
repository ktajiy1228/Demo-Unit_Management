import { startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ACTIVE_RESV_STATUSES,
  RESV_STATUS,
  RU_STATUS,
  UNIT_STATUS,
} from "@/lib/constants";

/**
 * その予約が対象デモ機を押さえているか、の絞り込み条件。
 * 主デモ機（Reservation.demoUnitId）either アクティブな子デモ機（ReservationUnit）。
 */
function occupiesUnit(unitId: string): Prisma.ReservationWhereInput {
  return {
    OR: [
      { demoUnitId: unitId },
      { childUnits: { some: { demoUnitId: unitId, status: RU_STATUS.ACTIVE } } },
    ],
  };
}

/**
 * 期間 [aStart, aEnd] と [bStart, bEnd] が（日単位で）重なるか。
 * 端点を含む: aStart <= bEnd かつ bStart <= aEnd。
 */
export function periodsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

function normalize(value: string | Date): Date {
  return startOfDay(typeof value === "string" ? new Date(value) : value);
}

export type ConflictInfo = {
  reservations: {
    id: string;
    customerCompany: string;
    startDate: Date;
    endDate: Date;
    status: string;
  }[];
  maintenance: {
    id: string;
    type: string;
    startDate: Date;
    endDate: Date | null;
    description: string;
  }[];
};

/** 指定期間にその機器を使えなくしている予約・点検を返す。 */
export async function getConflicts(
  unitId: string,
  start: string | Date,
  end: string | Date,
  excludeReservationId?: string,
): Promise<ConflictInfo> {
  const s = normalize(start);
  const e = normalize(end);

  const reservations = await prisma.reservation.findMany({
    where: {
      ...occupiesUnit(unitId),
      status: { in: ACTIVE_RESV_STATUSES },
      startDate: { lte: e },
      endDate: { gte: s },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: {
      id: true,
      customerCompany: true,
      startDate: true,
      endDate: true,
      status: true,
    },
    orderBy: { startDate: "asc" },
  });

  const maintenance = await prisma.maintenanceRecord.findMany({
    where: {
      demoUnitId: unitId,
      startDate: { lte: e },
      OR: [{ endDate: null }, { endDate: { gte: s } }],
    },
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      description: true,
    },
    orderBy: { startDate: "asc" },
  });

  return { reservations, maintenance };
}

/** 指定機器が指定期間に貸出可能か。 */
export async function isUnitAvailable(
  unitId: string,
  start: string | Date,
  end: string | Date,
  excludeReservationId?: string,
): Promise<boolean> {
  const unit = await prisma.demoUnit.findUnique({
    where: { id: unitId },
    select: { status: true },
  });
  if (!unit || unit.status === UNIT_STATUS.RETIRED) return false;

  const { reservations, maintenance } = await getConflicts(
    unitId,
    start,
    end,
    excludeReservationId,
  );
  return reservations.length === 0 && maintenance.length === 0;
}

export type AvailableUnit = Awaited<
  ReturnType<typeof findAvailableUnits>
>[number];

/** 期間内に競合の無いデモ機一覧（カテゴリ・拠点で絞り込み可）。 */
export async function findAvailableUnits(opts: {
  start: string | Date;
  end: string | Date;
  categoryId?: string;
  locationId?: string;
  excludeReservationId?: string;
}) {
  const s = normalize(opts.start);
  const e = normalize(opts.end);

  const units = await prisma.demoUnit.findMany({
    where: {
      status: { not: UNIT_STATUS.RETIRED },
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.locationId ? { homeLocationId: opts.locationId } : {}),
    },
    include: { category: true, homeLocation: true },
    orderBy: { assetNo: "asc" },
  });

  const results: typeof units = [];
  for (const unit of units) {
    const { reservations, maintenance } = await getConflicts(
      unit.id,
      s,
      e,
      opts.excludeReservationId,
    );
    if (reservations.length === 0 && maintenance.length === 0) {
      results.push(unit);
    }
  }
  return results;
}

/**
 * 予約が現在押さえているデモ機の id 一覧（主 + アクティブな子）。
 * 出庫 / 返却 / 期間変更 / キャンセルの後に、この全 id で recomputeUnitStatus する。
 */
export async function activeUnitIdsOf(reservationId: string): Promise<string[]> {
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      demoUnitId: true,
      childUnits: {
        where: { status: RU_STATUS.ACTIVE },
        select: { demoUnitId: true },
      },
    },
  });
  if (!r) return [];
  return [r.demoUnitId, ...r.childUnits.map((c) => c.demoUnitId)];
}

/**
 * 当日基準でデモ機の status を再計算して保存する。
 * 予約作成 / 出庫 / 返却 / 点検登録の後に呼ぶ。
 */
export async function recomputeUnitStatus(unitId: string): Promise<string> {
  const unit = await prisma.demoUnit.findUnique({
    where: { id: unitId },
    select: { status: true },
  });
  if (!unit) return UNIT_STATUS.AVAILABLE;
  if (unit.status === UNIT_STATUS.RETIRED) return UNIT_STATUS.RETIRED;

  const now = startOfDay(new Date());

  const ongoingMaint = await prisma.maintenanceRecord.findFirst({
    where: {
      demoUnitId: unitId,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    select: { id: true },
  });

  let next: string;
  if (ongoingMaint) {
    next = UNIT_STATUS.MAINTENANCE;
  } else {
    const loanedNow = await prisma.reservation.findFirst({
      where: {
        ...occupiesUnit(unitId),
        status: RESV_STATUS.PICKED_UP,
      },
      select: { id: true },
    });
    if (loanedNow) {
      next = UNIT_STATUS.LOANED;
    } else {
      const upcoming = await prisma.reservation.findFirst({
        where: {
          ...occupiesUnit(unitId),
          status: RESV_STATUS.CONFIRMED,
          endDate: { gte: now },
        },
        select: { id: true },
      });
      next = upcoming ? UNIT_STATUS.RESERVED : UNIT_STATUS.AVAILABLE;
    }
  }

  if (next !== unit.status) {
    await prisma.demoUnit.update({
      where: { id: unitId },
      data: { status: next },
    });
  }
  return next;
}
