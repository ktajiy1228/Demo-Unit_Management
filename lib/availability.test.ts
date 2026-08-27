import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  getConflicts,
  isUnitAvailable,
  periodsOverlap,
} from "@/lib/availability";

describe("periodsOverlap", () => {
  const d = (s: string) => new Date(s);

  it("重なる期間を true と判定する", () => {
    expect(
      periodsOverlap(d("2026-01-10"), d("2026-01-20"), d("2026-01-15"), d("2026-01-25")),
    ).toBe(true);
  });

  it("端点が接する場合も重なりとみなす", () => {
    expect(
      periodsOverlap(d("2026-01-10"), d("2026-01-20"), d("2026-01-20"), d("2026-01-25")),
    ).toBe(true);
  });

  it("完全に離れた期間は false", () => {
    expect(
      periodsOverlap(d("2026-01-10"), d("2026-01-20"), d("2026-01-21"), d("2026-01-25")),
    ).toBe(false);
  });

  it("一方が他方を内包する場合は true", () => {
    expect(
      periodsOverlap(d("2026-01-01"), d("2026-01-31"), d("2026-01-10"), d("2026-01-12")),
    ).toBe(true);
  });
});

describe("isUnitAvailable / getConflicts (DB)", () => {
  const tag = `test-${Date.now()}`;
  const ids: { unit?: string; user?: string; loc?: string; cat?: string; resv?: string } =
    {};

  afterAll(async () => {
    if (ids.resv) await prisma.reservation.deleteMany({ where: { id: ids.resv } });
    if (ids.unit) await prisma.demoUnit.deleteMany({ where: { id: ids.unit } });
    if (ids.user) await prisma.user.deleteMany({ where: { id: ids.user } });
    if (ids.cat) await prisma.category.deleteMany({ where: { id: ids.cat } });
    if (ids.loc) await prisma.location.deleteMany({ where: { id: ids.loc } });
    await prisma.$disconnect();
  });

  it("既存予約と重なる期間は貸出不可、重ならない期間は貸出可", async () => {
    const loc = await prisma.location.create({
      data: { code: `${tag}-L`, name: `${tag} 拠点` },
    });
    const cat = await prisma.category.create({ data: { name: `${tag} カテゴリ` } });
    const user = await prisma.user.create({
      data: {
        name: `${tag} user`,
        email: `${tag}@example.com`,
        passwordHash: "x",
        role: "STAFF",
        locationId: loc.id,
      },
    });
    const unit = await prisma.demoUnit.create({
      data: {
        assetNo: `${tag}-U`,
        name: `${tag} 機器`,
        modelNumber: "TEST",
        categoryId: cat.id,
        homeLocationId: loc.id,
        status: "AVAILABLE",
      },
    });
    ids.loc = loc.id;
    ids.cat = cat.id;
    ids.user = user.id;
    ids.unit = unit.id;

    const resv = await prisma.reservation.create({
      data: {
        demoUnitId: unit.id,
        requestedById: user.id,
        customerCompany: "テスト商事",
        projectName: "重複テスト",
        startDate: new Date("2026-03-10"),
        endDate: new Date("2026-03-20"),
        pickupLocationId: loc.id,
        returnLocationId: loc.id,
        status: "CONFIRMED",
      },
    });
    ids.resv = resv.id;

    // 重なる
    expect(await isUnitAvailable(unit.id, "2026-03-15", "2026-03-25")).toBe(false);
    const conflicts = await getConflicts(unit.id, "2026-03-15", "2026-03-25");
    expect(conflicts.reservations).toHaveLength(1);

    // 重ならない（前）
    expect(await isUnitAvailable(unit.id, "2026-03-01", "2026-03-05")).toBe(true);
    // 重ならない（後）
    expect(await isUnitAvailable(unit.id, "2026-03-21", "2026-03-30")).toBe(true);

    // 自分自身を除外すれば貸出可
    expect(
      await isUnitAvailable(unit.id, "2026-03-15", "2026-03-25", resv.id),
    ).toBe(true);
  });
});
