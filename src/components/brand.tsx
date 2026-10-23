import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Money Coder">
      <Image src="/money-coder-logo.jpg" alt="شعار Money Coder" width={compact ? 48 : 64} height={compact ? 48 : 64} className={compact ? "h-12 w-12 rounded-xl object-cover" : "h-16 w-16 rounded-2xl object-cover"} />
      <span className={`${compact ? "hidden sm:block" : ""} leading-tight`}>
        <strong className="block text-xl font-black tracking-tight">Money<span className="gradient-text">Coder</span></strong>
        <small className="muted text-[10px] font-bold tracking-[.18em]">SMART ACCOUNTING</small>
      </span>
    </Link>
  );
}
