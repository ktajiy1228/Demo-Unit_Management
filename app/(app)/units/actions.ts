"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { fd, zodFieldErrors, type FormState } from "@/lib/form";
import {
  maintenanceSchema,
  unitSchema,
  type UnitInput,
} from "@/lib/validators";
import { recomputeUnitStatus } from "@/lib/availability";

function parseUnitForm(formData: FormData) {
  return unitSchema.safeParse({
    assetNo: fd(formData, "assetNo"),
    name: fd(formData, "name"),
    modelNumber: fd(formData, "modelNumber"),
    maker: fd(formData, "maker"),
    serialNumber: fd(formData, "serialNumber"),
    accessories: fd(formData, "accessories"),
    purchaseDate: fd(formData, "purchaseDate"),
    categoryId: fd(formData, "categoryId"),
    homeLocationId: fd(formData, "homeLocationId"),
    status: fd(formData, "status"),
    imageUrl: fd(formData, "imageUrl"),
    notes: fd(formData, "notes"),
  });
}

function toData(input: UnitInput) {
  return {
    assetNo: input.assetNo,
    name: input.name,
    modelNumber: input.modelNumber,
    maker: input.maker || null,
    serialNumber: input.serialNumber || null,
    accessories: input.accessories || null,
    purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
    categoryId: input.categoryId,
    homeLocationId: input.homeLocationId,
    status: input.status,
    imageUrl: input.imageUrl || null,
    notes: input.notes || null,
  };
}

export async function createUnit(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertRole("MANAGER");
  const parsed = parseUnitForm(formData);
  if (!parsed.success) {
    return { error: "入力内容を確認してください", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const dup = await prisma.demoUnit.findUnique({
    where: { assetNo: parsed.data.assetNo },
    select: { id: true },
  });
  if (dup) {
    return { error: "その管理番号は既に使われています", fieldErrors: { assetNo: "重複しています" } };
  }

  const unit = await prisma.demoUnit.create({ data: toData(parsed.data) });
  await recomputeUnitStatus(unit.id);
  revalidatePath("/units");
  redirect(`/units/${unit.id}`);
}

export async function updateUnit(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertRole("MANAGER");
  const parsed = parseUnitForm(formData);
  if (!parsed.success) {
    return { error: "入力内容を確認してください", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const dup = await prisma.demoUnit.findFirst({
    where: { assetNo: parsed.data.assetNo, NOT: { id } },
    select: { id: true },
  });
  if (dup) {
    return { error: "その管理番号は既に使われています", fieldErrors: { assetNo: "重複しています" } };
  }

  await prisma.demoUnit.update({ where: { id }, data: toData(parsed.data) });
  await recomputeUnitStatus(id);
  revalidatePath("/units");
  revalidatePath(`/units/${id}`);
  redirect(`/units/${id}`);
}

export async function addMaintenance(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await assertRole("MANAGER");
  const parsed = maintenanceSchema.safeParse({
    demoUnitId: fd(formData, "demoUnitId"),
    type: fd(formData, "type"),
    startDate: fd(formData, "startDate"),
    endDate: fd(formData, "endDate"),
    description: fd(formData, "description"),
    cost: fd(formData, "cost"),
  });
  if (!parsed.success) {
    return { error: "入力内容を確認してください", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const { demoUnitId, type, startDate, endDate, description, cost } = parsed.data;
  await prisma.maintenanceRecord.create({
    data: {
      demoUnitId,
      type,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      description,
      cost: cost ? Number(cost) : null,
      createdById: user.id,
    },
  });
  await recomputeUnitStatus(demoUnitId);
  revalidatePath(`/units/${demoUnitId}`);
  return { ok: true };
}

export async function closeMaintenance(formData: FormData): Promise<void> {
  await assertRole("MANAGER");
  const id = fd(formData, "id");
  const demoUnitId = fd(formData, "demoUnitId");
  await prisma.maintenanceRecord.update({
    where: { id },
    data: { endDate: new Date() },
  });
  await recomputeUnitStatus(demoUnitId);
  revalidatePath(`/units/${demoUnitId}`);
}
