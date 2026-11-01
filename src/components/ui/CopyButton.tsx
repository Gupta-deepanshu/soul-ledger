"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { BracketButton, IconButton } from "@/components/ui/buttons";

type CopyButtonProps = {
  text: string;
  /** Visible label (and the icon button's accessible name), e.g. "Copy match ID". */
  label: string;
  /** "icon" for tight spots (phone header); "full" shows the label. */
  look?: "full" | "icon";
  className?: string;
};

/** Copies `text` to the clipboard and says so ("Copied") for 2 s, visibly and to screen readers. */
export function CopyButton({ text, label, look = "full", className }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const id = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(id);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  const status = state === "copied" ? "Copied" : state === "failed" ? `Couldn't copy. The ID is ${text}` : "";
  const icon = state === "copied" ? <Check size={18} strokeWidth={1.5} /> : <Copy size={18} strokeWidth={1.5} />;

  return (
    <span className={className}>
      {look === "icon" ? (
        <IconButton aria-label={label} icon={icon} onClick={copy} />
      ) : (
        <BracketButton onClick={copy}>
          <span aria-hidden="true" className="flex">
            {icon}
          </span>
          {state === "copied" ? "Copied" : label}
        </BracketButton>
      )}
      <span role="status" className="sr-only">
        {status}
      </span>
    </span>
  );
}
