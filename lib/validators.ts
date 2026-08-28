import { z } from "zod";
import { MAX_CHILD_UNITS, RESV_STATUS, ROLE, UNIT_STATUS } from "@/lib/constants";

const dateString = z
  .string()
  .min(1, "日付を入力してください")
  .refine((v) => !Number.isNaN(Date.parse(v)), "日付の形式が不正です");

export const unitSchema = z.object({
  assetNo: z.string().trim().min(1, "管理番号は必須です").max(50),
  name: z.string().trim().min(1, "名称は必須です").max(120),
  modelNumber: z.string().trim().min(1, "型番は必須です").max(120),
  maker: z.string().trim().max(120).optional().or(z.literal("")),
  serialNumber: z.string().trim().max(120).optional().or(z.literal("")),
  accessories: z.string().trim().max(2000).optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  categoryId: z.string().min(1, "カテゴリを選択してください"),
  homeLocationId: z.string().min(1, "配置拠点を選択してください"),
  status: z.enum([
    UNIT_STATUS.AVAILABLE,
    UNIT_STATUS.RESERVED,
    UNIT_STATUS.LOANED,
    UNIT_STATUS.MAINTENANCE,
    UNIT_STATUS.RETIRED,
  ]),
  imageUrl: z.string().trim().url("URL の形式が不正です").optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type UnitInput = z.infer<typeof unitSchema>;

const reservationFields = z.object({
  primaryDemoUnitId: z.string().min(1, "主デモ機を選択してください"),
  childDemoUnitIds: z
    .array(z.string().min(1))
    .max(MAX_CHILD_UNITS, `子デモ機は${MAX_CHILD_UNITS}台までです`)
    .default([]),
  requestedById: z.string().min(1, "担当営業を選択してください"),
  customerCompany: z.string().trim().min(1, "顧客会社名は必須です").max(160),
  customerName: z.string().trim().max(120).optional().or(z.literal("")),
  shipToName: z.string().trim().max(160).optional().or(z.literal("")),
  shipToContact: z.string().trim().max(120).optional().or(z.literal("")),
  shipToPhone: z.string().trim().max(40).optional().or(z.literal("")),
  shipToPostal: z.string().trim().max(16).optional().or(z.literal("")),
  shipToAddress: z.string().trim().max(300).optional().or(z.literal("")),
  startDate: dateString,
  endDate: dateString,
  plannedShipDate: z.string().optional().or(z.literal("")),
  pickupLocationId: z.string().min(1, "発送拠点を選択してください"),
  returnLocationId: z.string().min(1, "返却拠点を選択してください"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const endAfterStart = (v: { startDate: string; endDate: string }) =>
  Date.parse(v.endDate) >= Date.parse(v.startDate);
const endAfterStartMsg = {
  message: "返却日は貸出日以降にしてください",
  path: ["endDate"],
};

export const reservationSchema = reservationFields
  .refine(endAfterStart, endAfterStartMsg)
  .refine((v) => !v.childDemoUnitIds.includes(v.primaryDemoUnitId), {
    message: "主デモ機は子デモ機に選べません",
    path: ["childDemoUnitIds"],
  })
  .refine(
    (v) => new Set(v.childDemoUnitIds).size === v.childDemoUnitIds.length,
    { message: "子デモ機が重複しています", path: ["childDemoUnitIds"] },
  );
export type ReservationInput = z.infer<typeof reservationSchema>;

// 予約編集ではデモ機（主・子）の構成は変更させない。
export const reservationEditSchema = reservationFields
  .omit({ primaryDemoUnitId: true, childDemoUnitIds: true })
  .refine(endAfterStart, endAfterStartMsg);
export type ReservationEditInput = z.infer<typeof reservationEditSchema>;

export const availabilityQuerySchema = z.object({
  startDate: dateString,
  endDate: dateString,
  categoryId: z.string().optional(),
  locationId: z.string().optional(),
});

export const lifecycleNoteSchema = z.object({
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

const checkbox = z.union([z.literal("on"), z.literal("")]).optional();

// 出庫（チェックアウト）: 送り状No. と出荷前チェック
export const checkoutSchema = z.object({
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  carrier: z.string().trim().max(80).optional().or(z.literal("")),
  shippingTrackingNo: z.string().trim().max(80).optional().or(z.literal("")),
  shipDate: z.string().optional().or(z.literal("")),
  desiredArrivalDate: z.string().optional().or(z.literal("")),
  desiredArrivalTime: z.string().trim().max(40).optional().or(z.literal("")),
  partsChecked: checkbox,
  maintenanceChecked: checkbox,
  inverterChecked: checkbox,
});

export const maintenanceSchema = z
  .object({
    demoUnitId: z.string().min(1),
    type: z.enum(["INSPECTION", "REPAIR"]),
    startDate: dateString,
    endDate: z.string().optional().or(z.literal("")),
    description: z.string().trim().min(1, "内容は必須です").max(2000),
    cost: z.string().optional().or(z.literal("")),
  })
  .refine(
    (v) => !v.endDate || Date.parse(v.endDate) >= Date.parse(v.startDate),
    { message: "終了日は開始日以降にしてください", path: ["endDate"] },
  );

export const locationSchema = z.object({
  name: z.string().trim().min(1, "拠点名は必須です").max(120),
  code: z.string().trim().min(1, "拠点コードは必須です").max(30),
  address: z.string().trim().max(240).optional().or(z.literal("")),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "カテゴリ名は必須です").max(80),
});

export const userSchema = z.object({
  name: z.string().trim().min(1, "氏名は必須です").max(120),
  email: z.string().trim().email("メールアドレスの形式が不正です"),
  role: z.enum([ROLE.ADMIN, ROLE.MANAGER, ROLE.STAFF]),
  locationId: z.string().min(1, "所属拠点を選択してください"),
  password: z.string().min(6, "パスワードは6文字以上").optional().or(z.literal("")),
  active: z.union([z.literal("on"), z.literal("")]).optional(),
});
