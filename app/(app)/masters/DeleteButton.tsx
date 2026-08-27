"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-red-600 underline hover:text-red-800 disabled:opacity-50"
    >
      {pending ? "削除中…" : label}
    </button>
  );
}

export function DeleteButton({
  action,
  id,
  label = "削除",
  confirmText = "削除します。よろしいですか？",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  label?: string;
  confirmText?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(confirmText)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Submit label={label} />
      </form>
      {state.error && (
        <p className="mt-1 max-w-[16rem] text-xs text-red-600">{state.error}</p>
      )}
    </div>
  );
}
