import { demoJournalCommandSchema, demoReviewTransitionSchema } from "@/application/demo/contracts";
import { applyMappings, createSnapshot, validateImport } from "@/application/financial-twin/import-engine";
import { runFinancialControls } from "@/application/control-engine/run-controls";
import { assertOpenPeriod, assertPermission, assertPostingAccounts, assertUniqueJournalReference, assertValidJournalLines, canApproveEntry, financialPeriodForDate } from "@/application/accounting/rules";
import { MockAIProvider } from "@/data/adapters/mock-ai/mock-ai-provider";
import type { ProductDemoPort } from "@/data/ports/product-demo-port";
import { createDemoFixtures } from "@/demo/fixtures/demo-fixtures";
import type { AgentType } from "@/domain/agents/types";
import { isBalanced, type DemoRole, type DemoSection, type DemoState, type JournalLine, type LanguageDisplayMode, type OrganizationId, type ReviewStatus } from "@/domain/demo/types";
import type { FindingStatus } from "@/domain/financial-control/types";
import type { FinancialSourceType } from "@/domain/financial-twin/types";
import { createSyntheticImport } from "@/integrations/demo/synthetic-financial-sources";

const STORAGE_KEY = "money-coder-demo-state-v2";
const fixedDemoTime = () => "2026-11-20T12:00:00.000Z";

export class InMemoryDemoAdapter implements ProductDemoPort {
  private state: DemoState;
  private listeners = new Set<() => void>();
  private aiProvider = new MockAIProvider();

  constructor(initialState = createDemoFixtures()) {
    this.state = structuredClone(initialState);
  }

  snapshot = () => this.state;

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit(mutator: (draft: DemoState) => void) {
    const draft = structuredClone(this.state);
    mutator(draft);
    this.state = draft;
    if (draft.persistenceEnabled && typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    this.listeners.forEach(listener => listener());
  }

  async initialize() {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as DemoState;
      if (parsed.version === 2 && parsed.persistenceEnabled) {
        this.state = parsed;
        this.listeners.forEach(listener => listener());
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  async navigate(section: DemoSection) { this.commit(draft => { draft.currentSection = section; }); }
  async switchOrganization(organizationId: OrganizationId) {
    if (!this.state.organizations.some(item => item.id === organizationId)) throw new Error("الشركة التجريبية غير موجودة.");
    this.commit(draft => {
      draft.currentOrganizationId = organizationId;
      draft.selectedReviewId = draft.reviews.find(item => item.organizationId === organizationId)?.id;
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId, action: "DEMO_ORGANIZATION_SWITCHED", actor: "مستخدم العرض", at: fixedDemoTime() });
    });
  }
  async switchRole(role: DemoRole) { this.commit(draft => { draft.currentRole = role; }); }
  async setDisplayMode(mode: LanguageDisplayMode) { this.commit(draft => { draft.displayMode = mode; }); }
  async setPersistence(enabled: boolean) {
    this.commit(draft => { draft.persistenceEnabled = enabled; });
    if (!enabled && typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }
  async reset() {
    const enabled = this.state.persistenceEnabled;
    this.state = createDemoFixtures();
    this.state.persistenceEnabled = enabled;
    if (typeof window !== "undefined") {
      if (enabled) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      else window.localStorage.removeItem(STORAGE_KEY);
    }
    this.listeners.forEach(listener => listener());
  }

  async simulateUpload(input: { title: string; category: "BANK_STATEMENT" | "INVOICE" | "CONTRACT" | "TAX" | "OTHER" }) {
    if (input.title.trim().length < 3) throw new Error("اكتب عنوانًا تجريبيًا من ثلاثة أحرف على الأقل.");
    let createdId = "";
    this.commit(draft => {
      const id = `demo-doc-${draft.documents.length + 1}`;
      createdId = id;
      const reviewId = `demo-review-${draft.reviews.length + 1}`;
      const organizationId = draft.currentOrganizationId;
      draft.documents.unshift({ id, organizationId, title: input.title.trim(), category: input.category, status: "READY_FOR_REVIEW", updatedAt: fixedDemoTime(), versions: [{ id: `${id}-v1`, version: 1, createdAt: fixedDemoTime(), createdBy: "مستخدم العرض", note: "رفع محلي محاكى — لا يوجد ملف حقيقي", fileLabel: "sample-only.pdf" }] });
      draft.reviews.unshift({ id: reviewId, organizationId, documentId: id, status: "READY_FOR_REVIEW", assignedTo: "غير معيّن", comments: [], timeline: [{ id: `${reviewId}-t1`, label: "إنشاء مستند تجريبي محلي", at: fixedDemoTime(), actor: "مستخدم العرض" }] });
      draft.selectedReviewId = reviewId;
      draft.notifications.unshift({ id: crypto.randomUUID(), organizationId, text: "تمت إضافة عينة إلى قائمة المراجعة", read: false, createdAt: fixedDemoTime() });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId, action: "DEMO_DOCUMENT_STAGED", actor: "مستخدم العرض", at: fixedDemoTime() });
    });
    return createdId;
  }

  async openReview(reviewId: string) {
    const review = this.state.reviews.find(item => item.id === reviewId && item.organizationId === this.state.currentOrganizationId);
    if (!review) throw new Error("حالة المراجعة لا تخص الشركة الحالية.");
    this.commit(draft => {
      draft.selectedReviewId = reviewId;
      draft.currentSection = "reviews";
    });
  }

  async assignReview(reviewId: string, assignee: string) {
    this.commit(draft => {
      const review = draft.reviews.find(item => item.id === reviewId && item.organizationId === draft.currentOrganizationId);
      if (!review) throw new Error("حالة المراجعة لا تخص الشركة الحالية.");
      const staffMember = draft.office.staff.find(item => item.name === assignee && item.assignedOrganizationIds.includes(review.organizationId));
      if (!staffMember) throw new Error("المراجع المختار غير مكلّف بهذه الشركة.");
      review.assignedTo = assignee;
      const document = draft.documents.find(item => item.id === review.documentId);
      if (document) document.assignedTo = assignee;
      review.timeline.unshift({ id: crypto.randomUUID(), label: `تعيين إلى ${assignee}`, at: fixedDemoTime(), actor: "مالك المكتب التجريبي" });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: review.organizationId, action: "DEMO_REVIEW_ASSIGNED", actor: "مالك المكتب التجريبي", at: fixedDemoTime() });
    });
  }

  async beginReview(reviewId: string) {
    this.commit(draft => {
      const review = draft.reviews.find(item => item.id === reviewId && item.organizationId === draft.currentOrganizationId);
      if (!review) throw new Error("حالة المراجعة لا تخص الشركة الحالية.");
      if (!review.assignedTo || review.assignedTo === "غير معيّن") throw new Error("عيّن مراجعًا قبل بدء المراجعة.");
      const staffMember = draft.office.staff.find(item => item.name === review.assignedTo && item.assignedOrganizationIds.includes(review.organizationId));
      if (!staffMember) throw new Error("المراجع المعيّن غير مخول لهذه الشركة.");
      if (!(["READY_FOR_REVIEW", "RESUBMITTED"] as ReviewStatus[]).includes(review.status)) throw new Error("لا يمكن بدء المراجعة من الحالة الحالية.");
      review.status = "IN_REVIEW";
      const document = draft.documents.find(item => item.id === review.documentId);
      if (document) document.status = "IN_REVIEW";
      review.timeline.unshift({ id: crypto.randomUUID(), label: "بدء المراجعة البشرية", at: fixedDemoTime(), actor: review.assignedTo });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: review.organizationId, action: "DEMO_REVIEW_STARTED", actor: review.assignedTo, at: fixedDemoTime() });
    });
  }

  async transitionReview(reviewId: string, status: Extract<ReviewStatus, "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED">, comment: string) {
    const command = demoReviewTransitionSchema.parse({ reviewId, status, comment });
    this.commit(draft => {
      const review = draft.reviews.find(item => item.id === command.reviewId && item.organizationId === draft.currentOrganizationId);
      if (!review) throw new Error("حالة المراجعة لا تخص الشركة الحالية.");
      const allowed = review.status === "IN_REVIEW"
        ? ["CORRECTION_REQUESTED", "APPROVED", "REJECTED"]
        : review.status === "CORRECTION_REQUESTED"
          ? ["RESUBMITTED"]
          : [];
      if (!allowed.includes(command.status)) throw new Error("الانتقال المطلوب غير متاح من حالة المراجعة الحالية.");
      const document = draft.documents.find(item => item.id === review.documentId);
      if (!document) throw new Error("المستند التجريبي غير موجود.");
      review.status = command.status;
      document.status = command.status;
      document.updatedAt = fixedDemoTime();
      review.comments.unshift({ id: crypto.randomUUID(), author: "مستخدم العرض", body: command.comment, createdAt: fixedDemoTime(), kind: command.status === "CORRECTION_REQUESTED" ? "CORRECTION" : "DECISION" });
      review.timeline.unshift({ id: crypto.randomUUID(), label: statusLabel(command.status), at: fixedDemoTime(), actor: "مستخدم العرض" });
      if (command.status === "RESUBMITTED") document.versions.push({ id: `${document.id}-v${document.versions.length + 1}`, version: document.versions.length + 1, createdAt: fixedDemoTime(), createdBy: "ممثل الشركة التجريبي", note: command.comment, fileLabel: "corrected-sample.pdf" });
      draft.notifications.unshift({ id: crypto.randomUUID(), organizationId: review.organizationId, text: `${document.title}: ${statusLabel(command.status)}`, read: false, createdAt: fixedDemoTime() });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: review.organizationId, action: `DEMO_REVIEW_${command.status}`, actor: "مستخدم العرض", at: fixedDemoTime() });
    });
  }

  async addReviewComment(reviewId: string, body: string) {
    if (body.trim().length < 2) throw new Error("اكتب تعليقًا واضحًا.");
    this.commit(draft => {
      const review = draft.reviews.find(item => item.id === reviewId && item.organizationId === draft.currentOrganizationId);
      if (!review) throw new Error("حالة المراجعة لا تخص الشركة الحالية.");
      review.comments.unshift({ id: crypto.randomUUID(), author: "مستخدم العرض", body: body.trim(), createdAt: fixedDemoTime(), kind: "COMMENT" });
    });
  }

  async createAndPostJournal(input: { date: string; memo: string; reference: string; lines: JournalLine[] }) {
    const command = demoJournalCommandSchema.parse(input);
    if (!isBalanced(command.lines)) throw new Error("القيد غير متوازن. يجب تساوي إجمالي المدين والدائن.");
    if (command.lines.some(line => !this.state.accounts.some(account => account.id === line.accountId && account.organizationId === this.state.currentOrganizationId))) throw new Error("أحد الحسابات لا يخص الشركة الحالية.");
    if (this.state.journals.some(entry => entry.organizationId === this.state.currentOrganizationId && entry.reference.toLowerCase() === command.reference.toLowerCase())) throw new Error("مرجع القيد مستخدم بالفعل داخل هذه الشركة.");
    const id = `demo-journal-${this.state.journals.length + 1}`;
    this.commit(draft => {
      const period = draft.financialPeriods.find(item => item.organizationId === draft.currentOrganizationId && command.date >= item.startsAt && command.date <= item.endsAt);
      if (!period) throw new Error("لا توجد فترة مالية تغطي تاريخ القيد.");
      draft.journals.unshift({
        id,
        organizationId: draft.currentOrganizationId,
        date: command.date,
        memo: command.memo,
        reference: command.reference,
        lines: command.lines,
        status: "POSTED",
        source: "MANUAL",
        periodId: period.id,
        revision: 1,
        createdAt: fixedDemoTime(),
        createdByRole: draft.currentRole,
        approvedAt: fixedDemoTime(),
        approvedByRole: "FINANCE_MANAGER",
        postedAt: fixedDemoTime(),
      });
      draft.notifications.unshift({ id: crypto.randomUUID(), organizationId: draft.currentOrganizationId, text: `تم ترحيل القيد التجريبي ${command.reference}`, read: false, createdAt: fixedDemoTime() });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: draft.currentOrganizationId, action: "DEMO_JOURNAL_POSTED", actor: "محاسب تجريبي", at: fixedDemoTime() });
    });
    return id;
  }

  async createJournalDraft(input: { date: string; memo: string; reference: string; lines: JournalLine[]; source?: "MANUAL" | "CONTROL_CORRECTION"; correctionFindingId?: string }) {
    const command = demoJournalCommandSchema.parse(input);
    assertPermission(this.state.currentRole, "create");
    assertValidJournalLines(command.lines);
    assertPostingAccounts(this.state, this.state.currentOrganizationId, command.lines);
    assertUniqueJournalReference(this.state, this.state.currentOrganizationId, command.reference);
    const period = financialPeriodForDate(this.state, this.state.currentOrganizationId, command.date);
    const id = `demo-journal-${this.state.journals.length + 1}`;
    this.commit(draft => {
      draft.journals.unshift({
        id,
        organizationId: draft.currentOrganizationId,
        date: command.date,
        memo: command.memo,
        reference: command.reference,
        lines: command.lines,
        status: "DRAFT",
        source: input.source ?? "MANUAL",
        periodId: period.id,
        revision: 1,
        createdAt: fixedDemoTime(),
        createdByRole: draft.currentRole,
        correctionFindingId: input.correctionFindingId,
      });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: draft.currentOrganizationId, action: "DEMO_JOURNAL_DRAFT_CREATED", actor: draft.currentRole, at: fixedDemoTime() });
    });
    return id;
  }

  async submitJournal(journalId: string) {
    assertPermission(this.state.currentRole, "edit");
    this.commit(draft => {
      const entry = currentJournal(draft, journalId);
      if (!["DRAFT", "CORRECTION_REQUESTED"].includes(entry.status)) throw new Error("يمكن إرسال المسودة أو القيد المطلوب تصحيحه فقط.");
      assertValidJournalLines(entry.lines);
      assertPostingAccounts(draft, entry.organizationId, entry.lines);
      assertOpenPeriod(draft, entry.organizationId, entry.date);
      entry.status = "PENDING_APPROVAL";
      entry.submittedAt = fixedDemoTime();
      entry.revision += 1;
      updateLinkedFinding(draft, entry.correctionFindingId, "PENDING_APPROVAL", "تم إرسال قيد التصحيح للاعتماد البشري.");
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: entry.organizationId, action: "DEMO_JOURNAL_SUBMITTED", actor: draft.currentRole, at: fixedDemoTime() });
    });
  }

  async approveJournal(journalId: string) {
    assertPermission(this.state.currentRole, "approve");
    this.commit(draft => {
      const entry = currentJournal(draft, journalId);
      if (entry.status !== "PENDING_APPROVAL") throw new Error("القيد ليس في انتظار الاعتماد.");
      if (!canApproveEntry(entry, draft.currentRole)) throw new Error("فصل المهام يمنع منشئ القيد من اعتماده بنفس الدور.");
      entry.status = "APPROVED";
      entry.approvedAt = fixedDemoTime();
      entry.approvedByRole = draft.currentRole;
      updateLinkedFinding(draft, entry.correctionFindingId, "APPROVED", "اعتمد مستخدم بشري قيد التصحيح.");
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: entry.organizationId, action: "DEMO_JOURNAL_APPROVED", actor: draft.currentRole, at: fixedDemoTime() });
    });
  }

  async requestJournalCorrection(journalId: string, reason: string) {
    if (reason.trim().length < 3) throw new Error("اكتب سبب التصحيح بوضوح.");
    assertPermission(this.state.currentRole, "review");
    this.commit(draft => {
      const entry = currentJournal(draft, journalId);
      if (entry.status !== "PENDING_APPROVAL") throw new Error("يمكن طلب التصحيح من قيد ينتظر الاعتماد فقط.");
      entry.status = "CORRECTION_REQUESTED";
      updateLinkedFinding(draft, entry.correctionFindingId, "CORRECTION_PROPOSED", `أعيد القيد للتصحيح: ${reason.trim()}`);
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: entry.organizationId, action: "DEMO_JOURNAL_CORRECTION_REQUESTED", actor: draft.currentRole, at: fixedDemoTime() });
    });
  }

  async postJournal(journalId: string) {
    assertPermission(this.state.currentRole, "post");
    this.commit(draft => {
      const entry = currentJournal(draft, journalId);
      if (entry.status !== "APPROVED") throw new Error("يجب اعتماد القيد قبل الترحيل.");
      assertValidJournalLines(entry.lines);
      assertPostingAccounts(draft, entry.organizationId, entry.lines);
      assertOpenPeriod(draft, entry.organizationId, entry.date);
      entry.status = "POSTED";
      entry.postedAt = fixedDemoTime();
      updateLinkedFinding(draft, entry.correctionFindingId, "REVALIDATION", "تم ترحيل التصحيح البشري وينتظر إعادة تشغيل القاعدة.");
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: entry.organizationId, action: "DEMO_JOURNAL_POSTED", actor: draft.currentRole, at: fixedDemoTime() });
    });
  }

  async reverseJournal(journalId: string, reason: string) {
    if (reason.trim().length < 3) throw new Error("اكتب سبب العكس بوضوح.");
    assertPermission(this.state.currentRole, "reverse");
    const source = currentJournal(this.state, journalId);
    if (source.status !== "POSTED") throw new Error("يمكن عكس قيد مرحل فقط.");
    const reversalDate = "2026-11-24";
    const period = assertOpenPeriod(this.state, source.organizationId, reversalDate);
    const reversalId = `demo-reversal-${this.state.journals.length + 1}`;
    this.commit(draft => {
      const entry = currentJournal(draft, journalId);
      entry.status = "REVERSED";
      entry.reversedAt = fixedDemoTime();
      entry.reversedById = reversalId;
      draft.journals.unshift({
        id: reversalId,
        organizationId: entry.organizationId,
        reference: `REV-${entry.reference}`,
        date: reversalDate,
        memo: `عكس ${entry.reference}: ${reason.trim()}`,
        status: "POSTED",
        source: "REVERSAL",
        periodId: period.id,
        revision: 1,
        createdAt: fixedDemoTime(),
        createdByRole: draft.currentRole,
        approvedAt: fixedDemoTime(),
        approvedByRole: draft.currentRole,
        postedAt: fixedDemoTime(),
        reversalOfId: entry.id,
        lines: entry.lines.map((line, index) => ({ ...line, id: `${reversalId}-line-${index + 1}`, debitMinor: line.creditMinor, creditMinor: line.debitMinor })),
      });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: entry.organizationId, action: "DEMO_JOURNAL_REVERSED", actor: draft.currentRole, at: fixedDemoTime() });
    });
    return reversalId;
  }

  async createBankSuggestion(rowId: string, accountId: string) {
    this.commit(draft => {
      const row = draft.bankRows.find(item => item.id === rowId && item.organizationId === draft.currentOrganizationId);
      if (!row) throw new Error("حركة البنك غير موجودة لهذه الشركة.");
      const mappedAccount = draft.accounts.find(account => account.id === accountId && account.organizationId === draft.currentOrganizationId);
      if (!mappedAccount) throw new Error("الحساب المختار لا يخص الشركة الحالية.");
      if (mappedAccount.code === "1110") throw new Error("اختر حساب الطرف المقابل؛ حساب البنك يُضاف تلقائيًا.");
      row.mappedAccountId = accountId;
      row.state = "SUGGESTED";
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: row.organizationId, action: "DEMO_BANK_ROW_MAPPED", actor: "مستخدم العرض", at: fixedDemoTime() });
    });
  }

  async createBankDraft(rowId: string) {
    const existing = this.state.journals.find(entry => entry.source === "BANK_DEMO" && entry.reference === `BANK-${rowId}`);
    if (existing) return existing.id;
    let createdId = "";
    this.commit(draft => {
      const row = draft.bankRows.find(item => item.id === rowId && item.organizationId === draft.currentOrganizationId);
      if (!row || row.state !== "SUGGESTED" || !row.mappedAccountId) throw new Error("اربط حركة البنك بحساب قبل إنشاء القيد المقترح.");
      const bankAccount = draft.accounts.find(account => account.organizationId === row.organizationId && account.code === "1110");
      if (!bankAccount) throw new Error("حساب البنك التجريبي غير موجود.");
      const period = draft.financialPeriods.find(item => item.organizationId === row.organizationId && row.date >= item.startsAt && row.date <= item.endsAt);
      if (!period) throw new Error("لا توجد فترة مالية تغطي تاريخ الحركة البنكية.");
      createdId = `demo-bank-journal-${draft.journals.length + 1}`;
      const incoming = row.direction === "IN";
      draft.journals.unshift({
        id: createdId,
        organizationId: row.organizationId,
        reference: `BANK-${row.id}`,
        date: row.date,
        memo: `اقتراح بشري من كشف البنك: ${row.description}`,
        status: "DRAFT",
        source: "BANK_DEMO",
        periodId: period.id,
        revision: 1,
        createdAt: fixedDemoTime(),
        createdByRole: draft.currentRole,
        lines: [
          { id: `${createdId}-1`, accountId: incoming ? bankAccount.id : row.mappedAccountId, description: row.description, debitMinor: row.amountMinor, creditMinor: 0 },
          { id: `${createdId}-2`, accountId: incoming ? row.mappedAccountId : bankAccount.id, description: row.description, debitMinor: 0, creditMinor: row.amountMinor },
        ],
      });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: row.organizationId, action: "DEMO_BANK_DRAFT_CREATED", actor: "مستخدم العرض", at: fixedDemoTime() });
    });
    return createdId;
  }

  async postDraftJournal(journalId: string) {
    this.commit(draft => {
      const entry = draft.journals.find(item => item.id === journalId && item.organizationId === draft.currentOrganizationId);
      if (!entry) throw new Error("القيد التجريبي غير موجود لهذه الشركة.");
      if (entry.status === "POSTED") throw new Error("تم ترحيل هذا القيد بالفعل؛ لن يتم تكراره.");
      if (entry.status !== "DRAFT" || !isBalanced(entry.lines)) throw new Error("لا يمكن ترحيل القيد قبل مراجعته وتوازنه.");
      entry.status = "POSTED";
      entry.approvedAt = fixedDemoTime();
      entry.approvedByRole = draft.currentRole;
      entry.postedAt = fixedDemoTime();
      draft.notifications.unshift({ id: crypto.randomUUID(), organizationId: entry.organizationId, text: `تم ترحيل اقتراح البنك ${entry.reference} بعد المراجعة`, read: false, createdAt: fixedDemoTime() });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: entry.organizationId, action: "DEMO_BANK_DRAFT_POSTED", actor: "مراجع بشري تجريبي", at: fixedDemoTime() });
    });
  }

  async loadSyntheticImport(sourceType: FinancialSourceType) {
    const organization = this.state.organizations.find(item => item.id === this.state.currentOrganizationId);
    if (!organization) throw new Error("الشركة التجريبية غير موجودة.");
    const sequence = this.state.importBatches.filter(item => item.organizationId === organization.id).length + 1;
    const generated = createSyntheticImport(organization, sourceType, sequence);
    this.commit(draft => {
      draft.importBatches.unshift(generated.batch);
      draft.rawFinancialRecords.push(...generated.rawRecords);
      draft.normalizedTransactions.push(...generated.normalizedTransactions);
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: organization.id, action: "DEMO_SYNTHETIC_IMPORT_LOADED", actor: draft.currentRole, at: fixedDemoTime() });
    });
    return generated.batch.id;
  }

  async applyImportMappings(batchId: string, mappings: Record<string, string>) {
    const batch = currentBatch(this.state, batchId);
    Object.values(mappings).forEach(accountId => {
      const account = this.state.accounts.find(item => item.id === accountId && item.organizationId === batch.organizationId);
      if (!account || !account.active || !account.postingAllowed) throw new Error("أحد حسابات الربط غير صالح للترحيل في الشركة الحالية.");
    });
    this.commit(draft => {
      const target = currentBatch(draft, batchId);
      const sourceTransactions = draft.normalizedTransactions.filter(item => item.batchId === target.id);
      const mapped = applyMappings(sourceTransactions, mappings);
      const mappedById = new Map(mapped.map(item => [item.id, item]));
      draft.normalizedTransactions = draft.normalizedTransactions.map(item => mappedById.get(item.id) ?? item);
      target.accountMappings = { ...mappings };
      target.mappingVersion += 1;
      target.status = "MAPPED";
      target.errorReport = [];
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: target.organizationId, action: "DEMO_IMPORT_MAPPED", actor: draft.currentRole, at: fixedDemoTime() });
    });
  }

  async validateImportBatch(batchId: string) {
    const batch = currentBatch(this.state, batchId);
    if (!["MAPPED", "VALIDATED"].includes(batch.status)) throw new Error("طبّق ربط الحسابات قبل التحقق من الدفعة.");
    const raw = this.state.rawFinancialRecords.filter(item => item.batchId === batchId);
    const transactions = this.state.normalizedTransactions.filter(item => item.batchId === batchId);
    const validated = validateImport(batch, raw, transactions, this.state);
    this.commit(draft => {
      const batchIndex = draft.importBatches.findIndex(item => item.id === batchId);
      draft.importBatches[batchIndex] = validated.batch;
      const byId = new Map(validated.transactions.map(item => [item.id, item]));
      draft.normalizedTransactions = draft.normalizedTransactions.map(item => byId.get(item.id) ?? item);
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: batch.organizationId, action: "DEMO_IMPORT_VALIDATED", actor: draft.currentRole, at: fixedDemoTime() });
    });
  }

  async confirmImportBatch(batchId: string) {
    const batch = currentBatch(this.state, batchId);
    const transactions = this.state.normalizedTransactions.filter(item => item.batchId === batchId);
    const snapshot = createSnapshot(this.state, batch, transactions);
    this.commit(draft => {
      const target = currentBatch(draft, batchId);
      target.status = "CONFIRMED";
      draft.financialSnapshots.unshift(snapshot);
      draft.usagePreview.importedTransactions += snapshot.totals.records;
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: target.organizationId, action: "DEMO_FINANCIAL_SNAPSHOT_CONFIRMED", actor: draft.currentRole, at: fixedDemoTime() });
    });
    return snapshot.id;
  }

  async rollbackImportBatch(batchId: string, reason: string) {
    if (reason.trim().length < 3) throw new Error("اكتب سبب الرجوع بوضوح.");
    this.commit(draft => {
      const batch = currentBatch(draft, batchId);
      if (batch.status !== "CONFIRMED") throw new Error("يمكن الرجوع عن دفعة مؤكدة فقط.");
      batch.status = "ROLLED_BACK";
      batch.rollbackReason = reason.trim();
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: batch.organizationId, action: "DEMO_IMPORT_ROLLED_BACK", actor: draft.currentRole, at: fixedDemoTime() });
    });
  }

  async runControlSnapshot(snapshotId: string) {
    const snapshot = this.state.financialSnapshots.find(item => item.id === snapshotId && item.organizationId === this.state.currentOrganizationId);
    if (!snapshot) throw new Error("Snapshot لا تخص الشركة الحالية.");
    const batch = this.state.importBatches.find(item => item.id === snapshot.batchId);
    if (!batch || batch.status === "ROLLED_BACK") throw new Error("لا يمكن تشغيل الضوابط على دفعة تم الرجوع عنها.");
    const output = runFinancialControls(this.state, snapshot, this.state.findings);
    this.commit(draft => {
      draft.controlRuns.unshift(output.run);
      mergeFindings(draft, output.findings);
      draft.selectedFindingId = output.findings[0]?.id;
      draft.usagePreview.controlExecutions += output.run.results.length;
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: snapshot.organizationId, action: "DEMO_CONTROLS_EXECUTED", actor: "Financial Control Engine — Simulation", at: fixedDemoTime() });
    });
    return output.run.id;
  }

  async selectFinding(findingId: string) {
    currentFinding(this.state, findingId);
    this.commit(draft => { draft.selectedFindingId = findingId; });
  }

  async assignFinding(findingId: string, userId: string) {
    const user = this.state.users.find(item => item.id === userId);
    if (!user) throw new Error("المستخدم التجريبي غير موجود.");
    this.commit(draft => {
      const finding = currentFinding(draft, findingId);
      finding.assignedUserId = user.id;
      finding.assignedUserName = user.name;
      transitionFindingRecord(finding, "ASSIGNED", draft.currentRole, `تم التعيين إلى ${user.name}.`);
    });
  }

  async transitionFinding(findingId: string, status: Extract<FindingStatus, "UNDER_INVESTIGATION" | "FALSE_POSITIVE" | "RISK_ACCEPTED" | "ESCALATED">, reason: string) {
    if (reason.trim().length < 3) throw new Error("اكتب سبب القرار بوضوح.");
    this.commit(draft => {
      const finding = currentFinding(draft, findingId);
      transitionFindingRecord(finding, status, draft.currentRole, reason.trim());
    });
  }

  async addFindingComment(findingId: string, body: string) {
    if (body.trim().length < 2) throw new Error("اكتب تعليقًا واضحًا.");
    this.commit(draft => {
      const finding = currentFinding(draft, findingId);
      finding.comments.unshift({ id: crypto.randomUUID(), author: draft.currentRole, body: body.trim(), at: fixedDemoTime() });
    });
  }

  async runMockAgent(findingId: string, agentType: AgentType) {
    const finding = currentFinding(this.state, findingId);
    const response = await this.aiProvider.analyzeFinding({ state: this.state, organizationId: this.state.currentOrganizationId, findingId, agentType });
    const id = `agent-run-${this.state.agentRuns.length + 1}`;
    this.commit(draft => {
      draft.agentRuns.unshift({ id, organizationId: finding.organizationId, findingId, agentType, status: "COMPLETED", startedAt: fixedDemoTime(), completedAt: fixedDemoTime(), durationMs: response.toolCalls.reduce((sum, item) => sum + item.durationMs, 0), toolCalls: response.toolCalls, output: response.output, evidenceReferences: response.evidenceReferences, limitations: response.limitations, usagePreview: { operations: response.toolCalls.length, externalTokens: 0, estimatedCost: "0.00" } });
      draft.usagePreview.agentRuns += 1;
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: finding.organizationId, action: "DEMO_MOCK_AGENT_COMPLETED", actor: `${agentType} — Simulation`, at: fixedDemoTime() });
    });
    return id;
  }

  async proposeFindingCorrection(findingId: string) {
    const finding = currentFinding(this.state, findingId);
    const related = this.state.normalizedTransactions.filter(item => finding.relatedTransactionIds.includes(item.id));
    if (related.length < 2 || related.some(item => !item.mappedAccountId)) throw new Error("لا تتوفر أسطر مربوطة كافية لإنشاء تصحيح متوازن.");
    const debit = related.reduce((sum, item) => sum + item.debitMinor, 0);
    const credit = related.reduce((sum, item) => sum + item.creditMinor, 0);
    if (debit !== credit || debit <= 0) throw new Error("الملاحظة لا تحتوي على مجموعة متوازنة صالحة كاقتراح تصحيح.");
    const reference = `CTRL-${related[0].reference}`;
    assertUniqueJournalReference(this.state, finding.organizationId, reference);
    const period = assertOpenPeriod(this.state, finding.organizationId, related[0].transactionDate);
    const id = `demo-control-journal-${this.state.journals.length + 1}`;
    this.commit(draft => {
      draft.journals.unshift({ id, organizationId: finding.organizationId, reference, date: related[0].transactionDate, memo: `تصحيح مقترح للملاحظة ${finding.ruleId} — يحتاج مراجعة بشرية`, status: "DRAFT", source: "CONTROL_CORRECTION", periodId: period.id, revision: 1, createdAt: fixedDemoTime(), createdByRole: "AI_SIMULATION", correctionFindingId: finding.id, sourceDocumentId: finding.relatedDocumentIds[0], lines: related.map((item, index) => ({ id: `${id}-line-${index + 1}`, accountId: item.mappedAccountId!, description: item.description, debitMinor: item.debitMinor, creditMinor: item.creditMinor })) });
      const target = currentFinding(draft, findingId);
      target.correctionJournalId = id;
      transitionFindingRecord(target, "CORRECTION_PROPOSED", "AI_SIMULATION", "أنشأ النظام اقتراح قيد فقط؛ لم يعتمد أو يرحّل القيد.");
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: finding.organizationId, action: "DEMO_CORRECTION_PROPOSED", actor: "AI_SIMULATION", at: fixedDemoTime() });
    });
    return id;
  }

  async revalidateFinding(findingId: string) {
    const finding = currentFinding(this.state, findingId);
    if (finding.status !== "REVALIDATION") throw new Error("يجب ترحيل التصحيح قبل إعادة التحقق.");
    const snapshot = this.state.financialSnapshots.find(item => item.id === finding.snapshotId && item.organizationId === finding.organizationId);
    if (!snapshot) throw new Error("Snapshot المرتبطة غير موجودة.");
    const output = runFinancialControls(this.state, snapshot, this.state.findings);
    const repeated = output.findings.some(item => item.ruleId === finding.ruleId && item.duplicateFingerprint === finding.duplicateFingerprint);
    this.commit(draft => {
      draft.controlRuns.unshift(output.run);
      mergeFindings(draft, output.findings.filter(item => item.id !== finding.id));
      const target = currentFinding(draft, findingId);
      target.revalidationResult = repeated ? "FINDING" : "PASSED";
      target.resolutionReason = repeated ? "ما زالت القاعدة تكتشف نفس البصمة بعد التصحيح." : "لم تعد القاعدة تكتشف المخالفة بعد الترحيل وإعادة التحقق.";
      transitionFindingRecord(target, repeated ? "REOPENED" : "RESOLVED", "Financial Control Engine — Simulation", target.resolutionReason);
      draft.usagePreview.controlExecutions += output.run.results.length;
    });
  }

  async saveCompanyProfile(input: { tradeName: string; industry: string; currency: "EGP" | "USD" }) {
    if (input.tradeName.trim().length < 3) throw new Error("اكتب اسمًا تجاريًا من ثلاثة أحرف على الأقل.");
    if (input.industry.trim().length < 3) throw new Error("اكتب نشاطًا واضحًا من ثلاثة أحرف على الأقل.");
    if (!(["EGP", "USD"] as const).includes(input.currency)) throw new Error("العملة المختارة غير مدعومة في العرض.");
    this.commit(draft => {
      const organization = draft.organizations.find(item => item.id === draft.currentOrganizationId);
      if (!organization) throw new Error("الشركة غير موجودة.");
      organization.tradeName = input.tradeName.trim();
      organization.industry = input.industry.trim();
      organization.currency = input.currency;
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: organization.id, action: "DEMO_COMPANY_PROFILE_UPDATED", actor: "مستخدم العرض", at: fixedDemoTime() });
    });
  }

}

function currentJournal(state: DemoState, journalId: string) {
  const entry = state.journals.find(item => item.id === journalId && item.organizationId === state.currentOrganizationId);
  if (!entry) throw new Error("القيد التجريبي غير موجود لهذه الشركة.");
  return entry;
}

function currentBatch(state: DemoState, batchId: string) {
  const batch = state.importBatches.find(item => item.id === batchId && item.organizationId === state.currentOrganizationId);
  if (!batch) throw new Error("دفعة الاستيراد لا تخص الشركة الحالية.");
  if (batch.status === "ROLLED_BACK") throw new Error("تم الرجوع عن دفعة الاستيراد.");
  return batch;
}

function currentFinding(state: DemoState, findingId: string) {
  const finding = state.findings.find(item => item.id === findingId && item.organizationId === state.currentOrganizationId);
  if (!finding) throw new Error("الملاحظة الرقابية لا تخص الشركة الحالية.");
  return finding;
}

function transitionFindingRecord(finding: DemoState["findings"][number], status: FindingStatus, actor: string, reason: string) {
  const previous = finding.status;
  finding.status = status;
  finding.lastCheckedAt = fixedDemoTime();
  finding.history.unshift({ id: crypto.randomUUID(), at: fixedDemoTime(), actor, fromStatus: previous, toStatus: status, reason });
}

function updateLinkedFinding(state: DemoState, findingId: string | undefined, status: FindingStatus, reason: string) {
  if (!findingId) return;
  const finding = state.findings.find(item => item.id === findingId);
  if (finding) transitionFindingRecord(finding, status, state.currentRole, reason);
}

function mergeFindings(state: DemoState, incoming: DemoState["findings"]) {
  const incomingById = new Map(incoming.map(item => [item.id, item]));
  state.findings = [...incoming, ...state.findings.filter(item => !incomingById.has(item.id))];
}

function statusLabel(status: ReviewStatus) {
  return ({ READY_FOR_REVIEW: "جاهز للمراجعة", IN_REVIEW: "قيد المراجعة", CORRECTION_REQUESTED: "طُلب تصحيح", RESUBMITTED: "أعيد التقديم", APPROVED: "تم الاعتماد", REJECTED: "مرفوض" } as const)[status];
}
