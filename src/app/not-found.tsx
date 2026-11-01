import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-col items-start gap-4 py-10 md:py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">404</p>
      <h1 className="font-serif text-[44px] leading-[0.95] tracking-[-0.02em] md:text-[64px]">
        Not in the <span className="italic text-brass">ledger.</span>
      </h1>
      <p className="text-fg-2">There&apos;s no page at this address. Match and player links need a numeric id.</p>
      <Link href="/" className="flex h-11 items-center border border-line-strong px-4 text-sm font-medium text-brass hover:border-line-muted">
        Back to the meta
      </Link>
    </section>
  );
}
