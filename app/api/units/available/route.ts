import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { availabilityQuerySchema } from "@/lib/validators";
import { findAvailableUnits } from "@/lib/availability";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = availabilityQuerySchema.safeParse({
    startDate: url.searchParams.get("startDate") ?? "",
    endDate: url.searchParams.get("endDate") ?? "",
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    locationId: url.searchParams.get("locationId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  const { startDate, endDate, categoryId, locationId } = parsed.data;
  if (Date.parse(endDate) < Date.parse(startDate)) {
    return NextResponse.json({ units: [] });
  }

  const excludeReservationId =
    url.searchParams.get("excludeReservationId") ?? undefined;

  const units = await findAvailableUnits({
    start: startDate,
    end: endDate,
    categoryId: categoryId || undefined,
    locationId: locationId || undefined,
    excludeReservationId,
  });

  return NextResponse.json({
    units: units.map((u) => ({
      id: u.id,
      assetNo: u.assetNo,
      name: u.name,
      modelNumber: u.modelNumber,
      categoryName: u.category.name,
      locationId: u.homeLocationId,
      locationName: u.homeLocation.name,
    })),
  });
}
