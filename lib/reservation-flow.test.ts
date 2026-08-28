import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  activeUnitIdsOf,
  isUnitAvailable,
  recomputeUnitStatus,
} from "@/lib/availability";

/**
 * 予約ライフサイクルの結合テスト:
 *   予約作成 → 重複拒否 → 出庫(LOANED) → 返却(AVAILABLE)
 *   + 複数デモ機（主／子）予約・子の個別キャンセル
 * 実際の DB にテスト用レコードを作成し、最後に削除する。
 */
describe("予約フロー (DB)", () => {
  const tag = `flow-${Date.now()}`;
  let locId = "";
  let catId = "";
  let userId = "";
  let unitId = "";
  let childId = "";
  const resvIds: string[] = [];

  const d = (offset: number) => {
    const x = new Date();
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() + offset);
    return x;
  };

  beforeAll(async () => {
    const loc = await prisma.location.create({
      data: { code: `${tag}-L`, name: `${tag} 拠点` },
    });
    const cat = await prisma.category.create({ data: { name: `${tag} cat` } });
    const user = await prisma.user.create({
      data: {
        name: `${tag} u`,
        email: `${tag}@example.com`,
        passwordHash: "x",
        role: "STAFF",
        locationId: loc.id,
      },
    });
    const unit = await prisma.demoUnit.create({
      data: {
        assetNo: `${tag}-U`,
        name: `${tag} unit`,
        modelNumber: "T",
        categoryId: cat.id,
        homeLocationId: loc.id,
        status: "AVAILABLE",
      },
    });
    const child = await prisma.demoUnit.create({
      data: {
        assetNo: `${tag}-C`,
        name: `${tag} child unit`,
        modelNumber: "T",
        categoryId: cat.id,
        homeLocationId: loc.id,
        status: "AVAILABLE",
      },
    });
    locId = loc.id;
    catId = cat.id;
    userId = user.id;
    unitId = unit.id;
    childId = child.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { id: { in: resvIds } } });
    await prisma.demoUnit.deleteMany({ where: { id: { in: [unitId, childId] } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.category.deleteMany({ where: { id: catId } });
    await prisma.location.deleteMany({ where: { id: locId } });
    await prisma.$disconnect();
  });

  it("予約を作成すると status が RESERVED になる", async () => {
    const r = await prisma.reservation.create({
      data: {
        demoUnitId: unitId,
        requestedById: userId,
        customerCompany: "A社",
        startDate: d(1),
        endDate: d(5),
        pickupLocationId: locId,
        returnLocationId: locId,
        status: "CONFIRMED",
      },
    });
    resvIds.push(r.id);
    const status = await recomputeUnitStatus(unitId);
    expect(status).toBe("RESERVED");
  });

  it("重複する期間は貸出不可、重ならない期間は貸出可", async () => {
    expect(await isUnitAvailable(unitId, d(3), d(8))).toBe(false);
    expect(await isUnitAvailable(unitId, d(6), d(9))).toBe(true);
  });

  it("出庫すると LOANED、返却すると AVAILABLE に戻る", async () => {
    const r = resvIds[0];
    await prisma.reservation.update({
      where: { id: r },
      data: { status: "PICKED_UP", pickedUpAt: new Date(), pickedUpById: userId },
    });
    expect(await recomputeUnitStatus(unitId)).toBe("LOANED");

    await prisma.reservation.update({
      where: { id: r },
      data: { status: "RETURNED", returnedAt: new Date(), returnedById: userId },
    });
    expect(await recomputeUnitStatus(unitId)).toBe("AVAILABLE");
  });

  it("キャンセルした予約は重複判定の対象外", async () => {
    const r = await prisma.reservation.create({
      data: {
        demoUnitId: unitId,
        requestedById: userId,
        customerCompany: "B社",
        startDate: d(20),
        endDate: d(25),
        pickupLocationId: locId,
        returnLocationId: locId,
        status: "CANCELLED",
      },
    });
    resvIds.push(r.id);
    expect(await isUnitAvailable(unitId, d(21), d(24))).toBe(true);
  });

  it("複数デモ機の予約: 主・子ともに押さえられ、子として重複判定される", async () => {
    const r = await prisma.reservation.create({
      data: {
        demoUnitId: unitId,
        requestedById: userId,
        customerCompany: "複数社",
        startDate: d(40),
        endDate: d(45),
        pickupLocationId: locId,
        returnLocationId: locId,
        status: "CONFIRMED",
        childUnits: { create: [{ demoUnitId: childId }] },
      },
    });
    resvIds.push(r.id);

    // activeUnitIdsOf は主＋アクティブな子を返す
    const ids = await activeUnitIdsOf(r.id);
    expect(ids.sort()).toEqual([unitId, childId].sort());

    // 子デモ機は「子として」重複判定される
    expect(await isUnitAvailable(childId, d(41), d(44))).toBe(false);
    expect(await recomputeUnitStatus(childId)).toBe("RESERVED");

    // 出庫すると主・子ともに LOANED
    await prisma.reservation.update({
      where: { id: r.id },
      data: { status: "PICKED_UP", pickedUpAt: new Date(), pickedUpById: userId },
    });
    expect(await recomputeUnitStatus(unitId)).toBe("LOANED");
    expect(await recomputeUnitStatus(childId)).toBe("LOANED");

    // 元に戻す
    await prisma.reservation.update({
      where: { id: r.id },
      data: { status: "CONFIRMED", pickedUpAt: null, pickedUpById: null },
    });
  });

  it("子デモ機を個別キャンセルすると、その子は解放され案件は継続", async () => {
    const r = await prisma.reservation.create({
      data: {
        demoUnitId: unitId,
        requestedById: userId,
        customerCompany: "子キャンセル社",
        startDate: d(60),
        endDate: d(65),
        pickupLocationId: locId,
        returnLocationId: locId,
        status: "CONFIRMED",
        childUnits: { create: [{ demoUnitId: childId }] },
      },
    });
    resvIds.push(r.id);
    expect(await isUnitAvailable(childId, d(61), d(64))).toBe(false);

    // 子を CANCELLED に
    await prisma.reservationUnit.updateMany({
      where: { reservationId: r.id, demoUnitId: childId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    // 子は解放、activeUnitIdsOf から外れる、案件は CONFIRMED のまま
    expect(await isUnitAvailable(childId, d(61), d(64))).toBe(true);
    expect(await activeUnitIdsOf(r.id)).toEqual([unitId]);
    const still = await prisma.reservation.findUnique({ where: { id: r.id } });
    expect(still?.status).toBe("CONFIRMED");
  });
});
