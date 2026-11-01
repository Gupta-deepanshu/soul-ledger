import { DoubleRule } from "@/components/ui/DoubleRule";

export function Footer({ sample }: { sample: boolean }) {
  return (
    <footer className="mt-6 md:mt-10 xl:mt-12">
      <DoubleRule />
      <div className="flex flex-col gap-1.5 pt-3.5 font-mono text-[11px] leading-normal text-faint md:pt-4 md:text-xs xl:flex-row xl:flex-wrap xl:justify-between xl:gap-3 xl:pt-5">
        <span>Fan project. Not affiliated with or endorsed by Valve. Data via deadlock-api.com.</span>
        {sample && <span>All figures shown are sample data</span>}
      </div>
    </footer>
  );
}
