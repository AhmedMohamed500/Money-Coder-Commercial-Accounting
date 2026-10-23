import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`} aria-label="Money Coder — الصفحة الرئيسية">
      <Image src="/money-coder-logo.jpg" alt="Money Coder" width={compact ? 54 : 72} height={compact ? 54 : 72} priority={compact} />
      {!compact ? <span><strong>Money Coder</strong><small>SMART ACCOUNTING</small></span> : null}
    </Link>
  );
}
