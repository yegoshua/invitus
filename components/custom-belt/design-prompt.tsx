"use client";

import { useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CTAButton } from "@/components/ui/cta-button";
import { TextArea } from "@/components/ui/text-area";
import { IDEA_MAX_LENGTH, buildDesignPrompt } from "@/lib/design-prompt";
import { trackEvent } from "@/lib/gtag";

export const DESIGN_PROMPT_ID = "design-prompt";

/** The accordion's one item — open or not. */
const PROMPT_ITEM = "prompt";

/**
 * The legacy `copy` command on the prompt's own field. iOS selects nothing in
 * a read-only textarea, so it is made writable for the length of the call.
 */
function copyBySelection(field: HTMLTextAreaElement | null): boolean {
  if (!field) return false;
  field.readOnly = false;
  field.focus();
  field.setSelectionRange(0, field.value.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.readOnly = true;
    field.blur();
  }
}

/**
 * The Clipboard API where there is one. Where there is not — an older iOS, or
 * a page an in-app browser opened outside a secure context — the selection
 * fallback runs synchronously, while the tap still counts as a user gesture;
 * after an `await` iOS Safari would no longer let it copy.
 */
async function copyText(text: string, field: HTMLTextAreaElement | null): Promise<boolean> {
  if (!navigator.clipboard) return copyBySelection(field);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyBySelection(field);
  }
}

type CopyState = "idle" | "copied" | "failed";

export function DesignPrompt({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [idea, setIdea] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const promptField = useRef<HTMLTextAreaElement>(null);
  const prompt = buildDesignPrompt(idea);

  const onCopy = async () => {
    const ok = await copyText(prompt, promptField.current);
    setCopyState(ok ? "copied" : "failed");
    if (ok) trackEvent("custom_belt_prompt_copy", {});
  };

  return (
    <Accordion
      type="single"
      collapsible
      value={open ? PROMPT_ITEM : ""}
      onValueChange={(value) => onOpenChange(value === PROMPT_ITEM)}
    >
      <AccordionItem
        id={DESIGN_PROMPT_ID}
        value={PROMPT_ITEM}
        // Clear of the fixed header when the hero's link scrolls here.
        className="scroll-mt-28 overflow-hidden rounded-[24px] border-none bg-surface lg:rounded-[32px]"
      >
        <AccordionTrigger className="px-6 py-8 text-left font-heading text-h3 font-bold text-white hover:no-underline lg:p-12">
          Немає картинки? Згенеруй з AI
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-6 px-6 pb-8 lg:px-12 lg:pb-12">
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-base leading-relaxed text-white/70">
            <li>Опиши ідею — будь-якою мовою.</li>
            <li>Скопіюй промпт і встав у ChatGPT, Gemini або Midjourney.</li>
            <li>Збережи картинку, повернись сюди й завантаж її вище.</li>
          </ol>

          <label className="flex flex-col gap-3">
            <span className="text-[15px] font-medium text-white/78">Твоя ідея</span>
            <TextArea
              rows={3}
              maxLength={IDEA_MAX_LENGTH}
              placeholder="Наприклад: чорний дракон у полум'ї на темно-червоному фоні"
              value={idea}
              onChange={(e) => {
                setIdea(e.target.value);
                // «Скопійовано» describes the prompt that was copied, not one edited since.
                setCopyState("idle");
              }}
            />
          </label>

          <label className="flex flex-col gap-3">
            <span className="text-[15px] font-medium text-white/78">Промпт</span>
            {/* Read-only but selectable: if copying fails, a long-press still works. */}
            <TextArea
              ref={promptField}
              readOnly
              rows={10}
              value={prompt}
              className="font-mono text-sm leading-relaxed text-white/80"
            />
          </label>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <CTAButton type="button" onClick={() => void onCopy()}>
              {copyState === "copied" ? "Скопійовано" : "Скопіювати"}
            </CTAButton>
            <p aria-live="polite" className="text-sm text-white/60">
              {copyState === "copied" && "Промпт у буфері обміну — встав його в AI."}
              {copyState === "failed" && "Не вдалося скопіювати. Виділи текст промпту й скопіюй вручну."}
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
