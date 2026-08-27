"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "ログイン中…" : "ログイン"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <Field label="メールアドレス" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="admin@example.com"
          />
        </Field>
        <Field label="パスワード" htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <SubmitButton />
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">
        プロトタイプ: 初期パスワードは README を参照
      </p>
    </Card>
  );
}
