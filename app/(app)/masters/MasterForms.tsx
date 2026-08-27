"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { ROLE, ROLE_LABEL } from "@/lib/constants";
import type { FormState } from "@/lib/form";
import { createCategory, createLocation, createUser } from "./actions";

type Option = { id: string; name: string };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "保存中…" : label}
    </Button>
  );
}

function useResettableAction(
  action: (prev: FormState, fd: FormData) => Promise<FormState>,
) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);
  return { state, formAction, ref };
}

export function AddLocationForm() {
  const { state, formAction, ref } = useResettableAction(createLocation);
  const fe = state.fieldErrors ?? {};
  return (
    <form ref={ref} action={formAction} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">追加しました。</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="拠点コード" htmlFor="l-code" required error={fe.code}>
          <Input id="l-code" name="code" placeholder="TYO" required />
        </Field>
        <Field label="拠点名" htmlFor="l-name" required error={fe.name}>
          <Input id="l-name" name="name" placeholder="東京支店" required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="住所" htmlFor="l-addr" error={fe.address}>
            <Input id="l-addr" name="address" />
          </Field>
        </div>
      </div>
      <Submit label="拠点を追加" />
    </form>
  );
}

export function AddCategoryForm() {
  const { state, formAction, ref } = useResettableAction(createCategory);
  const fe = state.fieldErrors ?? {};
  return (
    <form ref={ref} action={formAction} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">追加しました。</Alert>}
      <Field label="カテゴリ名" htmlFor="c-name" required error={fe.name}>
        <Input id="c-name" name="name" placeholder="ダウンライト" required />
      </Field>
      <Submit label="カテゴリを追加" />
    </form>
  );
}

export function AddUserForm({ locations }: { locations: Option[] }) {
  const { state, formAction, ref } = useResettableAction(createUser);
  const fe = state.fieldErrors ?? {};
  return (
    <form ref={ref} action={formAction} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">追加しました。</Alert>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="氏名" htmlFor="u-name" required error={fe.name}>
          <Input id="u-name" name="name" required />
        </Field>
        <Field label="メール" htmlFor="u-email" required error={fe.email}>
          <Input id="u-email" name="email" type="email" required />
        </Field>
        <Field
          label="初期パスワード"
          htmlFor="u-pass"
          required
          error={fe.password}
          hint="6文字以上"
        >
          <Input id="u-pass" name="password" type="text" required />
        </Field>
        <Field label="権限" htmlFor="u-role" required error={fe.role}>
          <Select id="u-role" name="role" defaultValue={ROLE.STAFF}>
            {Object.entries(ROLE_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="所属拠点" htmlFor="u-loc" required error={fe.locationId}>
          <Select id="u-loc" name="locationId" defaultValue="">
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
      <Submit label="ユーザーを追加" />
    </form>
  );
}
