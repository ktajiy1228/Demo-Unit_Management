import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// テスト実行時の DATABASE_URL を決める。
// 1) すでに環境変数があればそれを使う（CI など）
// 2) なければ .env.local → .env の順に読む（`vercel env pull` で取得した Postgres URL）
// 3) それも無ければ SQLite プロトタイプ DB にフォールバック
function loadEnvFile(name: string): void {
  try {
    const text = readFileSync(resolve(process.cwd(), name), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // ファイルが無い場合は無視
  }
}

if (!process.env.DATABASE_URL) {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${resolve(process.cwd(), "prisma/dev.db")}`;
}
