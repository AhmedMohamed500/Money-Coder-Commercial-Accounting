import { z } from "zod";

export const demoJournalLineSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  description: z.string().max(180),
  debitMinor: z.number().int().nonnegative(),
  creditMinor: z.number().int().nonnegative(),
}).refine(line => !(line.debitMinor && line.creditMinor), "لا يمكن أن يكون السطر مدينًا ودائنًا معًا.");

export const demoJournalCommandSchema = z.object({
  date: z.string().date(),
  memo: z.string().min(3).max(240),
  reference: z.string().min(2).max(40),
  lines: z.array(demoJournalLineSchema).min(2),
});

export const demoReviewTransitionSchema = z.object({
  reviewId: z.string().min(1),
  status: z.enum(["CORRECTION_REQUESTED", "RESUBMITTED", "APPROVED", "REJECTED"]),
  comment: z.string().min(2).max(500),
});
