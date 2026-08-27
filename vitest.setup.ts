import { resolve } from "node:path";

// Prisma Client がテスト実行時に SQLite ファイルを見つけられるようにする。
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${resolve(process.cwd(), "prisma/dev.db")}`;
}
