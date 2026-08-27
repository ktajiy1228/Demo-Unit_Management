"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { addMaintenance } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "登録中…" : "点検・修理を登録"}
    </Button>
  );
}

export function MaintenancePanel({ unitId }: { unitId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addMaintenance,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const fe = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="demoUnitId" value={unitId} />
      {state.error && (
        <div className="sm:col-span-2">
          <Alert tone="error">{state.error}</Alert>
        </div>
      )}
      {state.ok && (
        <div className="sm:col-span-2">
          <Alert tone="success">登録しました。</Alert>
        </div>
      )}
      <Field label="区分" htmlFor="m-type" required error={fe.type}>
        <Select id="m-type" name="type" defaultValue="INSPECTION">
          <option value="INSPECTION">点検</option>
          <option value="REPAIR">修理</option>
        </Select>
      </Field>
      <Field label="費用（円）" htmlFor="m-cost" error={fe.cost}>
        <Input id="m-cost" name="cost" type="number" min="0" />
      </Field>
      <Field label="開始日" htmlFor="m-start" required error={fe.startDate}>
        <Input id="m-start" name="startDate" type="date" required />
      </Field>
      <Field
        label="終了日"
        htmlFor="m-end"
        error={fe.endDate}
        hint="空欄なら継続中（この間は貸出不可）"
      >
        <Input id="m-end" name="endDate" type="date" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="内容" htmlFor="m-desc" required error={fe.description}>
          <Textarea id="m-desc" name="description" required />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Submit />
      </div>
    </form>
  );
}
