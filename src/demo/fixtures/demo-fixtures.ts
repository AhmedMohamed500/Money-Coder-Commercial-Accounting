import type { Account, DemoDocument, DemoOrganization, DemoState, JournalEntry, OrganizationId, ReviewCase } from "@/domain/demo/types";

const now = "2026-11-20T10:00:00.000Z";

const organizations: DemoOrganization[] = [
  {
    id: "org-nile",
    legalName: "شركة النيل التجارية التجريبية ش.م.م",
    tradeName: "النيل التجارية — تجريبي",
    industry: "التجارة والتوزيع",
    size: "MEDIUM",
    currency: "EGP",
    fiscalYearStart: "2026-01-01",
    fiscalYearEnd: "2026-12-31",
    commercialRegister: "DEMO-CR-1001",
    taxNumber: "DEMO-TAX-1001",
    bankProfiles: [{ id: "bank-nile", bankName: "بنك تجريبي", accountLabel: "حساب التشغيل — **** 4102", currency: "EGP" }],
    staff: [
      { id: "staff-nile-1", name: "سارة محمود (افتراضي)", role: "مدير المالية", permissions: ["reports:view", "journals:approve", "documents:view"] },
      { id: "staff-nile-2", name: "عمر سمير (افتراضي)", role: "محاسب الشركة", permissions: ["journals:manage", "documents:manage"] },
    ],
  },
  {
    id: "org-delta",
    legalName: "شركة دلتا للصناعات التجريبية ش.م.م",
    tradeName: "دلتا للصناعات — تجريبي",
    industry: "التصنيع",
    size: "LARGE",
    currency: "EGP",
    fiscalYearStart: "2026-07-01",
    fiscalYearEnd: "2027-06-30",
    commercialRegister: "DEMO-CR-2002",
    taxNumber: "DEMO-TAX-2002",
    bankProfiles: [{ id: "bank-delta", bankName: "بنك تجريبي", accountLabel: "حساب المصروفات — **** 9831", currency: "EGP" }],
    staff: [{ id: "staff-delta-1", name: "ليلى حسن (افتراضي)", role: "محاسب أول", permissions: ["journals:manage", "documents:manage", "reports:view"] }],
  },
  {
    id: "org-horizon",
    legalName: "شركة أفق للخدمات التجريبية ش.م.م",
    tradeName: "أفق للخدمات — تجريبي",
    industry: "الخدمات المهنية",
    size: "SMALL",
    currency: "USD",
    fiscalYearStart: "2026-01-01",
    fiscalYearEnd: "2026-12-31",
    commercialRegister: "DEMO-CR-3003",
    taxNumber: "DEMO-TAX-3003",
    bankProfiles: [{ id: "bank-horizon", bankName: "Demo Bank", accountLabel: "Operating — **** 7720", currency: "USD" }],
    staff: [{ id: "staff-horizon-1", name: "مروان عادل (افتراضي)", role: "محاسب", permissions: ["journals:manage", "documents:manage"] }],
  },
];

function accountsFor(organizationId: OrganizationId): Account[] {
  return [
    ["1110", "النقدية والبنوك", "ASSET"],
    ["1120", "العملاء", "ASSET"],
    ["1210", "المخزون", "ASSET"],
    ["2110", "الموردون", "LIABILITY"],
    ["3110", "رأس المال", "EQUITY"],
    ["4110", "إيرادات النشاط", "REVENUE"],
    ["5110", "تكلفة النشاط", "EXPENSE"],
    ["6110", "مصروفات التشغيل", "EXPENSE"],
  ].map(([code, name, type]) => ({ id: `${organizationId}-${code}`, organizationId, code, name, type: type as Account["type"] }));
}

function journal(organizationId: OrganizationId, id: string, reference: string, date: string, memo: string, pairs: Array<[string, number, number]>, source: JournalEntry["source"] = "MANUAL"): JournalEntry {
  return {
    id: `${organizationId}-${id}`,
    organizationId,
    reference,
    date,
    memo,
    status: "POSTED",
    source,
    postedAt: `${date}T09:00:00.000Z`,
    lines: pairs.map(([code, debitMinor, creditMinor], index) => ({ id: `${organizationId}-${id}-line-${index + 1}`, accountId: `${organizationId}-${code}`, description: memo, debitMinor, creditMinor })),
  };
}

function journalsFor(organizationId: OrganizationId, scale: number): JournalEntry[] {
  return [
    journal(organizationId, "opening", "OPEN-2026", "2026-01-01", "أرصدة افتتاحية تجريبية", [["1110", 25_000_000 * scale, 0], ["1120", 8_000_000 * scale, 0], ["1210", 10_000_000 * scale, 0], ["2110", 0, 9_000_000 * scale], ["3110", 0, 34_000_000 * scale]], "OPENING"),
    journal(organizationId, "sale", "JV-0041", "2026-10-04", "مبيعات آجلة تجريبية", [["1120", 12_000_000 * scale, 0], ["4110", 0, 12_000_000 * scale]]),
    journal(organizationId, "collection", "JV-0042", "2026-10-12", "تحصيل من عميل تجريبي", [["1110", 8_000_000 * scale, 0], ["1120", 0, 8_000_000 * scale]]),
    journal(organizationId, "expense", "JV-0043", "2026-10-18", "مصروفات تشغيل تجريبية", [["6110", 2_000_000 * scale, 0], ["1110", 0, 2_000_000 * scale]]),
    journal(organizationId, "cost", "JV-0044", "2026-10-20", "تكلفة نشاط تجريبية", [["5110", 7_000_000 * scale, 0], ["1210", 0, 7_000_000 * scale]]),
  ];
}

const documents: DemoDocument[] = [
  ["doc-nile-bank", "org-nile", "كشف حساب أكتوبر — عينة", "BANK_STATEMENT", "READY_FOR_REVIEW", 0],
  ["doc-nile-invoice", "org-nile", "فاتورة توريد رقم DEMO-18", "INVOICE", "IN_REVIEW", 1_850_000],
  ["doc-delta-contract", "org-delta", "عقد صيانة خط الإنتاج — عينة", "CONTRACT", "CORRECTION_REQUESTED", 4_600_000],
  ["doc-delta-tax", "org-delta", "إقرار ضريبي تجريبي", "TAX", "APPROVED", 0],
  ["doc-horizon-invoice", "org-horizon", "فاتورة خدمات DEMO-07", "INVOICE", "RESUBMITTED", 285_000],
].map(([id, organizationId, title, category, status, amountMinor]) => ({
  id: String(id), organizationId: String(organizationId), title: String(title), category: category as DemoDocument["category"], status: status as DemoDocument["status"], amountMinor: Number(amountMinor), assignedTo: "reviewer-demo", updatedAt: now,
  versions: [{ id: `${id}-v1`, version: 1, createdAt: "2026-11-18T08:30:00.000Z", createdBy: "مستخدم تجريبي", note: "نسخة العرض الأصلية", fileLabel: "sample-document.pdf" }],
}));

function reviewFor(document: DemoDocument, index: number): ReviewCase {
  const assignee = document.organizationId === "org-nile"
    ? "كريم نبيل — مراجع افتراضي"
    : "هبة يوسف — مراجع افتراضي";
  return {
    id: `review-${index + 1}`,
    organizationId: document.organizationId,
    documentId: document.id,
    status: document.status,
    assignedTo: assignee,
    comments: document.status === "CORRECTION_REQUESTED" ? [{ id: `comment-${index}`, author: "هبة يوسف — مراجع افتراضي", body: "يرجى إرفاق الصفحة الأخيرة وتوضيح تاريخ السريان.", createdAt: "2026-11-19T11:20:00.000Z", kind: "CORRECTION" }] : [],
    timeline: [
      { id: `timeline-${index}-1`, label: "إنشاء مستند تجريبي", at: "2026-11-18T08:30:00.000Z", actor: "مستخدم تجريبي" },
      { id: `timeline-${index}-2`, label: "إحالته إلى قائمة المراجعة", at: "2026-11-18T09:00:00.000Z", actor: "نظام العرض" },
    ],
  };
}

export function createDemoFixtures(): DemoState {
  const accounts = organizations.flatMap(organization => accountsFor(organization.id));
  return {
    version: 1,
    currentRole: "OFFICE_OWNER",
    currentOrganizationId: "org-nile",
    currentSection: "overview",
    selectedReviewId: "review-1",
    persistenceEnabled: false,
    organizations,
    office: {
      id: "office-cairo-demo",
      name: "مكتب القاهرة للمراجعة — تجريبي",
      staff: [
        { id: "office-staff-1", name: "أحمد سامي — مدير افتراضي", role: "مالك المكتب", assignedOrganizationIds: organizations.map(item => item.id) },
        { id: "office-staff-2", name: "هبة يوسف — مراجع افتراضي", role: "مراجع", assignedOrganizationIds: ["org-delta", "org-horizon"] },
        { id: "office-staff-3", name: "كريم نبيل — مراجع افتراضي", role: "محاسب مكتب", assignedOrganizationIds: ["org-nile"] },
      ],
      engagements: organizations.map(organization => ({ organizationId: organization.id, status: "ACTIVE", permissions: ["documents:view", "documents:review", "reports:view"] })),
    },
    users: [
      { id: "role-owner", name: "محمود فؤاد — افتراضي", role: "COMPANY_OWNER", title: "مالك شركة" },
      { id: "role-accountant", name: "عمر سمير — افتراضي", role: "COMPANY_ACCOUNTANT", title: "محاسب شركة" },
      { id: "role-office-owner", name: "أحمد سامي — افتراضي", role: "OFFICE_OWNER", title: "مالك مكتب محاسبة" },
      { id: "role-office-accountant", name: "كريم نبيل — افتراضي", role: "OFFICE_ACCOUNTANT", title: "محاسب مكتب" },
      { id: "role-reviewer", name: "هبة يوسف — افتراضي", role: "REVIEWER", title: "مراجع" },
      { id: "role-finance", name: "سارة محمود — افتراضي", role: "FINANCE_MANAGER", title: "مدير مالية" },
    ],
    documents,
    reviews: documents.map(reviewFor),
    accounts,
    journals: [...journalsFor("org-nile", 1), ...journalsFor("org-delta", 2), ...journalsFor("org-horizon", 1)],
    bankRows: [
      { id: "bank-row-1", organizationId: "org-nile", date: "2026-10-27", description: "تحويل وارد — عميل تجريبي", amountMinor: 450_000, direction: "IN", state: "EXTRACTED" },
      { id: "bank-row-2", organizationId: "org-nile", date: "2026-10-28", description: "إيجار مكتب — عينة", amountMinor: 180_000, direction: "OUT", state: "EXTRACTED" },
      { id: "bank-row-3", organizationId: "org-delta", date: "2026-10-29", description: "مورد مواد خام — عينة", amountMinor: 920_000, direction: "OUT", state: "EXTRACTED" },
      { id: "bank-row-4", organizationId: "org-horizon", date: "2026-10-30", description: "تحصيل أتعاب — عينة", amountMinor: 125_000, direction: "IN", state: "EXTRACTED" },
    ],
    notifications: [
      { id: "note-1", organizationId: "org-delta", text: "مستند يحتاج تصحيحًا", read: false, createdAt: now },
      { id: "note-2", organizationId: "org-nile", text: "كشف حساب جاهز للمراجعة", read: false, createdAt: now },
      { id: "note-3", text: "هذا عرض تجريبي ببيانات افتراضية", read: true, createdAt: now },
    ],
    audit: [{ id: "audit-1", action: "DEMO_BASELINE_CREATED", actor: "نظام العرض", at: now }],
  };
}
