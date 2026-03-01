import { z } from 'zod';

export const ZGetDocumentReviewSummaryRequestSchema = z.object({
  token: z.string().min(1),
});

export const ZGetDocumentReviewSummaryResponseSchema = z.object({
  summary: z.string(),
  risks: z.string(),
});

export type TGetDocumentReviewSummaryRequest = z.infer<
  typeof ZGetDocumentReviewSummaryRequestSchema
>;
export type TGetDocumentReviewSummaryResponse = z.infer<
  typeof ZGetDocumentReviewSummaryResponseSchema
>;
