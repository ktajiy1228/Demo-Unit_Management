"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ROLE_LABEL } from "@/lib/constants";
import { hasRole } from "@/lib/rbac";
import { logout } from "./actions";

type NavUser = { name?: string | null; role: string; locationName: string };

const links = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard, minRole: "STAFF" as const },
  { href: "/schedule", label: "予約カレンダー", icon: CalendarRange, minRole: "STAFF" as const },
  { href: "/reservations", label: "予約一覧", icon: ClipboardList, minRole: "STAFF" as const },
  { href: "/units", label: "デモ機", icon: Lightbulb, minRole: "STAFF" as const },
  { href: "/masters", label: "マスタ管理", icon: Settings, minRole: "ADMIN" as const },
];

function NavLinks({
  user,
  onNavigate,
}: {
  user: NavUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links
        .filter((l) => hasRole(user, l.minRole))
        .map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon size={17} />
              {l.label}
            </Link>
          );
        })}
    </nav>
  );
}

function UserBox({ user }: { user: NavUser }) {
  return (
    <div className="border-t border-slate-200 pt-3 text-sm">
      <p className="font-medium text-slate-800">{user.name}</p>
      <p className="text-xs text-slate-500">
        {ROLE_LABEL[user.role] ?? user.role}・{user.locationName}
      </p>
      <form action={logout} className="mt-2">
        <button
          type="submit"
          className="text-xs text-slate-500 underline hover:text-slate-800"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}

export function Nav({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* モバイルヘッダー */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-bold text-slate-900">デモ機運用管理</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="メニューを開く"
          className="rounded-md p-1.5 hover:bg-slate-100"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* モバイルドロワー */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col gap-4 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">メニュー</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="メニューを閉じる"
                className="rounded-md p-1.5 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks user={user} onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <UserBox user={user} />
            </div>
          </div>
        </div>
      )}

      {/* デスクトップサイドバー */}
      <aside className="hidden w-60 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white p-4 md:flex">
        <span className="px-2 text-base font-bold text-slate-900">
          デモ機運用管理
        </span>
        <NavLinks user={user} />
        <div className="mt-auto">
          <UserBox user={user} />
        </div>
      </aside>
    </>
  );
}
