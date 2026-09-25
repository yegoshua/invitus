"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
import { ChipButton } from "@/components/ui/chip-button";
import { CTAButton } from "@/components/ui/cta-button";
import { IconInput } from "@/components/ui/icon-input";
import { LabeledField } from "@/components/ui/labeled-field";
import { PhoneField } from "@/components/ui/phone-field";
import { SizeChartDialog } from "@/components/product/size-chart-dialog";
import PersonIcon from "@/public/assets/icons/checkout/person.svg";
import { BELT_LENGTH_CM, BELT_WIDTH_CM, type Placement } from "@/lib/belt-design";
import {
  ARTWORK_FOLDER,
  UNKNOWN_SIZE,
  customRequestFormSchema,
  type CustomRequest,
  type CustomRequestFormData,
} from "@/lib/custom-request";
import { sizeDisplayText } from "@/lib/size-display";
import type { ProductSize } from "@/types";
import { drawBeltDesign, type DrawableArtwork } from "./draw-belt-design";

export interface UploadableArtwork extends DrawableArtwork {
  file: File;
  size: { width: number; height: number };
}

interface Props {
  artwork: UploadableArtwork | null;
  placement: Placement;
  sizes: ProductSize[];
}

/** The preview posted with the request: for the eye, not for print. */
const PREVIEW_PX_PER_CM = 16;

function renderPreview(artwork: UploadableArtwork, placement: Placement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = BELT_LENGTH_CM * PREVIEW_PX_PER_CM;
  canvas.height = BELT_WIDTH_CM * PREVIEW_PX_PER_CM;
  drawBeltDesign(canvas.getContext("2d")!, artwork, placement, {
    fromCm: 0,
    pxPerCm: PREVIEW_PX_PER_CM,
  });
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("preview"))), "image/jpeg", 0.85),
  );
}

/** A pathname the upload endpoint accepts: one flat folder, plain characters. */
function artworkPathname(file: File): string {
  const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-80);
  return `${ARTWORK_FOLDER}${safe || "artwork"}`;
}

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "failed"; message: string };

/**
 * The Custom request. Nothing is uploaded until «Надіслати»: a customer who
 * only plays with the builder leaves nothing behind in the store.
 */
export function CustomRequestForm({ artwork, placement, sizes }: Props) {
  const form = useForm<CustomRequestFormData>({
    resolver: zodResolver(customRequestFormSchema),
    defaultValues: { name: "", phone: "", comment: "" },
    mode: "onTouched",
  });
  const [size, setSize] = useState<string | null>(null);
  const [sizeMissing, setSizeMissing] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submit = form.handleSubmit(async (fields) => {
    if (!artwork) return;
    if (!size) {
      setSizeMissing(true);
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const uploaded = await upload(artworkPathname(artwork.file), artwork.file, {
        access: "private",
        handleUploadUrl: "/api/custom-belt/upload",
        contentType: artwork.file.type,
        multipart: artwork.file.size > 5 * 1024 * 1024,
      });

      const request: CustomRequest = {
        name: fields.name,
        phone: fields.phone,
        comment: fields.comment ?? "",
        size,
        sizeLabel: sizes.find((s) => s.value === size)?.label,
        artwork: {
          pathname: uploaded.pathname,
          fileName: artwork.file.name,
          width: artwork.size.width,
          height: artwork.size.height,
        },
        placement,
      };
      const body = new FormData();
      body.set("request", JSON.stringify(request));
      body.set("preview", await renderPreview(artwork, placement), "preview.jpg");

      const res = await fetch("/api/custom-belt/request", { method: "POST", body });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(error || "Не вдалося надіслати запит.");
      }
      setStatus({ kind: "sent" });
    } catch (err) {
      setStatus({
        kind: "failed",
        message:
          err instanceof Error && /[А-Яа-яІіЇїЄєҐґ]/.test(err.message)
            ? err.message
            : "Не вдалося надіслати запит. Перевір інтернет і спробуй ще раз.",
      });
    }
  });

  if (status.kind === "sent") {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-[24px] bg-surface px-6 py-10 lg:rounded-[32px] lg:p-12">
        <h2 className="font-heading text-h3 font-bold text-white">Запит надіслано</h2>
        <p className="text-base leading-relaxed text-white/70">
          Дякуємо! Ми подивимось на дизайн і зателефонуємо, щоб узгодити деталі й ціну.
        </p>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-8 rounded-[24px] bg-surface px-6 py-8 lg:rounded-[32px] lg:p-12"
      >
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-h3 font-bold text-white">Надіслати запит</h2>
          <p className="text-base leading-relaxed text-white/70">
            Ми перевіримо дизайн, за потреби доведемо його до друку й зателефонуємо, щоб
            узгодити ціну. Оплачувати зараз нічого не треба.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <LabeledField name="name" label="Ім'я">
            {({ id, hintId, error }) => (
              <IconInput
                id={id}
                icon={<PersonIcon />}
                type="text"
                autoComplete="name"
                placeholder="Арнольд"
                aria-describedby={hintId}
                invalid={!!error}
                {...form.register("name")}
              />
            )}
          </LabeledField>
          <PhoneField />
        </div>

        <fieldset className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <legend className="text-[15px] font-medium text-white/78">Розмір</legend>
            <SizeChartDialog />
          </div>
          <div className="flex flex-wrap gap-3">
            {sizes.map((s) => (
              <ChipButton
                key={s.value}
                isActive={size === s.value}
                aria-pressed={size === s.value}
                onClick={() => {
                  setSize(s.value);
                  setSizeMissing(false);
                }}
              >
                {sizeDisplayText(s.value, s.label)}
              </ChipButton>
            ))}
            <ChipButton
              isActive={size === UNKNOWN_SIZE}
              aria-pressed={size === UNKNOWN_SIZE}
              onClick={() => {
                setSize(UNKNOWN_SIZE);
                setSizeMissing(false);
              }}
            >
              Не знаю, підкажіть
            </ChipButton>
          </div>
          {sizeMissing && (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              Обери розмір або «Не знаю, підкажіть»
            </p>
          )}
        </fieldset>

        <LabeledField name="comment" label="Коментар (необовʼязково)">
          {({ id, hintId, error }) => (
            <textarea
              id={id}
              rows={3}
              placeholder="Наприклад: додайте напис знизу, або зробіть фон темнішим"
              aria-describedby={hintId}
              aria-invalid={!!error}
              className="min-h-24 rounded-[var(--radius-checkout-field)] border-[1.5px] border-transparent bg-[var(--color-checkout-field)] px-5 py-4 text-white placeholder:text-white/40 focus:border-coral focus:outline-none aria-[invalid=true]:border-[var(--color-error)]"
              {...form.register("comment")}
            />
          )}
        </LabeledField>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-white/60">
            {artwork
              ? "Разом із запитом ми отримаємо твоє зображення в оригінальній якості."
              : "Спершу завантаж зображення — без нього запит не надіслати."}
          </p>
          <CTAButton type="submit" disabled={!artwork || status.kind === "sending"}>
            {status.kind === "sending" ? "Надсилаємо…" : "Надіслати запит"}
          </CTAButton>
        </div>
        {status.kind === "failed" && (
          <p role="alert" className="text-sm text-[var(--color-error)]">
            {status.message}
          </p>
        )}
      </form>
    </FormProvider>
  );
}
