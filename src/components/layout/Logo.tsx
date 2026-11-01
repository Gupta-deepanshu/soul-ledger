import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Soul Ledger, home"
      className="flex min-h-11 items-center gap-1.5 font-serif text-2xl leading-none md:text-[28px] xl:gap-2 xl:text-[30px]"
    >
      <span className="italic text-brass">Soul</span>
      <span>Ledger</span>
    </Link>
  );
}
