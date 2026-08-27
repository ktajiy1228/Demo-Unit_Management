"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Input, Textarea } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { checkinReservation, checkoutReservation } from "../actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "処理中…" : label}
    </Button>
  );
}

/** 返却（チェックイン）: 状態メモのみ */
function CheckinForm({ id }: { id: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    checkinReservation,
    {},
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        返却する
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full space-y-2 rounded-md border border-slate-200 p-3"
    >
      <input type="hidden" name="id" value={id} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <label className="block text-sm font-medium text-slate-700">
        返却時の状態メモ
      </label>
      <Textarea name="note" placeholder="キズ・欠品・付属品の有無など" />
      <div className="flex gap-2">
        <Submit label="返却する" />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          閉じる
        </Button>
      </div>
    </form>
  );
}

/** 出庫（チェックアウト）: 送り状No. と出荷前チェック */
function CheckoutForm({ id }: { id: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    checkoutReservation,
    {},
  );
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        出庫する
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full space-y-3 rounded-md border border-slate-200 p-3"
    >
      <input type="hidden" name="id" value={id} />
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div>
        <label
          htmlFor="carrier"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          運送会社名
        </label>
        <Input
          id="carrier"
          name="carrier"
          placeholder="ヤマト運輸 / 佐川急便 / 西濃運輸 など"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="shippingTrackingNo"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            送り状No.
          </label>
          <Input
            id="shippingTrackingNo"
            name="shippingTrackingNo"
            placeholder="1234-5678-9012"
          />
        </div>
        <div>
          <label
            htmlFor="shipDate"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            出荷日
          </label>
          <Input id="shipDate" name="shipDate" type="date" defaultValue={today} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="desiredArrivalDate"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            着指定日
          </label>
          <Input id="desiredArrivalDate" name="desiredArrivalDate" type="date" />
        </div>
        <div>
          <label
            htmlFor="desiredArrivalTime"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            時間指定
          </label>
          <Input
            id="desiredArrivalTime"
            name="desiredArrivalTime"
            type="text"
            defaultValue="AM"
            placeholder="AM / PM / 午前中 / 14〜16時 など"
          />
        </div>
      </div>

      <fieldset className="rounded-md bg-slate-50 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">
          出荷前チェック（必須）
        </legend>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="maintenanceChecked" />
            整備完了
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="partsChecked" />
            同梱部品（ネジ等）の確認
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="inverterChecked" />
            インバーターの取り付け確認
          </label>
        </div>
        {state.fieldErrors?.checks && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.checks}</p>
        )}
      </fieldset>

      <div>
        <label
          htmlFor="checkout-note"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          出庫時の状態メモ
        </label>
        <Textarea
          id="checkout-note"
          name="note"
          placeholder="キズ・欠品・付属品の有無など"
        />
      </div>

      <div className="flex gap-2">
        <Submit label="出庫する" />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          閉じる
        </Button>
      </div>
    </form>
  );
}

export function LifecycleActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {status === "CONFIRMED" && <CheckoutForm id={id} />}
      {status === "PICKED_UP" && <CheckinForm id={id} />}
    </div>
  );
}
