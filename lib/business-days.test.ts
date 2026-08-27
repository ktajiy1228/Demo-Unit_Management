import { describe, expect, it } from "vitest";
import {
  defaultPlannedShipDate,
  formatYmd,
  isNonBusinessDay,
  parseYmd,
  previousBusinessDay,
} from "@/lib/business-days";

describe("isNonBusinessDay", () => {
  it("土曜・日曜を非営業日とする", () => {
    expect(isNonBusinessDay(parseYmd("2026-08-29"))).toBe(true); // 土
    expect(isNonBusinessDay(parseYmd("2026-08-30"))).toBe(true); // 日
  });

  it("平日は営業日とする", () => {
    expect(isNonBusinessDay(parseYmd("2026-08-27"))).toBe(false); // 木
  });

  it("祝日を非営業日とする", () => {
    expect(isNonBusinessDay(parseYmd("2026-08-11"))).toBe(true); // 山の日
    expect(isNonBusinessDay(parseYmd("2027-05-05"))).toBe(true); // こどもの日
  });
});

describe("previousBusinessDay", () => {
  it("営業日はそのまま返す", () => {
    expect(formatYmd(previousBusinessDay(parseYmd("2026-08-27")))).toBe(
      "2026-08-27",
    );
  });

  it("日曜は直前の金曜まで遡る", () => {
    expect(formatYmd(previousBusinessDay(parseYmd("2026-08-30")))).toBe(
      "2026-08-28",
    );
  });

  it("祝日・週末が連続していても平日まで遡る", () => {
    // 2026-05-06(振替休日/水) → 05-05,05-04,05-03(祝) → 05-02(土),05-01(金)
    expect(formatYmd(previousBusinessDay(parseYmd("2026-05-06")))).toBe(
      "2026-05-01",
    );
  });
});

describe("defaultPlannedShipDate", () => {
  it("平日に着地する場合は開始日の2日前", () => {
    // 2026-08-27(木) の2日前 = 08-25(火)
    expect(formatYmd(defaultPlannedShipDate(parseYmd("2026-08-27")))).toBe(
      "2026-08-25",
    );
  });

  it("2日前が日曜なら直前の金曜へ", () => {
    // 2026-08-25(火) の2日前 = 08-23(日) → 08-21(金)
    expect(formatYmd(defaultPlannedShipDate(parseYmd("2026-08-25")))).toBe(
      "2026-08-21",
    );
  });

  it("2日前が祝日なら直前の平日へ", () => {
    // 2026-08-13(木) の2日前 = 08-11(山の日/火) → 08-10(月)
    expect(formatYmd(defaultPlannedShipDate(parseYmd("2026-08-13")))).toBe(
      "2026-08-10",
    );
  });
});
