import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "password";

/** 今日からの相対日（0:00）。 */
function day(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

// 実データ: 要求元の「デモ機マスタ.csv」より（[備品ID, 備品名, カテゴリー]）
const UNIT_ROWS: [string, string, string][] = [
  ["TSG60W-02", "TGS018-60W(Ra90)2", "TGS018-60W デモ機"],
  ["TSG60W-03", "TGS018-60W(Ra90)3", "TGS018-60W デモ機"],
  ["TSG60W-04", "TGS018-60W(Ra90)4", "TGS018-60W デモ機"],
  ["TSG60W-05", "TGS018-60W(Ra90)5", "TGS018-60W デモ機"],
  ["TSG60W-07", "TGS018-60W(Ra90)7", "TGS018-60W デモ機"],
  ["TSG60W-08", "TGS018-60W(Ra90)8", "TGS018-60W デモ機"],
  ["TSG60W-09", "TGS018-60W(Ra90)9", "TGS018-60W デモ機"],
  ["TSG60W-10", "TGS018-60W(Ra90)10", "TGS018-60W デモ機"],
  ["TSG60W-11", "TGS018-60W(Ra90)11", "TGS018-60W デモ機"],
  ["TSG60W-12", "TGS018-60W12　※緊急対応用", "TGS018-60W デモ機"],
  ["TSG60W-13", "TGS018-60W(2700K)", "TGS018-60W デモ機"],
  ["TSG60WS-01", "アームスタンド60Ｗ(Ra90)①", "TGS018-60W デモ機"],
  ["TSG60WS-02", "アームスタンド60Ｗ(Ra90)②", "TGS018-60W デモ機"],
  ["TSG60WS-03", "アームスタンド60Ｗ(Ra90)③", "TGS018-60W デモ機"],
  ["TSG60WS-04", "アームスタンド60Ｗ(Ra90)④　※強化型", "TGS018-60W デモ機"],
  ["TSG60WS-05", "アームスタンド60Ｗ(Ra90)⑤　※強化型", "TGS018-60W デモ機"],
  ["TSG60WS-06", "アームスタンド60Ｗ(Ra90)⑥　※強化型", "TGS018-60W デモ機"],
  ["TSG60WS-07", "アームスタンド60Ｗ(Ra90)⑦　※強化型", "TGS018-60W デモ機"],
  ["TSG60WS-08", "アームスタンド60Ｗ(Ra90)⑧　※強化型", "TGS018-60W デモ機"],
  ["TSG60WS-09", "アームスタンド60Ｗ(Ra90)⑨", "TGS018-60W デモ機"],
  ["TSG60WS-10", "アームスタンド60Ｗ(Ra90)⑩", "TGS018-60W デモ機"],
  ["TSG60WS-91", "【緊急用】旧アームスタンド60W1", "TGS018-60W デモ機"],
  ["TSG60WS-92", "【緊急用】旧アームスタンド60W2", "TGS018-60W デモ機"],
  ["TSG60WS-93", "【緊急用】旧アームスタンド60W3", "TGS018-60W デモ機"],
  ["TSG100W-01", "TGS018-100W　①", "TGS018-100Wデモ機"],
  ["TSG100W-02", "TGS018-100W　②", "TGS018-100Wデモ機"],
  ["TSG100W-03", "TGS018-100Ｗ　③", "TGS018-100Wデモ機"],
  ["TSG100W-04", "TGS018-100W　④", "TGS018-100Wデモ機"],
  ["TSG100W-05", "TGS018-100W　⑤ ※不点灯", "TGS018-100Wデモ機"],
  ["TSG100W-06", "TGS018-100W　⑥", "TGS018-100Wデモ機"],
  ["TSG100W-07", "TGS018-100W　⑦", "TGS018-100Wデモ機"],
  ["TSG100W-08", "TGS018-100Ｗ", "TGS018-100Wデモ機"],
  ["TSG100WS-01", "TGS018-100Wアーム用ステイ1", "TGS018-100Wデモ機"],
  ["TSG100WS-02", "TGS018-100Wアーム用ステイ2", "TGS018-100Wデモ機"],
  ["TSG100WS-03", "TGS018-100Wアーム用ステイ3　※穴位置注意", "TGS018-100Wデモ機"],
  ["NK40S-01", "【9/8～乳白レンズ仕様】NK40（黒）+アーム（黒）　①", "NK40 デモ機"],
  ["NK40S-02", "NK40（グレー）+アーム（白）　②", "NK40 デモ機"],
  ["NK40S-03", "NK40（グレー）+アーム（白）　③", "NK40 デモ機"],
  ["NK40S-04", "NK40（グレー）+アーム（白）　④", "NK40 デモ機"],
  ["NK40S-05", "NK40（グレー）+アーム（白）　⑤", "NK40 デモ機"],
  ["NK40S-06", "NK40（グレー）+アーム（白）　⑥", "NK40 デモ機"],
  ["NK40S-07", "NK40（グレー）+アーム（黒）　⑦", "NK40 デモ機"],
  ["NK40S-08", "NK40（グレー）+アーム（黒）　⑧", "NK40 デモ機"],
  ["NK40S-09", "NK40（グレー）+アーム（黒）　⑨", "NK40 デモ機"],
  ["NK40S-10", "NK40（グレー）+アーム（黒）　⑩", "NK40 デモ機"],
  ["NK40S-11", "【9/14～乳白レンズ仕様】NK40（黒）+アーム（黒）　⑪", "NK40 デモ機"],
  ["NK40S-12", "【9/8～乳白レンズ仕様】NK40（黒）+アーム（黒）　⑫", "NK40 デモ機"],
  ["NK150-01", "NK150デモ機① (259D218)", "NK150・200 デモ機"],
  ["NK150-02", "NK150デモ機② (215D198)", "NK150・200 デモ機"],
  ["NK150-03", "NK150デモ機③ (2411D391)", "NK150・200 デモ機"],
  ["NK150-04", "NK150デモ機④ (2411D392)", "NK150・200 デモ機"],
  ["NK150-05", "NK150デモ機⑤ (257D473)", "NK150・200 デモ機"],
  ["NK200-01", "NK200デモ機①(224E101)", "NK150・200 デモ機"],
  ["NK200-02", "NK200デモ機② (224E105)", "NK150・200 デモ機"],
  ["NK228-150-01", "NK228-150", "NK228 デモ機"],
  ["NK228-200-01", "NK228-200(229G071)", "NK228 デモ機"],
  ["NK228-200-02", "NK228-200(229G066)", "NK228 デモ機"],
  ["CS-01", "キャスタースタンド①(安定器置有)", "照明備品"],
  ["CS-02", "キャスタースタンド②(安定器置無)", "照明備品"],
  ["CS-03", "キャスタースタンド③(安定器置無)", "照明備品"],
  ["CS-04", "キャスタースタンド④(安定器置無)", "照明備品"],
  ["FS-01", "フレームスタンド", "照明備品"],
  ["TS-01", "三脚①", "照明備品"],
  ["TS-02", "三脚②", "照明備品"],
  ["PT-01", "変圧器", "照明備品"],
  ["LEX3130BK-01", "カネカ有機EL① LEX-3130BK", "有機EL デモ機"],
  [
    "LEX3130BK-02",
    "カネカ有機EL② LEX-3130BK　4000K（無期限/無償貸出）※不点灯使用不可",
    "有機EL デモ機",
  ],
  ["LEX3130BK-03", "カネカ有機EL③ LEX-3130BK　4000K（無期限/無償貸出）", "有機EL デモ機"],
  ["LEX3130BK-04", "カネカ有機EL④ LEX-3130BK　4000K（無期限/無償貸出）", "有機EL デモ機"],
  ["LEX3132-01", "カネカ有機EL　LEX3132①　3000K", "有機EL デモ機"],
  ["LEX3132-02", "カネカ有機EL　LEX3132②　3000K", "有機EL デモ機"],
  ["IB-01", "カネカ有機EL用組み立て式検査ブース（黒プラダン）", "有機EL デモ機"],
  ["OLED-01", "カネカ有機EL OLEDベースライト(4000K)", "有機EL デモ機"],
  ["OLEDHL-01", "有機ELハンディライト①", "有機EL デモ機"],
  ["OLEDHL-02", "有機ELハンディライト②", "有機EL デモ機"],
  ["OLEDHL-03", "有機ELハンディライト③", "有機EL デモ機"],
  ["LEDATL120-01", "LED ATL-120", "LED デモ機"],
  ["LEDATL180-01", "LED ATL-180", "LED デモ機"],
  ["LEDATL240-01", "LED ATL-240", "LED デモ機"],
  ["LEDMKOS120-01", "LED MKO-S-120①", "LED デモ機"],
  ["LEDMKOS180-01", "LED MKO-S-180", "LED デモ機"],
  ["LEDBLWPL822-01", "LEDベースライトWPL822", "LED デモ機"],
];

// カテゴリーごとの配置拠点（本社 / 尼崎倉庫）
const CATEGORY_HOME: Record<string, "HON" | "AMA"> = {
  "NK40 デモ機": "HON",
  "TGS018-60W デモ機": "HON",
  照明備品: "HON",
  "TGS018-100Wデモ機": "AMA",
  "NK150・200 デモ機": "AMA",
  "NK228 デモ機": "AMA",
  "有機EL デモ機": "AMA",
  "LED デモ機": "AMA",
};

/** 備品IDから末尾の連番を除いた型式（例 TSG60W-02 → TSG60W、NK228-200-02 → NK228-200）。 */
function modelOf(assetNo: string): string {
  return assetNo.replace(/-\d+$/, "");
}

/** 備品名の「※」以降を備考として抜き出す。 */
function noteOf(name: string): string | null {
  const i = name.indexOf("※");
  return i >= 0 ? name.slice(i) : null;
}

async function main() {
  // 既存データを削除（依存関係の逆順）
  await prisma.maintenanceRecord.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.demoUnit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();

  // 拠点
  const [honsha, amagasaki] = await Promise.all([
    prisma.location.create({
      data: { code: "HON", name: "本社", address: "本社所在地..." },
    }),
    prisma.location.create({
      data: { code: "AMA", name: "尼崎倉庫", address: "兵庫県尼崎市..." },
    }),
  ]);
  const locByCode = { HON: honsha, AMA: amagasaki };

  // カテゴリー（CSV の出現順）
  const categoryNames = [...new Set(UNIT_ROWS.map((r) => r[2]))];
  const categories = await Promise.all(
    categoryNames.map((name) => prisma.category.create({ data: { name } })),
  );
  const categoryByName = Object.fromEntries(
    categories.map((c) => [c.name, c]),
  );

  // ユーザー
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "管理 太郎",
        email: "admin@example.com",
        role: "ADMIN",
        locationId: honsha.id,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "本社 花子",
        email: "manager.honsha@example.com",
        role: "MANAGER",
        locationId: honsha.id,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "尼崎 次郎",
        email: "manager.amagasaki@example.com",
        role: "MANAGER",
        locationId: amagasaki.id,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "営業 三郎",
        email: "staff1@example.com",
        role: "STAFF",
        locationId: honsha.id,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "営業 四美",
        email: "staff2@example.com",
        role: "STAFF",
        locationId: amagasaki.id,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        name: "営業 五郎",
        email: "staff3@example.com",
        role: "STAFF",
        locationId: amagasaki.id,
        passwordHash,
      },
    }),
  ]);
  const [admin, mgrHonsha, mgrAmagasaki, staff1, staff2, staff3] = users;

  // デモ機（CSV の実データ）
  const units = await Promise.all(
    UNIT_ROWS.map(([assetNo, name, categoryName]) =>
      prisma.demoUnit.create({
        data: {
          assetNo,
          name,
          modelNumber: modelOf(assetNo),
          maker: name.includes("カネカ") ? "カネカ" : null,
          notes: noteOf(name),
          categoryId: categoryByName[categoryName].id,
          homeLocationId: locByCode[CATEGORY_HOME[categoryName] ?? "HON"].id,
          status: "AVAILABLE",
        },
      }),
    ),
  );
  const byAsset = (assetNo: string) => {
    const u = units.find((x) => x.assetNo === assetNo);
    if (!u) throw new Error(`seed: unit not found: ${assetNo}`);
    return u;
  };

  // 予約（NK40 は資料どおり稼働率高め）
  await prisma.reservation.createMany({
    data: [
      // 過去・返却済み
      {
        demoUnitId: byAsset("NK40S-01").id,
        requestedById: staff1.id,
        customerCompany: "みなと設計事務所",
        customerName: "佐藤様",
        endUser: "港南建設",
        projectName: "港区オフィスビル 基本設計",
        startDate: day(-30),
        endDate: day(-23),
        shipDate: day(-30),
        pickupLocationId: honsha.id,
        returnLocationId: honsha.id,
        status: "RETURNED",
        pickedUpAt: day(-30),
        pickedUpById: mgrHonsha.id,
        shippingTrackingNo: "4012-8890-1123",
        partsChecked: true,
        maintenanceChecked: true,
        inverterChecked: true,
        returnedAt: day(-23),
        returnedById: mgrHonsha.id,
        returnNote: "付属品欠品なし。軽微なスレあり。",
      },
      // 返却遅延（PICKED_UP かつ endDate 過去）
      {
        demoUnitId: byAsset("NK40S-02").id,
        requestedById: staff1.id,
        customerCompany: "大手町ゼネコン",
        customerName: "田中様",
        projectName: "大手町再開発 モックアップ確認",
        startDate: day(-10),
        endDate: day(-3),
        shipDate: day(-10),
        pickupLocationId: honsha.id,
        returnLocationId: honsha.id,
        status: "PICKED_UP",
        pickedUpAt: day(-10),
        pickedUpById: mgrHonsha.id,
        shippingTrackingNo: "4013-2201-7788",
        partsChecked: true,
        maintenanceChecked: true,
        inverterChecked: true,
        checkoutNote: "乳白レンズ仕様で出庫。",
      },
      // 現在貸出中
      {
        demoUnitId: byAsset("NK40S-03").id,
        requestedById: staff1.id,
        customerCompany: "国際イベント企画",
        endUser: "幕張メッセ 展示ホール",
        projectName: "展示会ブース演出プラン",
        startDate: day(-2),
        endDate: day(4),
        shipDate: day(-2),
        pickupLocationId: honsha.id,
        returnLocationId: honsha.id,
        status: "PICKED_UP",
        pickedUpAt: day(-2),
        pickedUpById: mgrHonsha.id,
        shippingTrackingNo: "4013-5567-0042",
        partsChecked: true,
        maintenanceChecked: true,
        inverterChecked: true,
      },
      // 本日出庫予定（確定）
      {
        demoUnitId: byAsset("TSG60W-02").id,
        requestedById: staff1.id,
        customerCompany: "渋谷リテール",
        customerName: "鈴木様",
        projectName: "店舗改装 照度検討",
        startDate: day(0),
        endDate: day(6),
        pickupLocationId: honsha.id,
        returnLocationId: honsha.id,
        status: "CONFIRMED",
      },
      // 未来・確定
      {
        demoUnitId: byAsset("TSG100W-01").id,
        requestedById: staff2.id,
        customerCompany: "関西物流センター",
        projectName: "倉庫照明リプレース検討",
        startDate: day(5),
        endDate: day(12),
        pickupLocationId: amagasaki.id,
        returnLocationId: amagasaki.id,
        status: "CONFIRMED",
      },
      // 未来・申請中
      {
        demoUnitId: byAsset("NK150-01").id,
        requestedById: staff3.id,
        customerCompany: "名古屋美術館",
        customerName: "山本様",
        projectName: "常設展 展示照明トライアル",
        startDate: day(9),
        endDate: day(16),
        pickupLocationId: amagasaki.id,
        returnLocationId: honsha.id,
        status: "REQUESTED",
      },
      // 未来・申請中（別機）
      {
        demoUnitId: byAsset("LEDATL120-01").id,
        requestedById: staff1.id,
        customerCompany: "ライブハウス開業準備室",
        projectName: "小規模ステージ照明デモ",
        startDate: day(3),
        endDate: day(8),
        pickupLocationId: amagasaki.id,
        returnLocationId: amagasaki.id,
        status: "REQUESTED",
      },
      // キャンセル
      {
        demoUnitId: byAsset("TSG100W-02").id,
        requestedById: staff2.id,
        customerCompany: "堺市中学校 改修",
        projectName: "教室照明サンプル",
        startDate: day(2),
        endDate: day(9),
        pickupLocationId: amagasaki.id,
        returnLocationId: amagasaki.id,
        status: "CANCELLED",
      },
    ],
  });

  // 点検・修理: 「※不点灯」の器具は継続中の修理として登録（＝貸出不可）
  for (const u of units) {
    if (u.name.includes("不点灯")) {
      await prisma.maintenanceRecord.create({
        data: {
          demoUnitId: u.id,
          type: "REPAIR",
          startDate: day(-20),
          endDate: null,
          description: "不点灯。基板の切り分け・部品手配中。",
          createdById:
            u.homeLocationId === honsha.id ? mgrHonsha.id : mgrAmagasaki.id,
        },
      });
    }
  }
  // 完了済みの点検を1件
  await prisma.maintenanceRecord.create({
    data: {
      demoUnitId: byAsset("NK150-02").id,
      type: "INSPECTION",
      startDate: day(-40),
      endDate: day(-38),
      description: "定期点検。異常なし。",
      createdById: mgrAmagasaki.id,
    },
  });

  // 各デモ機の status を現況に合わせて更新
  const now = day(0);
  for (const u of units) {
    const maint = await prisma.maintenanceRecord.findFirst({
      where: {
        demoUnitId: u.id,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });
    let status = "AVAILABLE";
    if (maint) {
      status = "MAINTENANCE";
    } else {
      const loaned = await prisma.reservation.findFirst({
        where: { demoUnitId: u.id, status: "PICKED_UP" },
      });
      if (loaned) {
        status = "LOANED";
      } else {
        const upcoming = await prisma.reservation.findFirst({
          where: {
            demoUnitId: u.id,
            status: { in: ["REQUESTED", "CONFIRMED"] },
            endDate: { gte: now },
          },
        });
        if (upcoming) status = "RESERVED";
      }
    }
    await prisma.demoUnit.update({ where: { id: u.id }, data: { status } });
  }

  console.log(
    `seed 完了: 拠点 ${2} / カテゴリ ${categories.length} / ユーザー ${users.length} / デモ機 ${units.length}`,
  );
  console.log(`ログイン: admin@example.com / ${DEFAULT_PASSWORD}`);
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
