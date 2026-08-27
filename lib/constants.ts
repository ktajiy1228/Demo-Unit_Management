// アプリ全体で使う区分値とその日本語ラベル。
// SQLite は enum 非対応のため文字列で保持し、ここで一元管理する。

export const ROLE = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "管理者",
  MANAGER: "拠点管理者",
  STAFF: "営業",
};

// 権限の強さ（大きいほど強い）。requireRole の比較に使う。
export const ROLE_RANK: Record<string, number> = {
  STAFF: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export const UNIT_STATUS = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  LOANED: "LOANED",
  MAINTENANCE: "MAINTENANCE",
  RETIRED: "RETIRED",
} as const;
export type UnitStatus = (typeof UNIT_STATUS)[keyof typeof UNIT_STATUS];

export const UNIT_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "空き",
  RESERVED: "予約あり",
  LOANED: "貸出中",
  MAINTENANCE: "点検・修理中",
  RETIRED: "廃棄・除却",
};

export const RESV_STATUS = {
  REQUESTED: "REQUESTED",
  CONFIRMED: "CONFIRMED",
  PICKED_UP: "PICKED_UP",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
} as const;
export type ResvStatus = (typeof RESV_STATUS)[keyof typeof RESV_STATUS];

export const RESV_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "申請中",
  CONFIRMED: "確定",
  PICKED_UP: "貸出中",
  RETURNED: "返却済み",
  CANCELLED: "キャンセル",
};

// 機器の在庫を実際に押さえている（＝ダブルブッキング判定の対象になる）予約ステータス
export const ACTIVE_RESV_STATUSES: string[] = [
  RESV_STATUS.REQUESTED,
  RESV_STATUS.CONFIRMED,
  RESV_STATUS.PICKED_UP,
];

export const MAINT_TYPE_LABEL: Record<string, string> = {
  INSPECTION: "点検",
  REPAIR: "修理",
};
