"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Bot, CheckCircle2, ClipboardCheck, Database, FileSearch, Gauge, Link2, Play, RefreshCcw, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { guardianMetrics } from "@/application/control-engine/selectors";
import { calculateDataQuality, latestOrganizationBatch, latestOrganizationSnapshot } from "@/application/financial-twin/import-engine";
import { useDemo } from "@/demo/state/demo-provider";
import type { AgentType } from "@/domain/agents/types";
import type { FindingStatus } from "@/domain/financial-control/types";
import type { FinancialSourceType } from "@/domain/financial-twin/types";
import { suggestedAccountMappings } from "@/integrations/demo/synthetic-financial-sources";

const sourceLabels: Record<FinancialSourceType, string> = {
  EXCEL: "Excel اصطناعي", CSV: "CSV اصطناعي", BANK_STATEMENT: "كشف بنك اصطناعي", DAFTRA: "Daftra — محاكاة", ODOO: "Odoo — محاكاة", QUICKBOOKS: "QuickBooks — محاكاة", OTHER_ERP: "ERP آخر — محاكاة", MONEY_CODER: "Money Coder — محاكاة",
};

const findingStatusLabels: Record<FindingStatus, string> = {
  DETECTED: "مكتشفة", ASSIGNED: "معيّنة", UNDER_INVESTIGATION: "قيد التحقيق", CORRECTION_PROPOSED: "تصحيح مقترح", PENDING_APPROVAL: "تنتظر الاعتماد", APPROVED: "معتمدة", REVALIDATION: "إعادة تحقق", RESOLVED: "محلولة", FALSE_POSITIVE: "إنذار غير صحيح", RISK_ACCEPTED: "مخاطرة مقبولة", REOPENED: "أعيد فتحها", REJECTED: "مرفوضة", ESCALATED: "مصعّدة",
};

function money(value: number, currency = "EGP") {
  return new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100);
}

export function FinancialTwinWorkspace() {
  const { state, service, execute } = useDemo();
  const [sourceType, setSourceType] = useState<FinancialSourceType>("EXCEL");
  const batch = latestOrganizationBatch(state, state.currentOrganizationId);
  const snapshot = latestOrganizationSnapshot(state, state.currentOrganizationId);
  const batchTransactions = batch ? state.normalizedTransactions.filter(item => item.batchId === batch.id) : [];
  const externalAccounts = [...new Set(batchTransactions.map(item => item.externalAccountId))];
  const [mappingDraft, setMappingDraft] = useState<Record<string, string>>({});
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const activeMappings = Object.keys(mappingDraft).length ? mappingDraft : batch?.accountMappings ?? {};

  const load = () => void execute("financial-twin", () => service.loadSyntheticImport(sourceType), "تم تحميل مصدر اصطناعي داخل الذاكرة فقط.");
  const mapSuggested = () => {
    const mappings = suggestedAccountMappings(state.currentOrganizationId);
    setMappingDraft(mappings);
    if (batch) void execute("financial-twin", () => service.applyImportMappings(batch.id, mappings), "تم تطبيق قالب ربط تجريبي قابل للمراجعة.");
  };
  const saveMappings = () => batch && void execute("financial-twin", () => service.applyImportMappings(batch.id, activeMappings), "تم حفظ ربط الحسابات داخل العرض.");

  return <div className="demo-stack twin-workspace">
    <section className="demo-intelligence-hero">
      <div><span>FINANCIAL TWIN / DEMO</span><h2>حوّل مصدرًا خارجيًا إلى Snapshot مالية قابلة للتتبع</h2><p>كل صف هنا اصطناعي. يحتفظ العرض بالبيانات الخام والمطبّعة ونتائج التحقق دون أي اتصال بقاعدة بيانات أو مزود خارجي.</p></div>
      <div className="demo-source-launcher"><label>المصدر التجريبي<select value={sourceType} onChange={event => setSourceType(event.target.value as FinancialSourceType)}>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="demo-primary" type="button" onClick={load}><Database /> تحميل بيانات اصطناعية</button></div>
    </section>

    <ol className="demo-pipeline" aria-label="مراحل التوأم المالي">
      {["المصدر", "ربط الحسابات", "التحقق", "Snapshot", "الضوابط"].map((label, index) => {
        const current = batch ? batch.status === "LOADED" ? 1 : batch.status === "MAPPED" ? 2 : batch.status === "VALIDATED" ? 3 : snapshot ? 4 : 0 : 0;
        return <li key={label} className={index <= current ? "is-active" : ""}><span>{index + 1}</span><strong>{label}</strong></li>;
      })}
    </ol>

    {!batch ? <section className="demo-empty-state"><Database /><h2>ابدأ بمصدر تجريبي آمن</h2><p>لن يُطلب ملف حقيقي أو بيانات اعتماد. سيُنشئ النظام 16 سجلًا اصطناعيًا مترابطًا لاختبار الجودة والضوابط.</p><button className="demo-primary" type="button" onClick={load}>تحميل العينة</button></section> : <>
      <div className="demo-grid-2 demo-align-start">
        <section className="demo-panel"><header><div><h2>ربط الحسابات الخارجية</h2><p>راجع الاقتراحات؛ الحساب غير المربوط يبقى ظاهرًا كاستثناء ولا يُخفى.</p></div><button className="demo-secondary" type="button" onClick={mapSuggested}><Sparkles /> اقتراح آمن</button></header><div className="demo-mapping-grid">{externalAccounts.map(external => <label key={external}><span>{external}</span><select value={activeMappings[external] ?? ""} onChange={event => setMappingDraft(value => ({ ...activeMappings, ...value, [external]: event.target.value }))}><option value="">غير مربوط</option>{state.accounts.filter(item => item.organizationId === state.currentOrganizationId && item.active && item.postingAllowed).map(account => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label>)}</div><div className="demo-panel-actions"><button className="demo-primary" type="button" onClick={saveMappings} disabled={!externalAccounts.length}><Link2 /> حفظ الربط</button><button className="demo-secondary" type="button" disabled={!(["MAPPED", "VALIDATED"] as string[]).includes(batch.status)} onClick={() => void execute("financial-twin", () => service.validateImportBatch(batch.id), "اكتمل التحقق البنيوي والمحاسبي للدفعة.")}><FileSearch /> تحقق من الدفعة</button></div></section>
        <section className="demo-panel"><header><div><h2>ملخص الدفعة</h2><p>{batch.sourceLabel} · Mapping v{batch.mappingVersion}</p></div><span className={`demo-status is-${batch.status.toLowerCase()}`}>{batch.status}</span></header><div className="demo-stat-matrix"><div><span>الصفوف</span><strong>{batchTransactions.length}</strong></div><div><span>صالحة</span><strong>{batch.acceptedRows}</strong></div><div><span>مرفوضة</span><strong>{batch.rejectedRows}</strong></div><div><span>مكررة</span><strong>{batch.duplicateRows}</strong></div></div>{batch.status === "VALIDATED" && <button className="demo-primary demo-wide" type="button" onClick={() => void execute("financial-twin", () => service.confirmImportBatch(batch.id), "تم إنشاء Snapshot مالية غير قابلة للتعديل.")}><CheckCircle2 /> تأكيد وإنشاء Snapshot</button>}{snapshot && snapshot.batchId === batch.id && <div className="demo-snapshot-card"><ShieldCheck /><div><strong>Snapshot v{snapshot.version}</strong><small>{snapshot.validationStatus} · {snapshot.totals.records} سجل · {organization.currency}</small></div><button className="demo-primary" type="button" onClick={() => void execute("controls", () => service.runControlSnapshot(snapshot.id), "اكتمل تشغيل سجل الضوابط الحتمي.")}><Play /> تشغيل الضوابط</button></div>}</section>
      </div>
      <section className="demo-panel"><header><div><h2>خط النسب: Raw → Normalized</h2><p>العينة التالية توضّح مصدر كل قيمة وحالة قبولها.</p></div></header><div className="demo-table-wrap"><table className="demo-table twin-table"><thead><tr><th>صف المصدر</th><th>الحركة</th><th>التاريخ</th><th>الحساب الخارجي</th><th>الحساب الداخلي</th><th>مدين</th><th>دائن</th><th>التحقق</th></tr></thead><tbody>{batchTransactions.slice(0, 16).map(item => { const raw = state.rawFinancialRecords.find(record => record.sourceRecordId === item.sourceRecordId && record.batchId === item.batchId); return <tr key={item.id}><td>#{raw?.rowNumber ?? "—"}</td><td><strong>{item.reference || "مرجع مفقود"}</strong><small>{item.externalTransactionId}</small></td><td>{item.transactionDate}</td><td>{item.externalAccountId}</td><td>{state.accounts.find(account => account.id === item.mappedAccountId)?.code ?? "غير مربوط"}</td><td>{money(item.debitMinor, organization.currency)}</td><td>{money(item.creditMinor, organization.currency)}</td><td><span className={`demo-validation is-${item.validationStatus.toLowerCase()}`}>{item.validationStatus}</span>{item.validationErrors.length > 0 && <small>{item.validationErrors.join(" · ")}</small>}</td></tr>})}</tbody></table></div></section>
    </>}
  </div>;
}

export function DataQualityCenter() {
  const { state } = useDemo();
  const batch = latestOrganizationBatch(state, state.currentOrganizationId);
  const raw = batch ? state.rawFinancialRecords.filter(item => item.batchId === batch.id) : [];
  const transactions = batch ? state.normalizedTransactions.filter(item => item.batchId === batch.id) : [];
  const quality = calculateDataQuality(batch, raw, transactions);
  const dimensions = [["الاكتمال", quality.completenessPercent], ["الصلاحية", quality.validityPercent], ["تغطية الربط", quality.mappingCoveragePercent], ["حداثة المصدر", quality.freshnessPercent]] as const;
  return <div className="demo-stack"><section className="demo-quality-score"><Gauge /><div><span>DATA QUALITY SCORE</span><strong>{quality.scorePercent}%</strong><p>درجة موثقة من أربعة أبعاد متساوية الوزن داخل النموذج التجريبي.</p></div></section><div className="demo-grid-2 demo-align-start"><section className="demo-panel"><header><div><h2>أبعاد الجودة</h2><p>لا تُخفى الصفوف المرفوضة أو المكررة.</p></div></header><div className="demo-quality-bars">{dimensions.map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>)}</div></section><section className="demo-panel"><header><div><h2>قائمة الاستثناءات</h2><p>مؤشرات قابلة للعودة إلى سجلات المصدر.</p></div></header><div className="demo-stat-matrix"><div><span>مكرر</span><strong>{quality.duplicateRecords}</strong></div><div><span>حسابات غير مربوطة</span><strong>{quality.unmappedAccounts}</strong></div><div><span>مرفوض</span><strong>{quality.rejectedRecords}</strong></div><div><span>مرجع مفقود</span><strong>{quality.missingReferences}</strong></div></div><p className="demo-footnote">فرق التسوية للسجلات المقبولة: {money(quality.reconciliationDifferenceMinor)}</p></section></div></div>;
}

export function GuardianControlCenter() {
  const { state, service, execute } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const metrics = guardianMetrics(state, state.currentOrganizationId);
  const findings = state.findings.filter(item => item.organizationId === state.currentOrganizationId);
  const selected = findings.find(item => item.id === state.selectedFindingId) ?? findings[0];
  const rule = state.controlRules.find(item => item.id === selected?.ruleId);
  const correction = state.journals.find(item => item.id === selected?.correctionJournalId);
  const [comment, setComment] = useState("");
  const [assignee, setAssignee] = useState(state.users[1]?.id ?? "");
  if (!findings.length) return <div className="demo-stack"><section className="demo-empty-state"><ShieldCheck /><h2>لا توجد نتائج رقابية بعد</h2><p>أنشئ Snapshot من التوأم المالي ثم شغّل الضوابط الحتمية.</p><button className="demo-primary" type="button" onClick={() => void execute("navigate", () => service.navigate("financial-twin"))}>الانتقال إلى التوأم المالي</button></section></div>;
  return <div className="demo-stack guardian-center">
    <div className="demo-kpi-grid"><Kpi label="الضوابط المنفذة" value={`${metrics.executableControls}/${metrics.totalControls}`} /><Kpi label="ملاحظات مفتوحة" value={String(metrics.openFindings)} /><Kpi label="مبلغ تحت المراجعة" value={money(metrics.amountUnderReviewMinor, organization.currency)} /><Kpi label="تعافٍ متحقق" value={money(metrics.verifiedRecoveryMinor, organization.currency)} /></div>
    <div className="guardian-layout"><section className="demo-panel guardian-list"><header><div><h2>الملاحظات الرقابية</h2><p>الأثر المالي لا يتكرر عند تشابه البصمة.</p></div></header>{findings.map(item => <button key={item.id} type="button" className={selected?.id === item.id ? "is-active" : ""} onClick={() => void service.selectFinding(item.id)}><span className={`severity is-${item.severity.toLowerCase()}`}>{item.severity}</span><strong>{item.ruleId} · {state.controlRules.find(control => control.id === item.ruleId)?.nameAr}</strong><small>{findingStatusLabels[item.status]} · {money(item.amountUnderReviewMinor, item.currency)}</small></button>)}</section>
      {selected && <section className="demo-panel guardian-detail"><header><div><span className={`severity is-${selected.severity.toLowerCase()}`}>{selected.severity}</span><h2>{rule?.nameAr} <small>{rule?.nameEn}</small></h2><p>Rule {selected.ruleId} · Version {selected.ruleVersion} · {findingStatusLabels[selected.status]}</p></div></header><div className="guardian-explanation"><AlertTriangle /><p>{selected.explanation}</p></div><h3>الأدلة</h3><div className="evidence-grid">{selected.evidence.map(evidence => <article key={evidence.id}><FileSearch /><div><strong>{evidence.label}</strong><small>{evidence.kind} · {evidence.referenceId}</small><code>{JSON.stringify(evidence.details)}</code></div></article>)}</div><div className="guardian-actions"><label>تعيين إلى<select value={assignee} onChange={event => setAssignee(event.target.value)}>{state.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><button className="demo-secondary" type="button" onClick={() => void execute("controls", () => service.assignFinding(selected.id, assignee), "تم تعيين الملاحظة.")}><UserCheck /> تعيين</button><button className="demo-secondary" type="button" onClick={() => void execute("controls", () => service.transitionFinding(selected.id, "UNDER_INVESTIGATION", "بدأت مراجعة الأدلة البشرية."), "بدأ التحقيق البشري.")}><ClipboardCheck /> بدء التحقيق</button><button className="demo-primary" type="button" onClick={() => void execute("agents", () => service.runMockAgent(selected.id, agentForRule(selected.ruleId)), "اكتمل تحليل الوكيل المحاكى دون أي اتصال خارجي.")}><Bot /> تحليل Agent محاكى</button></div><div className="guardian-comment"><input value={comment} onChange={event => setComment(event.target.value)} placeholder="تعليق رقابي موثق" /><button className="demo-secondary" type="button" onClick={() => { void execute("controls", () => service.addFindingComment(selected.id, comment), "تم حفظ التعليق."); setComment(""); }}>إضافة تعليق</button></div>{selected.ruleId === "BNK-001" && !correction && <button className="demo-primary" type="button" onClick={() => void execute("controls", () => service.proposeFindingCorrection(selected.id), "تم إنشاء مسودة تصحيح فقط؛ لم تُعتمد أو تُرحّل.")}><Sparkles /> إنشاء اقتراح تصحيح</button>}{correction && <CorrectionWorkflow findingId={selected.id} journalId={correction.id} status={correction.status} role={state.currentRole} />}</section>}
    </div>
  </div>;
}

function CorrectionWorkflow({ findingId, journalId, status, role }: { findingId: string; journalId: string; status: string; role: string }) {
  const { service, execute } = useDemo();
  return <div className="correction-flow"><header><div><strong>مسار التصحيح البشري</strong><small>القيد {journalId} · {status}</small></div><span>الدور الحالي: {role}</span></header><div><button className="demo-secondary" disabled={status !== "DRAFT" && status !== "CORRECTION_REQUESTED"} onClick={() => void execute("accounting", () => service.submitJournal(journalId), "أُرسل التصحيح للاعتماد.")}>1. إرسال</button><button className="demo-secondary" disabled={status !== "PENDING_APPROVAL"} onClick={() => void execute("accounting", () => service.approveJournal(journalId), "اعتمد مستخدم بشري التصحيح.")}>2. اعتماد بشري</button><button className="demo-secondary" disabled={status !== "APPROVED"} onClick={() => void execute("accounting", () => service.postJournal(journalId), "رُحّل التصحيح بعد الاعتماد.")}>3. ترحيل</button><button className="demo-primary" disabled={status !== "POSTED"} onClick={() => void execute("controls", () => service.revalidateFinding(findingId), "اكتملت إعادة التحقق.")}><RefreshCcw /> 4. إعادة تحقق</button></div><p>بدّل الدور من الشريط العلوي: محاسب للإرسال، مدير مالية للاعتماد، ثم محاسب أول للترحيل.</p></div>;
}

export function AgentCenter() {
  const { state, service, execute } = useDemo();
  const runs = state.agentRuns.filter(item => item.organizationId === state.currentOrganizationId);
  const finding = state.findings.find(item => item.id === state.selectedFindingId) ?? state.findings.find(item => item.organizationId === state.currentOrganizationId);
  return <div className="demo-stack"><section className="demo-intelligence-hero agent-hero"><div><span>MOCK AI PROVIDER</span><h2>وكلاء مقيدون بالأدلة والصلاحيات</h2><p>الأدوات تنفذ قراءات محلية فعلية. لا LLM خارجي، لا Tokens، ولا صلاحية اعتماد أو ترحيل.</p></div>{finding && <button className="demo-primary" type="button" onClick={() => void execute("agents", () => service.runMockAgent(finding.id, agentForRule(finding.ruleId)), "اكتمل تشغيل الوكيل المحاكى.")}><Play /> تشغيل على الملاحظة المحددة</button>}</section>{!runs.length ? <section className="demo-empty-state"><Bot /><h2>لا يوجد تشغيل Agent بعد</h2><p>اختر ملاحظة من Guardian وشغّل التحليل المحاكى.</p></section> : runs.map(run => <section className="demo-panel agent-run" key={run.id}><header><div><h2>{run.agentType}</h2><p>{run.id} · {run.durationMs}ms · External tokens: 0</p></div><span className="demo-status is-approved">{run.status}</span></header><p>{run.output}</p><div className="agent-tools">{run.toolCalls.map(call => <article key={call.id}><span className={`demo-validation is-${call.status === "COMPLETED" ? "valid" : "rejected"}`}>{call.status}</span><strong>{call.tool}</strong><small>{call.outputSummary}</small></article>)}</div><ul>{run.limitations.map(item => <li key={item}>{item}</li>)}</ul></section>)}</div>;
}

export function FinancialCloseCenter() {
  const { state } = useDemo();
  const periods = state.financialPeriods.filter(item => item.organizationId === state.currentOrganizationId);
  const pending = state.journals.filter(item => item.organizationId === state.currentOrganizationId && !["POSTED", "REVERSED", "REJECTED"].includes(item.status));
  const closeFindings = state.findings.filter(item => item.organizationId === state.currentOrganizationId && item.ruleId.startsWith("CLS-"));
  return <div className="demo-stack"><div className="demo-grid-3">{periods.map(period => <section className="demo-panel" key={period.id}><header><div><h2>{period.name}</h2><p>{period.startsAt} → {period.endsAt}</p></div><span className={`demo-status ${period.status === "CLOSED" ? "is-approved" : "is-in_review"}`}>{period.status}</span></header><p className="demo-copy">إعادة فتح الفترة المقفلة تتطلب موافقة منفصلة في التكامل الخلفي المستقبلي.</p></section>)}<section className="demo-panel"><header><div><h2>جاهزية الإقفال</h2><p>مقاييس حتمية من حالة القيود والضوابط.</p></div></header><div className="demo-stat-matrix"><div><span>قيود معلقة</span><strong>{pending.length}</strong></div><div><span>ملاحظات إقفال</span><strong>{closeFindings.length}</strong></div></div></section></div></div>;
}

export function ForecastingWorkspace() {
  const { state } = useDemo();
  const scenario = state.forecastScenarios.find(item => item.organizationId === state.currentOrganizationId)!;
  const result = useMemo(() => {
    const cost = Math.round(scenario.expectedSalesMinor * scenario.costOfSalesPercent / 100);
    const operating = scenario.expectedSalesMinor - cost - scenario.operatingExpensesMinor;
    const workingCapitalDelay = Math.round(scenario.expectedSalesMinor / 365 * Math.max(0, scenario.collectionDays - scenario.supplierPaymentDays));
    return { cost, operating, cash: operating - workingCapitalDelay - scenario.futureCapitalExpenditureMinor };
  }, [scenario]);
  return <div className="demo-stack"><section className="demo-intelligence-hero"><div><span>DETERMINISTIC FORECAST</span><h2>{scenario.name}</h2><p>حساب What-if محلي موثق، وليس تنبؤًا مدعومًا بخدمة ذكاء اصطناعي.</p></div></section><div className="demo-kpi-grid"><Kpi label="المبيعات المتوقعة" value={money(scenario.expectedSalesMinor)} /><Kpi label="تكلفة النشاط" value={money(result.cost)} /><Kpi label="ربح التشغيل" value={money(result.operating)} /><Kpi label="الأثر النقدي" value={money(result.cash)} /></div><section className="demo-panel"><header><div><h2>افتراضات السيناريو</h2><p>نسخة العرض تعرض القيم المحسوبة فقط؛ الحفظ التفاعلي ضمن المرحلة التالية.</p></div></header><div className="demo-stat-matrix forecast"><div><span>تكلفة المبيعات</span><strong>{scenario.costOfSalesPercent}%</strong></div><div><span>أيام التحصيل</span><strong>{scenario.collectionDays}</strong></div><div><span>أيام الموردين</span><strong>{scenario.supplierPaymentDays}</strong></div><div><span>إنفاق رأسمالي</span><strong>{money(scenario.futureCapitalExpenditureMinor)}</strong></div></div></section></div>;
}

export function IntegrationHub() {
  const { state } = useDemo();
  return <div className="demo-stack"><section className="demo-callout"><Link2 /><div><strong>لا توجد اتصالات حقيقية</strong><p>هذه بطاقات قدرات وتسليم هندسي فقط؛ جميع بيانات الاعتماد غائبة عمدًا.</p></div></section><div className="integration-grid">{state.integrations.map(item => <article className="demo-panel" key={item.id}><header><div><h2>{item.name}</h2><p>{item.description}</p></div><span className={`demo-status is-${item.status === "DEMO_AVAILABLE" ? "approved" : "in_review"}`}>{item.status}</span></header><dl className="demo-definition"><div><dt>Credential mode</dt><dd>{item.credentialMode}</dd></div><div><dt>Mapping templates</dt><dd>{item.mappingTemplateCount}</dd></div></dl></article>)}</div></div>;
}

export function CommercialValueCenter() {
  const { state } = useDemo();
  const metrics = guardianMetrics(state, state.currentOrganizationId);
  return <div className="demo-stack"><section className="demo-intelligence-hero"><div><span>VALUE PREVIEW — NOT BILLING</span><h2>قيمة قابلة للتفسير وليست ادعاء عائد مالي</h2><p>تعرض الأرقام نشاط المحاكاة فقط. لا أسعار، لا مدفوعات، ولا تقدير وفورات غير قابل للتحقق.</p></div></section><div className="demo-kpi-grid"><Kpi label="سجلات مستوردة" value={String(state.usagePreview.importedTransactions)} /><Kpi label="تنفيذات رقابية" value={String(state.usagePreview.controlExecutions)} /><Kpi label="تشغيلات Agent" value={String(state.usagePreview.agentRuns)} /><Kpi label="تعافٍ موثّق" value={money(metrics.verifiedRecoveryMinor)} /></div></div>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <article className="demo-kpi is-teal"><span><Activity /></span><div><small>{label}</small><strong>{value}</strong></div></article>;
}

function agentForRule(ruleId: string): AgentType {
  if (ruleId.startsWith("BNK-")) return "BANK_AGENT";
  if (ruleId.startsWith("AR-")) return "RECEIVABLES_AGENT";
  if (ruleId.startsWith("EXP-")) return "EXPENSE_AGENT";
  if (ruleId.startsWith("CLS-")) return "FINANCIAL_CLOSE_AGENT";
  return "ACCOUNTING_AGENT";
}
