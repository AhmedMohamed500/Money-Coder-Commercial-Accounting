import { financialTerminology, formatFinancialTerm, type FinancialTermKey } from "@/i18n/terminology/registry";
import type { LanguageDisplayMode } from "@/domain/demo/types";

export function BilingualLabel({ term, mode, compact = false, className }: { term: FinancialTermKey; mode: LanguageDisplayMode; compact?: boolean; className?: string }) {
  const definition = financialTerminology[term];
  return <span className={className} lang={mode === "EN" ? "en" : "ar"} dir={mode === "EN" ? "ltr" : "auto"} title={mode === "AR" ? definition.en : mode === "EN" ? definition.ar : undefined}>{formatFinancialTerm(term, mode, compact)}</span>;
}

export function TerminologyTooltip({ term, mode }: { term: FinancialTermKey; mode: LanguageDisplayMode }) {
  const definition = financialTerminology[term];
  const description = mode === "EN" ? definition.descriptionEn : definition.descriptionAr;
  return <span className="demo-term-tooltip" tabIndex={0} title={description ?? `${definition.ar} — ${definition.en}`}>{definition.abbreviation ?? "i"}</span>;
}

