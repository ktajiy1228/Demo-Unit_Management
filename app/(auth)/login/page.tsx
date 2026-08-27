import { redirect } from "next/navigation";
import { currentUser } from "@/lib/rbac";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "ログイン | デモ機運用管理" };

export default async function LoginPage() {
  // auth() の生セッションではなく DB 実在チェック済みのユーザーで判定する。
  // 再シード等でセッションのユーザーが消えていても /（要ログイン）との
  // 無限リダイレクトに陥らず、ログイン画面を表示する。
  const user = await currentUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-bold text-slate-900">デモ機運用管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            照明器具デモ機の貸出・返却・スケジュール
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
