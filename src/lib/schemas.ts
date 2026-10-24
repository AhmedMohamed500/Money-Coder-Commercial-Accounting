import { z } from "zod";

const nullableOptionalText = (schema: z.ZodString) => z
  .union([schema, z.literal(""), z.null()])
  .optional()
  .transform((value) => value === "" ? null : value);

const nullableOptionalDate = z
  .union([z.coerce.date(), z.literal(""), z.null()])
  .optional()
  .transform((value) => value === "" ? null : value);

const contactTypeSchema = z.enum(["FINANCE_MANAGER", "ACCOUNTING_CONTACT", "LEGAL_REPRESENTATIVE", "GENERAL"]);
const contactUpdateSchema = z.union([
  z.object({ type: contactTypeSchema, remove: z.literal(true) }),
  z.object({
    type: contactTypeSchema,
    name: z.string().trim().min(2).max(150),
    title: nullableOptionalText(z.string().trim().max(150)),
    email: nullableOptionalText(z.string().trim().email()),
    phone: nullableOptionalText(z.string().trim().max(30)),
  }),
]);

export const emailSchema = z.string().trim().toLowerCase().email("البريد الإلكتروني غير صالح").max(254);
export const passwordSchema = z.string().min(10, "كلمة المرور يجب أن تكون 10 أحرف على الأقل").max(128)
  .regex(/[a-z]/, "أضف حرفًا صغيرًا").regex(/[A-Z]/, "أضف حرفًا كبيرًا").regex(/[0-9]/, "أضف رقمًا");

export const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  organizationType: z.enum(["ACCOUNTING_OFFICE", "COMMERCIAL_COMPANY"]),
  legalName: z.string().trim().min(2).max(200),
  tradeName: z.string().trim().max(200).optional(),
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });

export const organizationUpdateSchema = z.object({
  legalName: z.string().trim().min(2).max(200).optional(),
  tradeName: nullableOptionalText(z.string().trim().max(200)),
  englishName: nullableOptionalText(z.string().trim().max(200)),
  onboardingStatus: z.enum(["DRAFT", "COMPLETE"]).optional(),
  profile: z.object({
    responsiblePerson: nullableOptionalText(z.string().trim().max(150)),
    businessActivity: nullableOptionalText(z.string().trim().max(200)),
    legalEntityType: nullableOptionalText(z.string().trim().max(100)),
    activityStartDate: nullableOptionalDate,
    website: nullableOptionalText(z.string().trim().url()),
    phone: nullableOptionalText(z.string().trim().max(30)),
    publicEmail: nullableOptionalText(z.string().trim().email()),
  }).optional(),
  legal: z.object({
    commercialRegisterNo: nullableOptionalText(z.string().trim().max(100)),
    registrationAuthority: nullableOptionalText(z.string().trim().max(200)),
    taxRegistrationNo: nullableOptionalText(z.string().trim().max(100)),
    taxOffice: nullableOptionalText(z.string().trim().max(200)),
    vatRegistered: z.boolean().optional(),
    taxCardNumber: nullableOptionalText(z.string().trim().max(100)),
    legalRepresentative: nullableOptionalText(z.string().trim().max(150)),
  }).optional(),
  address: z.object({
    countryCode: z.string().trim().length(2),
    governorate: nullableOptionalText(z.string().trim().max(100)),
    city: nullableOptionalText(z.string().trim().max(100)),
    addressLine: z.string().trim().min(3).max(500),
    postalCode: nullableOptionalText(z.string().trim().max(20)),
  }).optional(),
  contacts: z.array(contactUpdateSchema).max(10).superRefine((contacts, context) => {
    const seen = new Set<string>();
    contacts.forEach((contact, index) => {
      if (seen.has(contact.type)) context.addIssue({ code: "custom", message: "لا يمكن تكرار نوع جهة الاتصال في الطلب نفسه.", path: [index, "type"] });
      seen.add(contact.type);
    });
  }).optional(),
  accounting: z.object({
    baseCurrency: z.string().trim().length(3),
    fiscalYearStartMonth: z.number().int().min(1).max(12),
    fiscalYearStartDay: z.number().int().min(1).max(31),
    fiscalYearEndMonth: z.number().int().min(1).max(12),
    fiscalYearEndDay: z.number().int().min(1).max(31),
    openingBalanceDate: z.coerce.date().nullable().optional(),
    inventoryMethod: z.enum(["PERIODIC", "PERPETUAL"]),
  }).optional(),
  fiscalYear: z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(80),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  }).refine((value) => value.endsAt > value.startsAt, {
    message: "نهاية السنة المالية يجب أن تكون بعد بدايتها.",
    path: ["endsAt"],
  }).optional(),
});

export const membershipActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CHANGE_ROLE"), role: z.enum(["OFFICE_MANAGER", "OFFICE_ACCOUNTANT", "COMPANY_MANAGER", "COMPANY_ACCOUNTANT", "REVIEWER", "VIEWER"]) }),
  z.object({ action: z.enum(["SUSPEND", "ACTIVATE", "REVOKE"]) }),
]);

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(2).max(150),
  branchName: z.string().trim().max(150).optional(),
  accountName: z.string().trim().min(2).max(150),
  accountNumber: z.string().trim().min(4).max(50),
  iban: z.string().trim().max(34).optional().refine((value) => !value || /^[A-Z]{2}[A-Z0-9]+$/i.test(value), "IBAN غير صالح"),
  currency: z.string().trim().length(3).default("EGP"),
  isActive: z.boolean().default(true),
});
