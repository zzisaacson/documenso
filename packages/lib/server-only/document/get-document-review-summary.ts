import { PDF } from '@libpdf/core';

import { getDocumentAndSenderByToken } from '@documenso/lib/server-only/document/get-document-by-token';
import { getFileServerSide } from '@documenso/lib/universal/upload/get-file.server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_PDF_TEXT_LENGTH = 80_000;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a document review assistant. Given the text extracted from a PDF document, produce a very concise summary for someone about to sign or review it.

Output exactly two short paragraphs in this format:
Summary: [1-2 sentences describing what the document is and its main purpose. No fluff.]
Risks: [1-3 sentences only. Flag only high-risk or unusual clauses that a signer should pay attention to—e.g. liability, indemnity, arbitration, auto-renewal, data usage, or non-standard terms. If nothing notable, say "No high-risk clauses flagged."]

Keep the entire response to at most 5 sentences total. Be direct and factual.`;

export type GetDocumentReviewSummaryOptions = {
  token: string;
};

export type DocumentReviewSummary = {
  summary: string;
  risks: string;
};

const extractTextFromPdf = async (pdfBuffer: Buffer): Promise<string> => {
  const pdfDoc = await PDF.load(new Uint8Array(pdfBuffer));
  const pages = pdfDoc.getPages();
  const parts: string[] = [];

  for (const page of pages) {
    const { text } = page.extractText();
    if (text?.trim()) {
      parts.push(text.trim());
    }
  }

  return parts.join('\n\n');
};

const callGroq = async (pdfText: string): Promise<DocumentReviewSummary> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const truncatedText =
    pdfText.length > MAX_PDF_TEXT_LENGTH
      ? pdfText.slice(0, MAX_PDF_TEXT_LENGTH) + '\n\n[Document truncated for length.]'
      : pdfText;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Document text:\n\n${truncatedText}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GROQ API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty response from GROQ');
  }

  const summaryMatch = content.match(/Summary:\s*([\s\S]*?)(?=Risks:|$)/i);
  const risksMatch = content.match(/Risks:\s*([\s\S]*?)$/im);

  return {
    summary: summaryMatch?.[1]?.trim() ?? content,
    risks: risksMatch?.[1]?.trim() ?? 'No high-risk clauses flagged.',
  };
};

export const getDocumentReviewSummary = async ({
  token,
}: GetDocumentReviewSummaryOptions): Promise<DocumentReviewSummary> => {
  const document = await getDocumentAndSenderByToken({
    token,
    requireAccessAuth: false,
  });

  const firstItem = document.envelopeItems[0];
  if (!firstItem?.documentData) {
    throw new Error('Document data not found');
  }

  const fileBytes = await getFileServerSide(firstItem.documentData);
  const pdfBuffer = Buffer.from(fileBytes);
  const pdfText = await extractTextFromPdf(pdfBuffer);

  if (!pdfText.trim()) {
    return {
      summary: 'This document could not be read as text (e.g. scanned image or empty).',
      risks: 'Unable to analyze risks without extractable text.',
    };
  }

  return callGroq(pdfText);
};
