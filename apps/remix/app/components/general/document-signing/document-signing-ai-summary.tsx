import { Trans } from '@lingui/react/macro';

import { trpc } from '@documenso/trpc/react';

export type DocumentSigningAISummaryProps = {
  token: string;
};

export const DocumentSigningAISummary = ({ token }: DocumentSigningAISummaryProps) => {
  const { data, isPending, isError, error } = trpc.recipient.getDocumentReviewSummary.useQuery(
    { token },
    { retry: false },
  );

  if (isPending) {
    return (
      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-foreground">
          <Trans>Document summary</Trans>
        </h4>
        <div className="custom-scrollbar max-h-40 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Trans>Loading summary…</Trans>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-foreground">
          <Trans>Document summary</Trans>
        </h4>
        <div className="custom-scrollbar max-h-40 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {error?.message?.includes('GROQ_API_KEY') ? (
            <Trans>Summary unavailable (not configured).</Trans>
          ) : (
            <Trans>Summary unavailable.</Trans>
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="mb-4">
      <h4 className="mb-2 text-sm font-medium text-foreground">
        <Trans>Document summary</Trans>
      </h4>
      <div className="custom-scrollbar max-h-48 overflow-y-auto overflow-x-hidden rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
        <p className="mb-2">{data.summary}</p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">
            <Trans>Risks:</Trans>{' '}
          </span>
          {data.risks}
        </p>
      </div>
    </div>
  );
};
