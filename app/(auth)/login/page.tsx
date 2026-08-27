import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "ログイン | デモ機運用管理" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

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
