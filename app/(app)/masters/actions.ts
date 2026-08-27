"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { fd, zodFieldErrors, type FormState } from "@/lib/form";
import { categorySchema, locationSchema, userSchema } from "@/lib/validators";

export async function createLocation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertRole("ADMIN");
  const parsed = locationSchema.safeParse({
    name: fd(formData, "name"),
    code: fd(formData, "code"),
    address: fd(formData, "address"),
  });
  if (!parsed.success) {
    return { error: "入力を確認してください", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const dup = await prisma.location.findUnique({
    where: { code: parsed.data.code },
    select: { id: true },
  });
  if (dup) return { error: "その拠点コードは既に存在します" };

  await prisma.location.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      address: parsed.data.address || null,
    },
  });
  revalidatePath("/masters");
  return { ok: true };
}

export async function createCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertRole("ADMIN");
  const parsed = categorySchema.safeParse({ name: fd(formData, "name") });
  if (!parsed.success) {
    return { error: "入力を確認してください", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const dup = await prisma.category.findUnique({
    where: { name: parsed.data.name },
    select: { id: true },
  });
  if (dup) return { error: "同名のカテゴリが既にあります" };

  await prisma.category.create({ data: { name: parsed.data.name } });
  revalidatePath("/masters");
  return { ok: true };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await assertRole("ADMIN");
  const id = fd(formData, "id");
  const count = await prisma.demoUnit.count({ where: { categoryId: id } });
  if (count > 0) throw new Error("このカテゴリを使うデモ機があるため削除できません");
  await prisma.category.delete({ where: { id } });
  revalidatePath("/masters");
}

export async function createUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertRole("ADMIN");
  const parsed = userSchema.safeParse({
    name: fd(formData, "name"),
    email: fd(formData, "email"),
    role: fd(formData, "role"),
    locationId: fd(formData, "locationId"),
    password: fd(formData, "password"),
  });
  if (!parsed.success) {
    return { error: "入力を確認してください", fieldErrors: zodFieldErrors(parsed.error) };
  }
  if (!parsed.data.password) {
    return { error: "初期パスワードを入力してください", fieldErrors: { password: "必須です" } };
  }
  const dup = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (dup) return { error: "そのメールアドレスは既に登録されています" };

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      locationId: parsed.data.locationId,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      active: true,
    },
  });
  revalidatePath("/masters");
  return { ok: true };
}

export async function updateUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await assertRole("ADMIN");
  const id = fd(formData, "id");

  const parsed = userSchema.safeParse({
    name: fd(formData, "name"),
    email: fd(formData, "email"),
    role: fd(formData, "role"),
    locationId: fd(formData, "locationId"),
    password: fd(formData, "password"),
  });
  if (!parsed.success) {
    return { error: "入力を確認してください", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current) return { error: "ユーザーが見つかりません" };

  if (id === me.id && parsed.data.role !== "ADMIN") {
    return { error: "自分自身の権限は変更できません" };
  }

  const dup = await prisma.user.findFirst({
    where: { email: parsed.data.email, NOT: { id } },
    select: { id: true },
  });
  if (dup) return { error: "そのメールアドレスは既に登録されています" };

  await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      locationId: parsed.data.locationId,
      ...(parsed.data.password
        ? { passwordHash: await bcrypt.hash(parsed.data.password, 10) }
        : {}),
    },
  });
  revalidatePath("/masters");
  return { ok: true };
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  await assertRole("ADMIN");
  const id = fd(formData, "id");
  const u = await prisma.user.findUnique({ where: { id }, select: { active: true } });
  if (!u) return;
  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  revalidatePath("/masters");
}

export async function deleteUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await assertRole("ADMIN");
  const id = fd(formData, "id");
  if (id === me.id) {
    return { error: "自分自身のアカウントは削除できません" };
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return { error: "ユーザーが見つかりません" };

  // 予約・点検記録から参照されているユーザーは削除不可（履歴が壊れるため）
  const [resvCount, maintCount] = await Promise.all([
    prisma.reservation.count({
      where: {
        OR: [
          { requestedById: id },
          { pickedUpById: id },
          { returnedById: id },
        ],
      },
    }),
    prisma.maintenanceRecord.count({ where: { createdById: id } }),
  ]);
  if (resvCount + maintCount > 0) {
    return {
      error: `予約 ${resvCount} 件・点検記録 ${maintCount} 件に紐づくため削除できません。「無効化」を使ってください。`,
    };
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/masters");
  return { ok: true };
}
