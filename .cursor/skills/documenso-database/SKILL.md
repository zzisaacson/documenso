---
name: documenso-database
description: Documenso PostgreSQL schema and table purposes. Use when querying the database (e.g. via MCP), debugging DB-related slowness or anomalies, or when the user asks about tables, schema, or data structure.
---

# Documenso Database Schema

Canonical source: `packages/prisma/schema.prisma`. Database is PostgreSQL (dev: `127.0.0.1:54320`, user `documenso`, db `documenso`).

## Core tables (documents and signing)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| **User** | App users (sign-in, profile). | `id`, `email` (unique), `name`, `roles` (Role[]: USER, ADMIN), `createdAt`, `disabled` |
| **Envelope** | A document or template. One row per document/template. | `id` (cuid-like), `secondaryId` (e.g. `document_123`, `template_456`), `type` (DOCUMENT \| TEMPLATE), `status` (DRAFT \| PENDING \| COMPLETED \| REJECTED), `userId` (creator), `teamId`, `createdAt`, `completedAt`, `title`, `documentMetaId` |
| **EnvelopeItem** | One “page” or file in an envelope; links to blob. | `id`, `envelopeId`, `documentDataId`, `order`, `title` |
| **DocumentData** | PDF/blob content (base64 or S3 path). | `id`, `type` (BYTES \| BYTES_64 \| S3_PATH), `data`, `initialData` |
| **DocumentMeta** | Email/signing options for an envelope. | `id`, per-envelope settings (subject, message, signingOrder, etc.) |
| **Recipient** | A person invited to sign/view a document. | `id`, `envelopeId`, `email`, `name`, `token`, `signingStatus` (NOT_SIGNED \| SIGNED \| REJECTED), `sendStatus`, `readStatus`, `signedAt` |
| **Field** | A signing field (signature, date, text) on a page. | `id`, `envelopeId`, `envelopeItemId`, `recipientId`, `type`, `page`, `positionX/Y`, `inserted` |
| **Signature** | Stored signature image/text for a field. | `id`, `recipientId`, `fieldId`, `signatureImageAsBase64`, `typedSignature` |
| **DocumentAuditLog** | Event log per envelope (created, sent, opened, signed, etc.). | `id`, `envelopeId`, `type`, `data` (JSON), `createdAt`, `userId`, `email`, `name` |

## Organisations and teams

| Table | Purpose | Key columns |
|-------|---------|-------------|
| **Organisation** | Tenant/org (has many teams, members). | `id`, `name`, `url` (unique), `ownerUserId`, `type` (PERSONAL \| ORGANISATION) |
| **Team** | Team under an org; documents belong to a team. | `id`, `name`, `url` (unique), `organisationId` |
| **OrganisationMember** | User membership in an org. | `id`, `userId`, `organisationId` |
| **OrganisationGroup** | Role groups in org (e.g. admins, members). | `id`, `organisationId`, `organisationRole` (ADMIN \| MANAGER \| MEMBER) |
| **TeamGroup** | Maps org groups to team roles. | `teamId`, `organisationGroupId`, `teamRole` |

## Auth and infra

| Table | Purpose | Key columns |
|-------|---------|-------------|
| **Account** | OAuth/linked accounts (NextAuth). | `userId`, `provider`, `providerAccountId` |
| **Session** | User sessions. | `sessionToken`, `userId`, `expiresAt` |
| **UserSecurityAuditLog** | Security events (sign-in, 2FA, etc.). | `userId`, `type`, `createdAt` |
| **Counter** | Global numeric counters (e.g. next document id). | `id` (e.g. 'document', 'template'), `value` |

## Important conventions

- **Envelope IDs**: `Envelope.id` is a cuid (e.g. `envelope_abc123`). `Envelope.secondaryId` is the human-facing id: `document_<number>` or `template_<number>`. For documents, the number comes from `Counter` where `id = 'document'`.
- **Document vs template**: `Envelope.type` = `DOCUMENT` for real documents, `TEMPLATE` for reusable templates. Only query `type = 'DOCUMENT'` when analyzing document creation or signing.
- **Who created a document**: `Envelope.userId` is the creator; join to `User` for email/name. Use `Envelope.createdAt` for time-based analysis (e.g. spikes by hour or day).
- **Recipient state**: `Recipient.signingStatus` (SIGNED / NOT_SIGNED / REJECTED), `sendStatus` (SENT / NOT_SENT), `readStatus` (OPENED / NOT_OPENED). Completed documents have `Envelope.status = 'COMPLETED'` and typically at least one recipient with `signingStatus = 'SIGNED'`.

## Useful query patterns

- **Documents created per day (last 30 days):**  
  `SELECT DATE_TRUNC('day', "createdAt")::date AS day, COUNT(*) FROM "Envelope" WHERE type = 'DOCUMENT' AND "createdAt" >= CURRENT_DATE - INTERVAL '30 days' GROUP BY 1 ORDER BY 1;`
- **Documents per user per hour (find spikes):**  
  `SELECT "userId", DATE_TRUNC('hour', "createdAt") AS hour, COUNT(*) FROM "Envelope" WHERE type = 'DOCUMENT' GROUP BY 1, 2 ORDER BY 2, 3 DESC;`
- **Admin stats (counts by status):**  
  `SELECT status, COUNT(*) FROM "Envelope" WHERE type = 'DOCUMENT' GROUP BY status;`

## Full schema

For every column and relation, see `packages/prisma/schema.prisma`.
