import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ItemSlot } from "@/lib/deadlock/types";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/** Slot colours, shared by chips and the Weapon/Vitality/Spirit switch. */
export const SLOT_STYLES: Record<ItemSlot, { label: string; fill: string; text: string }> = {
  weapon: { label: "Weapon", fill: "border-weapon bg-weapon-bg", text: "text-weapon-text" },
  vitality: { label: "Vitality", fill: "border-vitality bg-vitality-bg", text: "text-vitality" },
  spirit: { label: "Spirit", fill: "border-spirit bg-spirit-bg", text: "text-spirit" },
};

export function tierNumeral(tier: number) {
  return ROMAN[tier - 1] ?? String(tier);
}

type ItemChipProps = {
  slot: ItemSlot;
  tier: number;
  /**
   * Shop art (the in-game shop illustration). When set, it replaces the
   * numeral; `null` means an art list where this item has none, so the
   * numeral fallback keeps the art chip's size and the rows line up.
   */
  imageUrl?: string | null;
  /** Item name, for the art's alt text. */
  name?: string;
  className?: string;
};

/**
 * Square chip with a slot-coloured border. With `imageUrl`, shows the item's
 * shop art; otherwise the tier in Roman numerals on the slot colour.
 */
export function ItemChip({ slot, tier, imageUrl, name, className }: ItemChipProps) {
  const style = SLOT_STYLES[slot];
  const label = `${name ? `${name}: ` : ""}${style.label}, tier ${tier}`;
  const artSized = imageUrl !== undefined;

  if (imageUrl) {
    return (
      <span
        title={`${style.label} · tier ${tierNumeral(tier)}`}
        className={cn("relative block size-9 shrink-0 overflow-hidden border md:size-10", style.fill, className)}
      >
        {/* Already a small WebP from the API (~20 KB): served as is, not through Vercel image optimisation. */}
        <Image src={imageUrl} alt={label} fill sizes="40px" unoptimized className="object-cover" />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-center border font-mono",
        artSized ? "size-9 text-[11px] md:size-10 md:text-xs" : "size-7 text-[10px] md:size-[30px] md:text-[11px]",
        style.fill,
        style.text,
        className,
      )}
    >
      {tierNumeral(tier)}
    </span>
  );
}
