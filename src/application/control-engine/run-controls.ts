import { buildAccountBalances } from "@/application/demo/reporting";
import type { DemoState } from "@/domain/demo/types";
import type { ControlEvidence, ControlFinding, ControlResult, ControlRule, FinancialControlRun } from "@/domain/financial-control/types";
import type { FinancialSnapshot, NormalizedFinancialTransaction } from "@/domain/financial-twin/types";

interface EngineOutput { run: FinancialControlRun; findings: ControlFinding[] }

export function runFinancialControls(state: DemoState, snapshot: FinancialSnapshot, existingFindings: ControlFinding[] = []): EngineOutput {
  if (snapshot.organizationId !== state.currentOrganizationId) throw new Error("Snapshot لا تخص الشركة الحالية.");
  const rules = state.controlRules.filter(rule => rule.enabled);
  const results: ControlResult[] = [];
  const findings: ControlFinding[] = [];
  for (const rule of rules) {
    try {
      const candidates = executeRule(rule, state, snapshot);
      if (candidates === null) {
        results.push(result(rule, "INSUFFICIENT_DATA", "البيانات المطلوبة غير متاحة في النموذج التجريبي الحالي."));
        continue;
      }
      if (!candidates.length) {
        results.push(result(rule, "PASSED", "لم تكتشف القاعدة مخالفة ضمن البيانات المتاحة."));
        continue;
      }
      candidates.forEach(candidate => {
        const existing = existingFindings.find(item => item.organizationId === snapshot.organizationId && item.ruleId === rule.id && item.duplicateFingerprint === candidate.fingerprint && !["RESOLVED", "FALSE_POSITIVE", "RISK_ACCEPTED"].includes(item.status));
        const finding = existing ? { ...existing, snapshotId: snapshot.id, lastCheckedAt: "2026-11-24T11:00:00.000Z", evidence: candidate.evidence, explanation: candidate.explanation, amountUnderReviewMinor: candidate.amountMinor } : createFinding(rule, snapshot, candidate);
        findings.push(finding);
        results.push({ ...result(rule, "FINDING", candidate.explanation, candidate.evidence), findingId: finding.id });
      });
    } catch (cause) {
      results.push(result(rule, "EXECUTION_ERROR", cause instanceof Error ? cause.message : "تعذر تنفيذ القاعدة."));
    }
  }
  const run: FinancialControlRun = {
    id: `control-run-${snapshot.id}-${state.controlRuns.filter(item => item.snapshotId === snapshot.id).length + 1}`,
    organizationId: snapshot.organizationId,
    snapshotId: snapshot.id,
    startedAt: "2026-11-24T11:00:00.000Z",
    completedAt: "2026-11-24T11:00:00.125Z",
    status: "COMPLETED",
    results,
  };
  return { run, findings };
}

interface Candidate { transactionIds: string[]; documentIds: string[]; amountMinor: number; explanation: string; evidence: ControlEvidence[]; fingerprint: string }

function executeRule(rule: ControlRule, state: DemoState, snapshot: FinancialSnapshot): Candidate[] | null {
  const batch = state.importBatches.find(item => item.id === snapshot.batchId);
  if (!batch) throw new Error("دفعة المصدر المرتبطة بالـSnapshot غير موجودة.");
  const allBatchTransactions = state.normalizedTransactions.filter(item => item.batchId === batch.id);
  const accepted = allBatchTransactions.filter(item => snapshot.recordIds.includes(item.id));
  const grouped = groupTransactions(accepted);
  switch (rule.id) {
    case "BNK-001":
      return [...grouped.values()].filter(group => group.some(item => item.externalAccountId === "EXT-BANK") && !state.journals.some(entry => entry.organizationId === snapshot.organizationId && (entry.reference === group[0].reference || entry.reference === `CTRL-${group[0].reference}`) && ["POSTED", "REVERSED"].includes(entry.status))).map(group => candidateFromGroup(snapshot, group, "الحركة البنكية موجودة في المصدر الخارجي ولا يوجد قيد مرحل يحمل مرجعها."));
    case "BNK-002":
    case "BNK-005":
    case "ACC-008":
    case "AR-001":
    case "AR-002":
    case "AR-003":
    case "AP-001":
    case "AP-002":
    case "AP-003":
    case "EXP-001":
    case "EXP-002":
    case "EXP-003":
    case "EXP-004":
    case "AST-001":
    case "AST-002":
    case "INV-001":
    case "INV-002":
    case "CLS-002":
    case "CLS-003":
      return null;
    case "BNK-003":
    case "ACC-002": {
      const duplicates = allBatchTransactions.filter(item => item.validationStatus === "DUPLICATE");
      const duplicateGroups = groupTransactions(duplicates);
      return [...duplicateGroups.values()].slice(0, 1).map(group => candidateFromGroup(snapshot, group, "توجد سجلات تحمل بصمة مالية مكررة داخل دفعة الاستيراد."));
    }
    case "BNK-004": {
      const difference = Math.abs(snapshot.totals.debitMinor - snapshot.totals.creditMinor);
      if (!difference) return [];
      return [{ transactionIds: accepted.map(item => item.id), documentIds: [], amountMinor: difference, explanation: "إجمالي المدين في Snapshot لا يساوي إجمالي الدائن.", fingerprint: `${snapshot.id}|reconciliation-difference`, evidence: [calculationEvidence("snapshot-balance", { debitMinor: snapshot.totals.debitMinor, creditMinor: snapshot.totals.creditMinor, differenceMinor: difference })] }];
    }
    case "ACC-001":
      return [...grouped.values()].filter(group => total(group, "debitMinor") !== total(group, "creditMinor")).map(group => candidateFromGroup(snapshot, group, "مجموعة الحركة الخارجية غير متوازنة بين المدين والدائن."));
    case "ACC-003":
      return [...grouped.values()].filter(group => group.every(item => !item.sourceDocument)).map(group => candidateFromGroup(snapshot, group, "الحركة لا تحتوي على مرجع مستند مؤيد في المصدر."));
    case "ACC-004": {
      const invalid = allBatchTransactions.filter(item => item.validationErrors.includes("UNMAPPED_ACCOUNT"));
      return invalid.length ? [{ transactionIds: invalid.map(item => item.id), documentIds: [], amountMinor: Math.max(total(invalid, "debitMinor"), total(invalid, "creditMinor")), explanation: "توجد حسابات خارجية لم تُربط بحساب ترحيل صالح.", fingerprint: `${snapshot.id}|unmapped|${[...new Set(invalid.map(item => item.externalAccountId))].sort().join("|")}`, evidence: invalid.map(item => sourceEvidence(item)) }] : [];
    }
    case "ACC-005":
      return [...grouped.values()].filter(group => state.financialPeriods.some(period => period.organizationId === snapshot.organizationId && period.status === "CLOSED" && group[0].transactionDate >= period.startsAt && group[0].transactionDate <= period.endsAt)).map(group => candidateFromGroup(snapshot, group, "تاريخ الحركة يقع داخل فترة مالية مقفلة."));
    case "ACC-006": {
      const entries = state.journals.filter(entry => entry.organizationId === snapshot.organizationId && ["POSTED", "REVERSED"].includes(entry.status) && entry.source !== "OPENING" && !entry.approvedByRole);
      return entries.map(entry => ({ transactionIds: [], documentIds: entry.sourceDocumentId ? [entry.sourceDocumentId] : [], amountMinor: entry.lines.reduce((sum, line) => sum + line.debitMinor, 0), explanation: `القيد ${entry.reference} مرحل دون سجل اعتماد داخل بيانات العرض.`, fingerprint: `${snapshot.id}|journal-approval|${entry.id}`, evidence: [{ id: `evidence-${entry.id}`, kind: "JOURNAL", referenceId: entry.id, label: entry.reference, details: { status: entry.status, revision: entry.revision } }] }));
    }
    case "ACC-007": {
      const abnormal = buildAccountBalances(state, snapshot.organizationId).filter(item => item.account.postingAllowed && item.balanceMinor < -(rule.thresholdMinor ?? 0));
      return abnormal.map(item => ({ transactionIds: [], documentIds: [], amountMinor: Math.abs(item.balanceMinor), explanation: `الحساب ${item.account.code} يظهر بعكس طبيعته الائتمانية/المدينة المعرفة.`, fingerprint: `${snapshot.id}|abnormal|${item.account.id}`, evidence: [{ id: `evidence-${item.account.id}`, kind: "ACCOUNT", referenceId: item.account.id, label: item.account.name, details: { code: item.account.code, balanceMinor: item.balanceMinor, normalBalance: item.account.normalBalance } }] }));
    }
    case "CLS-001": {
      const pending = state.journals.filter(entry => entry.organizationId === snapshot.organizationId && ["DRAFT", "PENDING_APPROVAL", "APPROVED", "CORRECTION_REQUESTED"].includes(entry.status));
      return pending.map(entry => ({ transactionIds: [], documentIds: entry.sourceDocumentId ? [entry.sourceDocumentId] : [], amountMinor: entry.lines.reduce((sum, line) => sum + line.debitMinor, 0), explanation: `القيد ${entry.reference} ما زال في حالة ${entry.status}.`, fingerprint: `${snapshot.id}|pending|${entry.id}`, evidence: [{ id: `evidence-${entry.id}`, kind: "JOURNAL", referenceId: entry.id, label: entry.reference, details: { status: entry.status } }] }));
    }
    default:
      return rule.implementation === "EXECUTABLE" ? [] : null;
  }
}

function createFinding(rule: ControlRule, snapshot: FinancialSnapshot, candidate: Candidate): ControlFinding {
  const id = `finding-${snapshot.organizationId}-${rule.id.toLocaleLowerCase()}-${stableFingerprintToken(candidate.fingerprint)}`;
  return {
    id,
    organizationId: snapshot.organizationId,
    snapshotId: snapshot.id,
    ruleId: rule.id,
    ruleVersion: rule.version,
    relatedTransactionIds: candidate.transactionIds,
    relatedDocumentIds: candidate.documentIds,
    amountUnderReviewMinor: candidate.amountMinor,
    currency: snapshot.currency,
    severity: rule.severity,
    explanation: candidate.explanation,
    evidence: candidate.evidence,
    recommendedAction: rule.recommendedActionAr,
    status: "DETECTED",
    createdAt: "2026-11-24T11:00:00.000Z",
    lastCheckedAt: "2026-11-24T11:00:00.000Z",
    dueDate: rule.severity === "CRITICAL" ? "2026-11-25" : rule.severity === "HIGH" ? "2026-11-27" : "2026-12-01",
    comments: [],
    history: [{ id: `${id}-history-1`, at: "2026-11-24T11:00:00.000Z", actor: "Financial Control Engine — Simulation", toStatus: "DETECTED", reason: "نتيجة قاعدة رقابية حتمية مرتبطة بالأدلة." }],
    duplicateFingerprint: candidate.fingerprint,
  };
}

function stableFingerprintToken(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function result(rule: ControlRule, status: ControlResult["status"], explanation: string, evidence: ControlEvidence[] = []): ControlResult {
  return { id: `result-${rule.id.toLocaleLowerCase()}-${status.toLocaleLowerCase()}`, ruleId: rule.id, ruleVersion: rule.version, status, explanation, evidence, durationMs: rule.implementation === "EXECUTABLE" ? 2 : 0 };
}

function groupTransactions(transactions: NormalizedFinancialTransaction[]) {
  const groups = new Map<string, NormalizedFinancialTransaction[]>();
  transactions.forEach(item => groups.set(item.externalTransactionId, [...(groups.get(item.externalTransactionId) ?? []), item]));
  return groups;
}

function candidateFromGroup(snapshot: FinancialSnapshot, group: NormalizedFinancialTransaction[], explanation: string): Candidate {
  return {
    transactionIds: group.map(item => item.id),
    documentIds: [],
    amountMinor: Math.max(total(group, "debitMinor"), total(group, "creditMinor")),
    explanation,
    fingerprint: `${snapshot.organizationId}|${group[0].externalTransactionId}`,
    evidence: group.map(sourceEvidence),
  };
}

function sourceEvidence(transaction: NormalizedFinancialTransaction): ControlEvidence {
  return { id: `evidence-${transaction.id}`, kind: "SOURCE_RECORD", referenceId: transaction.id, label: transaction.reference || transaction.sourceRecordId, details: { date: transaction.transactionDate, account: transaction.externalAccountId, debitMinor: transaction.debitMinor, creditMinor: transaction.creditMinor, sourceRecordId: transaction.sourceRecordId } };
}

function calculationEvidence(referenceId: string, details: Record<string, number>): ControlEvidence {
  return { id: `evidence-${referenceId}`, kind: "CALCULATION", referenceId, label: "Deterministic calculation", details };
}

function total(items: NormalizedFinancialTransaction[], key: "debitMinor" | "creditMinor") {
  return items.reduce((sum, item) => sum + item[key], 0);
}

