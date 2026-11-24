import type { DemoState, OrganizationId } from "@/domain/demo/types";

export function guardianMetrics(state: DemoState, organizationId: OrganizationId) {
  const latestRun = state.controlRuns.filter(item => item.organizationId === organizationId).at(0);
  const findings = state.findings.filter(item => item.organizationId === organizationId);
  const open = findings.filter(item => !["RESOLVED", "FALSE_POSITIVE", "RISK_ACCEPTED", "REJECTED"].includes(item.status));
  const exposureByFingerprint = new Map<string, number>();
  open.forEach(item => exposureByFingerprint.set(item.duplicateFingerprint, Math.max(exposureByFingerprint.get(item.duplicateFingerprint) ?? 0, item.amountUnderReviewMinor)));
  return {
    totalControls: state.controlRules.length,
    executableControls: state.controlRules.filter(item => item.implementation === "EXECUTABLE" && item.enabled).length,
    passedControls: latestRun?.results.filter(item => item.status === "PASSED").length ?? 0,
    openFindings: open.length,
    criticalFindings: open.filter(item => item.severity === "CRITICAL").length,
    resolvedFindings: findings.filter(item => item.status === "RESOLVED").length,
    insufficientData: latestRun?.results.filter(item => item.status === "INSUFFICIENT_DATA").length ?? 0,
    amountUnderReviewMinor: [...exposureByFingerprint.values()].reduce((sum, amount) => sum + amount, 0),
    verifiedRecoveryMinor: findings.filter(item => item.status === "RESOLVED" && item.revalidationResult === "PASSED").reduce((sum, item) => sum + item.amountUnderReviewMinor, 0),
    lastControlRun: latestRun?.completedAt,
  };
}

