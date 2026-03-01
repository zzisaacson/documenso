import { getDocumentReviewSummary } from '@documenso/lib/server-only/document/get-document-review-summary';

import { procedure } from '../trpc';
import {
  ZGetDocumentReviewSummaryRequestSchema,
  ZGetDocumentReviewSummaryResponseSchema,
} from './get-document-review-summary.types';

export const getDocumentReviewSummaryRoute = procedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/recipient/document-review-summary',
      summary: 'Get AI document review summary',
      description:
        'Returns a concise AI-generated summary and risk highlights for the document accessible by the given recipient token.',
      tags: ['Document Signing'],
    },
  })
  .input(ZGetDocumentReviewSummaryRequestSchema)
  .output(ZGetDocumentReviewSummaryResponseSchema)
  .query(async ({ input }) => {
    const { token } = input;

    return await getDocumentReviewSummary({ token });
  });
