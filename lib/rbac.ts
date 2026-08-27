import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ROLE_RANK } from "@/lib/constants";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  locationId: string;
};

/**
 * セッション（JWT）のメールアドレスを元に、DB の最新ユーザーを取得する。
 * これにより再シード等で User.id が変わっても、後続の FK（returnedById 等）が壊れない。
 * 未ログイン・該当なし・無効ユーザーは null。
 */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      locationId: true,
      active: true,
    },
  });
  if (!user || !user.active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    locationId: user.locationId,
  };
}

/** ログイン必須。未ログイン／無効ユーザーは /login へ。 */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** 指定ロール以上を要求。満たさなければトップへ。 */
export async function requireRole(
  min: "STAFF" | "MANAGER" | "ADMIN",
): Promise<SessionUser> {
  const user = await requireUser();
  if ((ROLE_RANK[user.role] ?? 0) < ROLE_RANK[min]) redirect("/");
  return user;
}

/** UI 表示制御などに使う真偽判定（リダイレクトしない）。 */
export function hasRole(
  user: { role: string } | null | undefined,
  min: "STAFF" | "MANAGER" | "ADMIN",
): boolean {
  if (!user) return false;
  return (ROLE_RANK[user.role] ?? 0) >= ROLE_RANK[min];
}

/** Server Action 内でのガード。違反時は例外を投げる。 */
export async function assertRole(
  min: "STAFF" | "MANAGER" | "ADMIN",
): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("ログインが必要です。再度ログインしてください。");
  if ((ROLE_RANK[user.role] ?? 0) < ROLE_RANK[min]) {
    throw new Error("この操作の権限がありません");
  }
  return user;
}
