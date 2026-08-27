import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_RANK } from "@/lib/constants";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  locationId: string;
};

/** ログイン必須。未ログインなら /login へ。 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
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
  const session = await auth();
  if (!session?.user) throw new Error("ログインが必要です");
  const user = session.user as SessionUser;
  if ((ROLE_RANK[user.role] ?? 0) < ROLE_RANK[min]) {
    throw new Error("この操作の権限がありません");
  }
  return user;
}
