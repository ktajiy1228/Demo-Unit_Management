import {
  format,
  differenceInCalendarDays,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";

export function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

/** yyyy/MM/dd 形式。無効な日付は "-" を返す。 */
export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = toDate(value);
  return isValid(d) ? format(d, "yyyy/MM/dd") : "-";
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

/** 曜日（日〜土）。無効な日付は "" を返す。 */
export function weekdayJa(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = toDate(value);
  return isValid(d) ? WEEKDAY_JA[d.getDay()] : "";
}

/** yyyy/MM/dd（曜）形式。例: 2026/08/27（木） */
export function fmtDateW(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = toDate(value);
  if (!isValid(d)) return "-";
  return `${format(d, "yyyy/MM/dd")}（${WEEKDAY_JA[d.getDay()]}）`;
}

/** yyyy/MM/dd HH:mm 形式。 */
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = toDate(value);
  return isValid(d) ? format(d, "yyyy/MM/dd HH:mm") : "-";
}

/** <input type="date"> 用の yyyy-MM-dd 文字列。 */
export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = toDate(value);
  return isValid(d) ? format(d, "yyyy-MM-dd") : "";
}

/** 今日の 0:00（ローカル）。 */
export function today(): Date {
  return startOfDay(new Date());
}

/** 貸出日数（開始日・終了日を含む）。 */
export function loanDays(start: string | Date, end: string | Date): number {
  return differenceInCalendarDays(toDate(end), toDate(start)) + 1;
}

/** endDate を過ぎているのに未返却か。 */
export function isOverdue(
  endDate: string | Date,
  status: string,
): boolean {
  return status === "PICKED_UP" && startOfDay(toDate(endDate)) < today();
}
