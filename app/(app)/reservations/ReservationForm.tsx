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

type Option = { id: string; name: string };
type UnitOption = {
  id: string;
  assetNo: string;
  name: string;
  modelNumber: string;
  categoryName: string;
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
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // 資料の運用: 基本は1週間貸出。貸出日を入れたら返却日を +7日 で初期化。
  function handleStartChange(value: string) {
    setStartDate(value);
    if (value && !endDate) {
      const d = new Date(value);
      d.setDate(d.getDate() + 7);
      setEndDate(d.toISOString().slice(0, 10));
    }
  }

  const [units, setUnits] = useState<UnitOption[]>(
    defaultUnit ? [defaultUnit] : [],
  );
  const [selectedUnit, setSelectedUnit] = useState(defaultUnit?.id ?? "");
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [searched, setSearched] = useState(Boolean(defaultUnit));

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
      if (!list.some((u) => u.id === selectedUnit)) setSelectedUnit("");
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
              onChange={(e) => setEndDate(e.target.value)}
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
                    onChange={() => setSelectedUnit(u.id)}
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
          <Field
            label="納入先"
            htmlFor="endUser"
            error={fe.endUser}
            hint="エンドユーザー（例: 東海住電精密）"
          >
            <Input id="endUser" name="endUser" />
          </Field>
          <Field label="案件名" htmlFor="projectName" required error={fe.projectName}>
            <Input id="projectName" name="projectName" required />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="受渡拠点"
              htmlFor="pickupLocationId"
              required
              error={fe.pickupLocationId}
            >
              <Select
                id="pickupLocationId"
                name="pickupLocationId"
                defaultValue=""
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
            >
              <Select
                id="returnLocationId"
                name="returnLocationId"
                defaultValue=""
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
