"use client";

import { useActionState } from "react";
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
import { UNIT_STATUS_LABEL } from "@/lib/constants";
import type { FormState } from "@/lib/form";

type Option = { id: string; name: string };

export type UnitDefaults = {
  assetNo?: string;
  name?: string;
  modelNumber?: string;
  maker?: string;
  serialNumber?: string;
  accessories?: string;
  purchaseDate?: string;
  categoryId?: string;
  homeLocationId?: string;
  status?: string;
  imageUrl?: string;
  notes?: string;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "保存中…" : label}
    </Button>
  );
}

export function UnitForm({
  action,
  categories,
  locations,
  defaults = {},
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: Option[];
  locations: Option[];
  defaults?: UnitDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <Card className="p-5">
      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        {state.error && (
          <div className="md:col-span-2">
            <Alert tone="error">{state.error}</Alert>
          </div>
        )}

        <Field label="管理番号" htmlFor="assetNo" required error={fe.assetNo}>
          <Input id="assetNo" name="assetNo" defaultValue={defaults.assetNo} required />
        </Field>
        <Field label="名称" htmlFor="name" required error={fe.name}>
          <Input id="name" name="name" defaultValue={defaults.name} required />
        </Field>
        <Field label="型番" htmlFor="modelNumber" required error={fe.modelNumber}>
          <Input
            id="modelNumber"
            name="modelNumber"
            defaultValue={defaults.modelNumber}
            required
          />
        </Field>
        <Field label="メーカー" htmlFor="maker" error={fe.maker}>
          <Input id="maker" name="maker" defaultValue={defaults.maker} />
        </Field>
        <Field label="シリアル番号" htmlFor="serialNumber" error={fe.serialNumber}>
          <Input
            id="serialNumber"
            name="serialNumber"
            defaultValue={defaults.serialNumber}
          />
        </Field>
        <Field label="購入日" htmlFor="purchaseDate" error={fe.purchaseDate}>
          <Input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            defaultValue={defaults.purchaseDate}
          />
        </Field>
        <Field label="カテゴリ" htmlFor="categoryId" required error={fe.categoryId}>
          <Select
            id="categoryId"
            name="categoryId"
            defaultValue={defaults.categoryId ?? ""}
            required
          >
            <option value="" disabled>
              選択してください
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="配置拠点"
          htmlFor="homeLocationId"
          required
          error={fe.homeLocationId}
        >
          <Select
            id="homeLocationId"
            name="homeLocationId"
            defaultValue={defaults.homeLocationId ?? ""}
            required
          >
            <option value="" disabled>
              選択してください
            </option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="状態" htmlFor="status" required error={fe.status}>
          <Select
            id="status"
            name="status"
            defaultValue={defaults.status ?? "AVAILABLE"}
          >
            {Object.entries(UNIT_STATUS_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="画像URL" htmlFor="imageUrl" error={fe.imageUrl}>
          <Input id="imageUrl" name="imageUrl" defaultValue={defaults.imageUrl} />
        </Field>

        <div className="md:col-span-2">
          <Field label="付属品" htmlFor="accessories" error={fe.accessories}>
            <Textarea
              id="accessories"
              name="accessories"
              defaultValue={defaults.accessories}
              placeholder="電源ケーブル、リモコン、取扱説明書 など"
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="備考" htmlFor="notes" error={fe.notes}>
            <Textarea id="notes" name="notes" defaultValue={defaults.notes} />
          </Field>
        </div>

        <div className="flex gap-2 md:col-span-2">
          <Submit label={submitLabel} />
          <Link
            href="/units"
            className="inline-flex items-center rounded-md px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </Card>
  );
}
