"use client";

import { useActionState, useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import type { FormState } from "@/lib/form";
import { defaultPlannedShipDate, formatYmd, parseYmd } from "@/lib/business-days";

type Option = { id: string; name: string };
type UnitOption = {
  id: string;
  assetNo: string;
  name: string;
  modelNumber: string;
  categoryName: string;
  locationId: string;
  locationName: string;
};

export function ReservationForm({
  action,
  users,
  locations,
  categories,
  defaultUnit,
  defaultRequestedById,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  users: Option[];
  locations: Option[];
  categories: Option[];
  defaultUnit?: UnitOption;
  defaultRequestedById?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [plannedShipDate, setPlannedShipDate] = useState("");
  const [plannedShipTouched, setPlannedShipTouched] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // 資料の運用: 基本は1週間貸出。貸出日を変えるたびに返却日を +7日 に更新する
  // （返却日を手動で変更したあとは上書きしない）。
  function handleStartChange(value: string) {
    setStartDate(value);
    if (value && !endDateTouched) {
      const d = parseYmd(value);
      d.setDate(d.getDate() + 7);
      setEndDate(formatYmd(d));
    }
    // 出荷予定日: 貸出開始の2営業日前を既定に（手入力済みなら上書きしない）。
    if (value && !plannedShipTouched) {
      setPlannedShipDate(formatYmd(defaultPlannedShipDate(parseYmd(value))));
    }
  }

  const [units, setUnits] = useState<UnitOption[]>(
    defaultUnit ? [defaultUnit] : [],
  );
  const [selectedUnit, setSelectedUnit] = useState(defaultUnit?.id ?? "");
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [searched, setSearched] = useState(Boolean(defaultUnit));

  // 発送拠点・返却拠点の既定は選択したデモ機の配置拠点。
  const [pickupLocationId, setPickupLocationId] = useState(
    defaultUnit?.locationId ?? "",
  );
  const [returnLocationId, setReturnLocationId] = useState(
    defaultUnit?.locationId ?? "",
  );

  function selectUnit(id: string) {
    setSelectedUnit(id);
    const homeLocationId = units.find((u) => u.id === id)?.locationId ?? "";
    setPickupLocationId(homeLocationId);
    setReturnLocationId(homeLocationId);
  }

  const search = useCallback(async () => {
    if (!startDate || !endDate) {
      setSearchMsg("貸出日と返却日を入力してください。");
      return;
    }
    if (Date.parse(endDate) < Date.parse(startDate)) {
      setSearchMsg("返却日は貸出日以降にしてください。");
      return;
    }
    setSearching(true);
    setSearchMsg(null);
    try {
      const qs = new URLSearchParams({ startDate, endDate });
      if (filterCategory) qs.set("categoryId", filterCategory);
      if (filterLocation) qs.set("locationId", filterLocation);
      const res = await fetch(`/api/units/available?${qs.toString()}`);
      const data = await res.json();
      const list: UnitOption[] = data.units ?? [];
      setUnits(list);
      setSearched(true);
      if (!list.some((u) => u.id === selectedUnit)) {
        setSelectedUnit("");
        setPickupLocationId("");
        setReturnLocationId("");
      }
      if (list.length === 0) setSearchMsg("この期間に空いているデモ機はありません。");
    } catch {
      setSearchMsg("検索に失敗しました。");
    } finally {
      setSearching(false);
    }
  }, [startDate, endDate, filterCategory, filterLocation, selectedUnit]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          1. 期間を決めて空きデモ機を検索
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="貸出日" htmlFor="startDate" required error={fe.startDate}>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => handleStartChange(e.target.value)}
              required
            />
          </Field>
          <Field
            label="返却日"
            htmlFor="endDate"
            required
            error={fe.endDate}
            hint="基本は1週間（貸出日から自動設定・変更可）"
          >
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDateTouched(true);
                setEndDate(e.target.value);
              }}
              required
            />
          </Field>
          <Field label="カテゴリで絞る" htmlFor="filterCategory">
            <Select
              id="filterCategory"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">指定なし</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="配置拠点で絞る" htmlFor="filterLocation">
            <Select
              id="filterLocation"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">指定なし</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Button type="button" variant="secondary" onClick={search} disabled={searching}>
            {searching ? "検索中…" : "空きを検索"}
          </Button>
        </div>

        {searchMsg && (
          <div className="mt-3">
            <Alert tone="warn">{searchMsg}</Alert>
          </div>
        )}

        {searched && units.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
            {units.map((u) => (
              <li key={u.id}>
                <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="unitPick"
                    className="mt-1"
                    checked={selectedUnit === u.id}
                    onChange={() => selectUnit(u.id)}
                  />
                  <span className="text-sm">
                    <span className="font-medium text-slate-900">{u.name}</span>
                    <span className="tabular ml-2 text-xs text-slate-500">
                      {u.assetNo} / {u.modelNumber}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {u.categoryName}・{u.locationName}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">2. 予約内容</h2>
        <form action={formAction} className="space-y-3">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <input type="hidden" name="demoUnitId" value={selectedUnit} />
          <input type="hidden" name="startDate" value={startDate} />
          <input type="hidden" name="endDate" value={endDate} />

          <div className="rounded-md bg-slate-50 p-3 text-sm">
            {selectedUnit ? (
              <>
                <span className="text-slate-500">選択中のデモ機: </span>
                <span className="font-medium">
                  {units.find((u) => u.id === selectedUnit)?.name}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  {startDate || "?"} 〜 {endDate || "?"}
                </span>
              </>
            ) : (
              <span className="text-slate-500">
                左で期間を検索し、デモ機を1台選んでください。
              </span>
            )}
            {fe.demoUnitId && (
              <p className="mt-1 text-xs text-red-600">{fe.demoUnitId}</p>
            )}
          </div>

          <Field
            label="出荷予定日"
            htmlFor="plannedShipDate"
            error={fe.plannedShipDate}
            hint="既定: 貸出開始日の2日前（土日祝はその前の平日）"
          >
            <Input
              id="plannedShipDate"
              name="plannedShipDate"
              type="date"
              value={plannedShipDate}
              onChange={(e) => {
                setPlannedShipTouched(true);
                setPlannedShipDate(e.target.value);
              }}
            />
          </Field>

          <Field label="担当営業" htmlFor="requestedById" required error={fe.requestedById}>
            <Select
              id="requestedById"
              name="requestedById"
              defaultValue={defaultRequestedById ?? ""}
              required
            >
              <option value="" disabled>
                選択してください
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="顧客会社名" htmlFor="customerCompany" required error={fe.customerCompany}>
            <Input id="customerCompany" name="customerCompany" required />
          </Field>
          <Field label="先方担当者" htmlFor="customerName" error={fe.customerName}>
            <Input id="customerName" name="customerName" />
          </Field>

          <fieldset className="rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-700">
              送付先（デモ機の配送先）
            </legend>
            <div className="space-y-3">
              <Field
                label="送付先名称"
                htmlFor="shipToName"
                error={fe.shipToName}
                hint="現場名・会社名など"
              >
                <Input id="shipToName" name="shipToName" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="送付先担当者" htmlFor="shipToContact" error={fe.shipToContact}>
                  <Input id="shipToContact" name="shipToContact" />
                </Field>
                <Field label="電話番号" htmlFor="shipToPhone" error={fe.shipToPhone}>
                  <Input id="shipToPhone" name="shipToPhone" type="tel" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <Field label="郵便番号" htmlFor="shipToPostal" error={fe.shipToPostal}>
                  <Input id="shipToPostal" name="shipToPostal" placeholder="123-4567" />
                </Field>
                <Field label="住所" htmlFor="shipToAddress" error={fe.shipToAddress}>
                  <Input id="shipToAddress" name="shipToAddress" />
                </Field>
              </div>
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="発送拠点"
              htmlFor="pickupLocationId"
              required
              error={fe.pickupLocationId}
              hint="既定はデモ機の配置拠点"
            >
              <Select
                id="pickupLocationId"
                name="pickupLocationId"
                value={pickupLocationId}
                onChange={(e) => setPickupLocationId(e.target.value)}
                required
              >
                <option value="" disabled>
                  選択
                </option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="返却拠点"
              htmlFor="returnLocationId"
              required
              error={fe.returnLocationId}
              hint="既定はデモ機の配置拠点"
            >
              <Select
                id="returnLocationId"
                name="returnLocationId"
                value={returnLocationId}
                onChange={(e) => setReturnLocationId(e.target.value)}
                required
              >
                <option value="" disabled>
                  選択
                </option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="備考" htmlFor="notes" error={fe.notes}>
            <Textarea id="notes" name="notes" />
          </Field>

          <div className="flex gap-2 pt-1">
            <SubmitButton disabled={!selectedUnit} />
            <Link
              href="/reservations"
              className="inline-flex items-center rounded-md px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "登録中…" : "予約を登録"}
    </Button>
  );
}
