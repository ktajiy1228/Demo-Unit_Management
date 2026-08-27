import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "デモ機運用管理",
  description: "照明器具デモ機の貸出・返却・スケジュール管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
