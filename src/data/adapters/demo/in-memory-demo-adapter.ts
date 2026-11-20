import { demoJournalCommandSchema, demoReviewTransitionSchema } from "@/application/demo/contracts";
import { buildDemoReport } from "@/application/demo/reporting";
import type { ProductDemoPort } from "@/data/ports/product-demo-port";
import { createDemoFixtures } from "@/demo/fixtures/demo-fixtures";
import { isBalanced, type DemoReport, type DemoRole, type DemoSection, type DemoState, type JournalLine, type OrganizationId, type ReviewStatus } from "@/domain/demo/types";

const STORAGE_KEY = "money-coder-demo-state-v1";
const fixedDemoTime = () => "2026-11-20T12:00:00.000Z";

export class InMemoryDemoAdapter implements ProductDemoPort {
  private state: DemoState;
  private listeners = new Set<() => void>();

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

  hydrateFromBrowser() {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as DemoState;
      if (parsed.version === 1 && parsed.persistenceEnabled) {
        this.state = parsed;
        this.listeners.forEach(listener => listener());
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  navigate(section: DemoSection) { this.commit(draft => { draft.currentSection = section; }); }
  switchOrganization(organizationId: OrganizationId) {
    if (!this.state.organizations.some(item => item.id === organizationId)) throw new Error("الشركة التجريبية غير موجودة.");
    this.commit(draft => { draft.currentOrganizationId = organizationId; draft.audit.unshift({ id: crypto.randomUUID(), organizationId, action: "DEMO_ORGANIZATION_SWITCHED", actor: "مستخدم العرض", at: fixedDemoTime() }); });
  }
  switchRole(role: DemoRole) { this.commit(draft => { draft.currentRole = role; }); }
  setPersistence(enabled: boolean) {
    this.commit(draft => { draft.persistenceEnabled = enabled; });
    if (!enabled && typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }
  reset() {
    const enabled = this.state.persistenceEnabled;
    this.state = createDemoFixtures();
    this.state.persistenceEnabled = enabled;
    if (typeof window !== "undefined") {
      if (enabled) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      else window.localStorage.removeItem(STORAGE_KEY);
    }
    this.listeners.forEach(listener => listener());
  }

  simulateUpload(input: { title: string; category: "BANK_STATEMENT" | "INVOICE" | "CONTRACT" | "TAX" | "OTHER" }) {
    this.commit(draft => {
      const id = `demo-doc-${draft.documents.length + 1}`;
      const reviewId = `demo-review-${draft.reviews.length + 1}`;
      const organizationId = draft.currentOrganizationId;
      draft.documents.unshift({ id, organizationId, title: input.title, category: input.category, status: "READY_FOR_REVIEW", updatedAt: fixedDemoTime(), versions: [{ id: `${id}-v1`, version: 1, createdAt: fixedDemoTime(), createdBy: "مستخدم العرض", note: "رفع محلي محاكى — لم يغادر أي ملف الجهاز", fileLabel: "sample-only.pdf" }] });
      draft.reviews.unshift({ id: reviewId, organizationId, documentId: id, status: "READY_FOR_REVIEW", assignedTo: "غير معيّن", comments: [], timeline: [{ id: `${reviewId}-t1`, label: "إنشاء مستند تجريبي محلي", at: fixedDemoTime(), actor: "مستخدم العرض" }] });
      draft.notifications.unshift({ id: crypto.randomUUID(), organizationId, text: "تمت إضافة عينة إلى قائمة المراجعة", read: false, createdAt: fixedDemoTime() });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId, action: "DEMO_DOCUMENT_STAGED", actor: "مستخدم العرض", at: fixedDemoTime() });
    });
  }

  assignReview(reviewId: string, assignee: string) {
    this.commit(draft => {
      const review = draft.reviews.find(item => item.id === reviewId);
      if (!review) throw new Error("حالة المراجعة غير موجودة.");
      review.assignedTo = assignee;
      review.status = review.status === "READY_FOR_REVIEW" ? "IN_REVIEW" : review.status;
      const document = draft.documents.find(item => item.id === review.documentId);
      if (document) { document.assignedTo = assignee; document.status = review.status; }
      review.timeline.unshift({ id: crypto.randomUUID(), label: `تعيين إلى ${assignee}`, at: fixedDemoTime(), actor: "مالك المكتب التجريبي" });
    });
  }

  transitionReview(reviewId: string, status: Extract<ReviewStatus, "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED">, comment: string) {
    const command = demoReviewTransitionSchema.parse({ reviewId, status, comment });
    this.commit(draft => {
      const review = draft.reviews.find(item => item.id === command.reviewId);
      if (!review) throw new Error("حالة المراجعة غير موجودة.");
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

  addReviewComment(reviewId: string, body: string) {
    if (body.trim().length < 2) throw new Error("اكتب تعليقًا واضحًا.");
    this.commit(draft => {
      const review = draft.reviews.find(item => item.id === reviewId);
      if (!review) throw new Error("حالة المراجعة غير موجودة.");
      review.comments.unshift({ id: crypto.randomUUID(), author: "مستخدم العرض", body: body.trim(), createdAt: fixedDemoTime(), kind: "COMMENT" });
    });
  }

  createAndPostJournal(input: { date: string; memo: string; reference: string; lines: JournalLine[] }) {
    const command = demoJournalCommandSchema.parse(input);
    if (!isBalanced(command.lines)) throw new Error("القيد غير متوازن. يجب تساوي إجمالي المدين والدائن.");
    const id = `demo-journal-${this.state.journals.length + 1}`;
    this.commit(draft => {
      draft.journals.unshift({ id, organizationId: draft.currentOrganizationId, date: command.date, memo: command.memo, reference: command.reference, lines: command.lines, status: "POSTED", source: "MANUAL", postedAt: fixedDemoTime() });
      draft.notifications.unshift({ id: crypto.randomUUID(), organizationId: draft.currentOrganizationId, text: `تم ترحيل القيد التجريبي ${command.reference}`, read: false, createdAt: fixedDemoTime() });
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: draft.currentOrganizationId, action: "DEMO_JOURNAL_POSTED", actor: "محاسب تجريبي", at: fixedDemoTime() });
    });
    return id;
  }

  createBankSuggestion(rowId: string, accountId: string) {
    this.commit(draft => {
      const row = draft.bankRows.find(item => item.id === rowId && item.organizationId === draft.currentOrganizationId);
      if (!row) throw new Error("حركة البنك غير موجودة لهذه الشركة.");
      if (!draft.accounts.some(account => account.id === accountId && account.organizationId === draft.currentOrganizationId)) throw new Error("الحساب المختار لا يخص الشركة الحالية.");
      row.mappedAccountId = accountId;
      row.state = "SUGGESTED";
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: row.organizationId, action: "DEMO_BANK_ROW_MAPPED", actor: "مستخدم العرض", at: fixedDemoTime() });
    });
  }

  saveCompanyProfile(input: { tradeName: string; industry: string; currency: "EGP" | "USD" }) {
    this.commit(draft => {
      const organization = draft.organizations.find(item => item.id === draft.currentOrganizationId);
      if (!organization) throw new Error("الشركة غير موجودة.");
      organization.tradeName = input.tradeName.trim() || organization.tradeName;
      organization.industry = input.industry.trim() || organization.industry;
      organization.currency = input.currency;
      draft.audit.unshift({ id: crypto.randomUUID(), organizationId: organization.id, action: "DEMO_COMPANY_PROFILE_UPDATED", actor: "مستخدم العرض", at: fixedDemoTime() });
    });
  }

  report(organizationId = this.state.currentOrganizationId): DemoReport { return buildDemoReport(this.state, organizationId); }
}

function statusLabel(status: ReviewStatus) {
  return ({ READY_FOR_REVIEW: "جاهز للمراجعة", IN_REVIEW: "قيد المراجعة", CORRECTION_REQUESTED: "طُلب تصحيح", RESUBMITTED: "أعيد التقديم", APPROVED: "تم الاعتماد", REJECTED: "مرفوض" } as const)[status];
}
