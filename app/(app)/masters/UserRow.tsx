"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Field, Input, Select, Td } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/constants";
import type { FormState } from "@/lib/form";
import { DeleteButton } from "./DeleteButton";
import { deleteUser, toggleUserActive, updateUser } from "./actions";

type Option = { id: string; name: string };

type UserRowUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  locationId: string;
  location: { name: string };
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "保存中…" : "保存"}
    </Button>
  );
}

export function UserRow({
  user,
  locations,
}: {
  user: UserRowUser;
  locations: Option[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(updateUser, {});
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok]);

  return (
    <>
      <tr className={user.active ? "" : "text-slate-400"}>
        <Td>{user.name}</Td>
        <Td className="text-slate-500">{user.email}</Td>
        <Td>{ROLE_LABEL[user.role] ?? user.role}</Td>
        <Td>{user.location.name}</Td>
        <Td>
          <span className={user.active ? "text-emerald-700" : "text-slate-400"}>
            {user.active ? "有効" : "無効"}
          </span>
        </Td>
        <Td>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-xs text-slate-600 underline hover:text-slate-900"
            >
              {editing ? "閉じる" : "編集"}
            </button>
            <form action={toggleUserActive}>
              <input type="hidden" name="id" value={user.id} />
              <button
                type="submit"
                className="text-xs text-slate-600 underline hover:text-slate-900"
              >
                {user.active ? "無効化" : "有効化"}
              </button>
            </form>
            <DeleteButton
              action={deleteUser}
              id={user.id}
              confirmText={`ユーザー「${user.name}」を削除します。よろしいですか？`}
            />
          </div>
        </Td>
      </tr>

      {editing && (
        <tr>
          <td colSpan={6} className="border-b border-slate-100 bg-slate-50 px-3 py-4">
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="id" value={user.id} />
              {state.error && <Alert tone="error">{state.error}</Alert>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="氏名"
                  htmlFor={`u-name-${user.id}`}
                  required
                  error={fe.name}
                >
                  <Input
                    id={`u-name-${user.id}`}
                    name="name"
                    defaultValue={user.name}
                    required
                  />
                </Field>
                <Field
                  label="メール"
                  htmlFor={`u-email-${user.id}`}
                  required
                  error={fe.email}
                >
                  <Input
                    id={`u-email-${user.id}`}
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    required
                  />
                </Field>
                <Field
                  label="パスワード再設定"
                  htmlFor={`u-pass-${user.id}`}
                  error={fe.password}
                  hint="変更する場合のみ入力（6文字以上）"
                >
                  <Input
                    id={`u-pass-${user.id}`}
                    name="password"
                    type="text"
                    placeholder="（変更しない）"
                  />
                </Field>
                <Field
                  label="権限"
                  htmlFor={`u-role-${user.id}`}
                  required
                  error={fe.role}
                >
                  <Select
                    id={`u-role-${user.id}`}
                    name="role"
                    defaultValue={user.role}
                  >
                    {Object.entries(ROLE_LABEL).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="所属拠点"
                  htmlFor={`u-loc-${user.id}`}
                  required
                  error={fe.locationId}
                >
                  <Select
                    id={`u-loc-${user.id}`}
                    name="locationId"
                    defaultValue={user.locationId}
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex gap-2">
                <SaveButton />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
