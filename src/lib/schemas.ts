import { z } from "zod";

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
  legalName: z.string().trim().min(2).max(200),
  tradeName: z.string().trim().max(200).nullable().optional(),
  englishName: z.string().trim().max(200).nullable().optional(),
  onboardingStatus: z.enum(["DRAFT", "COMPLETE"]).optional(),
  profile: z.object({
    responsiblePerson: z.string().trim().max(150).nullable().optional(),
    businessActivity: z.string().trim().max(200).nullable().optional(),
    legalEntityType: z.string().trim().max(100).nullable().optional(),
    activityStartDate: z.coerce.date().nullable().optional(),
    website: z.string().trim().url().nullable().or(z.literal("")).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    publicEmail: z.string().trim().email().nullable().or(z.literal("")).optional(),
  }).optional(),
  legal: z.object({
    commercialRegisterNo: z.string().trim().max(100).nullable().optional(),
    registrationAuthority: z.string().trim().max(200).nullable().optional(),
    taxRegistrationNo: z.string().trim().max(100).nullable().optional(),
    taxOffice: z.string().trim().max(200).nullable().optional(),
    vatRegistered: z.boolean().optional(),
    taxCardNumber: z.string().trim().max(100).nullable().optional(),
    legalRepresentative: z.string().trim().max(150).nullable().optional(),
  }).optional(),
  address: z.object({
    countryCode: z.string().trim().length(2),
    governorate: z.string().trim().max(100).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(),
    addressLine: z.string().trim().min(3).max(500),
    postalCode: z.string().trim().max(20).nullable().optional(),
  }).optional(),
  contacts: z.array(z.object({
    type: z.enum(["FINANCE_MANAGER", "ACCOUNTING_CONTACT", "LEGAL_REPRESENTATIVE", "GENERAL"]),
    name: z.string().trim().min(2).max(150),
    title: z.string().trim().max(150).nullable().optional(),
    email: z.string().trim().email().nullable().or(z.literal("")).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
  })).max(10).optional(),
  accounting: z.object({
    baseCurrency: z.string().trim().length(3),
    fiscalYearStartMonth: z.number().int().min(1).max(12),
    fiscalYearStartDay: z.number().int().min(1).max(31),
    fiscalYearEndMonth: z.number().int().min(1).max(12),
    fiscalYearEndDay: z.number().int().min(1).max(31),
    openingBalanceDate: z.coerce.date().nullable().optional(),
    inventoryMethod: z.enum(["PERIODIC", "PERPETUAL"]),
  }).optional(),
});

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(2).max(150),
  branchName: z.string().trim().max(150).optional(),
  accountName: z.string().trim().min(2).max(150),
  accountNumber: z.string().trim().min(4).max(50),
  iban: z.string().trim().max(34).optional().refine((value) => !value || /^[A-Z]{2}[A-Z0-9]+$/i.test(value), "IBAN غير صالح"),
  currency: z.string().trim().length(3).default("EGP"),
  isActive: z.boolean().default(true),
});
