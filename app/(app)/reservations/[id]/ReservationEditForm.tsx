"use client";

import { useActionState, useState } from "react";
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

export type ReservationEditDefaults = {
  startDate: string;
  endDate: string;
  plannedShipDate: string;
  requestedById: string;
  customerCompany: string;
  customerName: string;
  shipToName: string;
  shipToContact: string;
  shipToPhone: string;
  shipToPostal: string;
  shipToAddress: string;
  pickupLocationId: string;
  returnLocationId: string;
  notes: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "更新中…" : "更新する"}
    </Button>
  );
}

export function ReservationEditForm({
  id,
  action,
  users,
  locations,
  unitLabel,
  defaults,
}: {
  id: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  users: Option[];
  locations: Option[];
  unitLabel: string;
  defaults: ReservationEditDefaults;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  const [startDate, setStartDate] = useState(defaults.startDate);
  const [plannedShipDate, setPlannedShipDate] = useState(
    defaults.plannedShipDate,
  );
  const [plannedShipTouched, setPlannedShipTouched] = useState(false);

  function handleStartChange(value: string) {
    setStartDate(value);
    if (value && !plannedShipTouched) {
      setPlannedShipDate(formatYmd(defaultPlannedShipDate(parseYmd(value))));
    }
  }

  return (
    <Card className="max-w-2xl p-5">
      <form action={formAction} className="space-y-3">
        {state.error && <Alert tone="error">{state.error}</Alert>}

        <div className="rounded-md bg-slate-50 p-3 text-sm">
          <span className="text-slate-500">デモ機: </span>
          <span className="font-medium">{unitLabel}</span>
          <p className="mt-1 text-xs text-slate-500">
            デモ機の変更はできません。変更する場合は予約を取り直してください。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="貸出日" htmlFor="startDate" required error={fe.startDate}>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => handleStartChange(e.target.value)}
              required
            />
          </Field>
          <Field label="返却日" htmlFor="endDate" required error={fe.endDate}>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={defaults.endDate}
              required
            />
          </Field>
          <Field
            label="出荷予定日"
            htmlFor="plannedShipDate"
            error={fe.plannedShipDate}
            hint="貸出日を変えると2営業日前で再計算（手入力後は保持）"
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
          <Field
            label="担当営業"
            htmlFor="requestedById"
            required
            error={fe.requestedById}
          >
            <Select
              id="requestedById"
              name="requestedById"
              defaultValue={defaults.requestedById}
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="顧客会社名"
          htmlFor="customerCompany"
          required
          error={fe.customerCompany}
        >
          <Input
            id="customerCompany"
            name="customerCompany"
            defaultValue={defaults.customerCompany}
            required
          />
        </Field>
        <Field label="先方担当者" htmlFor="customerName" error={fe.customerName}>
          <Input
            id="customerName"
            name="customerName"
            defaultValue={defaults.customerName}
          />
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
              <Input
                id="shipToName"
                name="shipToName"
                defaultValue={defaults.shipToName}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="送付先担当者"
                htmlFor="shipToContact"
                error={fe.shipToContact}
              >
                <Input
                  id="shipToContact"
                  name="shipToContact"
                  defaultValue={defaults.shipToContact}
                />
              </Field>
              <Field label="電話番号" htmlFor="shipToPhone" error={fe.shipToPhone}>
                <Input
                  id="shipToPhone"
                  name="shipToPhone"
                  type="tel"
                  defaultValue={defaults.shipToPhone}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <Field label="郵便番号" htmlFor="shipToPostal" error={fe.shipToPostal}>
                <Input
                  id="shipToPostal"
                  name="shipToPostal"
                  placeholder="123-4567"
                  defaultValue={defaults.shipToPostal}
                />
              </Field>
              <Field label="住所" htmlFor="shipToAddress" error={fe.shipToAddress}>
                <Input
                  id="shipToAddress"
                  name="shipToAddress"
                  defaultValue={defaults.shipToAddress}
                />
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
          >
            <Select
              id="pickupLocationId"
              name="pickupLocationId"
              defaultValue={defaults.pickupLocationId}
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
              defaultValue={defaults.returnLocationId}
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
          <Textarea id="notes" name="notes" defaultValue={defaults.notes} />
        </Field>

        <div className="flex gap-2 pt-1">
          <SubmitButton />
          <Link
            href={`/reservations/${id}`}
            className="inline-flex items-center rounded-md px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </Card>
  );
}
