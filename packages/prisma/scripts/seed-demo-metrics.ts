/**
 * Seeds ~1 month of demo metrics data for admin dashboard and anomaly detection demos.
 *
 * - Total documents per day: 40–70 (30 anomaly + 10–40 normal, random each day)
 * - Normal users' docs are spread randomly across the full day; ~30–60% completed per day
 * - Anomaly: one user creates exactly 30 documents at 2pm ET every day; those never get signed
 *
 * Run from repo root: npm run with:env -- npx tsx packages/prisma/scripts/seed-demo-metrics.ts
 */

import {
  DocumentDataType,
  DocumentSource,
  DocumentStatus,
  EnvelopeType,
  ReadStatus,
  RecipientRole,
  SendStatus,
  SigningStatus,
} from '@prisma/client';
import { nanoid } from 'nanoid';

import { mapDocumentIdToSecondaryId } from '@documenso/lib/utils/envelope';
import { prefixedId } from '@documenso/lib/universal/id';

import { prisma } from '..';
import { seedUser } from '../seed/users';

const DAYS = 30;
const SPAM_DOCS_PER_DAY = 30;
const NORMAL_DOCS_MIN = 10;
const NORMAL_DOCS_MAX = 40;
const COMPLETED_RATIO_MIN = 0.3;
const COMPLETED_RATIO_MAX = 0.6;

// Minimal base64 placeholder for DocumentData (no real PDF required for admin list/stats)
const MINIMAL_PDF_BASE64 =
  'JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmIDEwMCA3MDAgVGQKKERlbW8pIFRqCkVNCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PAovU2l6ZSA1Ci9Sb290IDMgMCBSCj4+CnN0YXJ0eHJlZgo2MQolJUVPRg==';

/**
 * 2pm America/New_York on the given calendar date, as a UTC Date.
 * DST-aware: 2pm ET = 18:00 UTC (EDT) or 19:00 UTC (EST).
 */
function get2pmETUTC(year: number, month: number, day: number): Date {
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const etHourAtNoonUTC = parseInt(
    noonUTC.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }),
    10,
  );
  const utcHour = 14 + (12 - etHourAtNoonUTC);
  return new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0));
}

/** Random time on the given day (UTC) for normal docs – full 24h spread for variance. */
function randomTimeOnDayUTC(year: number, month: number, day: number): Date {
  const start = Date.UTC(year, month - 1, day, 0, 0, 0);
  const end = Date.UTC(year, month - 1, day, 23, 59, 59);
  return new Date(start + Math.floor(Math.random() * (end - start)));
}

/** Random int in [min, max] inclusive. */
function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

async function main() {
  console.log('[seed-demo-metrics] Resolving or creating users and teams...');

  const existingUser = await prisma.user.findFirst({
    where: { disabled: false },
    include: {
      ownedOrganisations: {
        include: { teams: true },
      },
    },
  });

  if (!existingUser?.ownedOrganisations?.[0]?.teams?.[0]) {
    throw new Error(
      'No user with a personal org/team found. Create an account and run again, or run the main seed first.',
    );
  }

  const normalTeamId = existingUser.ownedOrganisations[0].teams[0].id;
  const normalUserId = existingUser.id;

  let demoUser1: { user: { id: number }; team: { id: number } } | null = null;
  let demoUser2: { user: { id: number }; team: { id: number } } | null = null;
  let spammer: { user: { id: number }; team: { id: number } } | null = null;

  const demo1 = await prisma.user.findFirst({ where: { email: 'demo-normal-1@documenso.local' } });
  const demo2 = await prisma.user.findFirst({ where: { email: 'demo-normal-2@documenso.local' } });
  const spammerUser = await prisma.user.findFirst({
    where: { email: 'demo-anomaly-spammer@documenso.local' },
  });

  if (demo1) {
    const org = await prisma.organisation.findFirst({
      where: { ownerUserId: demo1.id },
      include: { teams: true },
    });
    if (org?.teams[0]) demoUser1 = { user: demo1, team: org.teams[0] };
  }
  if (!demoUser1) {
    demoUser1 = await seedUser({
      name: 'Demo Normal 1',
      email: 'demo-normal-1@documenso.local',
      password: 'password',
    });
  }

  if (demo2) {
    const org = await prisma.organisation.findFirst({
      where: { ownerUserId: demo2.id },
      include: { teams: true },
    });
    if (org?.teams[0]) demoUser2 = { user: demo2, team: org.teams[0] };
  }
  if (!demoUser2) {
    demoUser2 = await seedUser({
      name: 'Demo Normal 2',
      email: 'demo-normal-2@documenso.local',
      password: 'password',
    });
  }

  if (spammerUser) {
    const org = await prisma.organisation.findFirst({
      where: { ownerUserId: spammerUser.id },
      include: { teams: true },
    });
    if (org?.teams[0]) spammer = { user: spammerUser, team: org.teams[0] };
  }
  if (!spammer) {
    spammer = await seedUser({
      name: 'Anomaly Spammer',
      email: 'demo-anomaly-spammer@documenso.local',
      password: 'password',
    });
  }

  const normalUsers = [
    { userId: demoUser1.user.id, teamId: demoUser1.team.id },
    { userId: demoUser2.user.id, teamId: demoUser2.team.id },
    { userId: normalUserId, teamId: normalTeamId },
  ];
  const spammerUserId = spammer.user.id;
  const spammerTeamId = spammer.team.id;

  const counter = await prisma.counter.findUnique({ where: { id: 'document' } });
  if (!counter) throw new Error('Document counter not found in database.');
  let nextDocId = counter.value + 1;

  const minTotal = DAYS * (SPAM_DOCS_PER_DAY + NORMAL_DOCS_MIN);
  const maxTotal = DAYS * (SPAM_DOCS_PER_DAY + NORMAL_DOCS_MAX);
  console.log(
    `[seed-demo-metrics] Creating ~${minTotal}-${maxTotal} envelopes over ${DAYS} days (30 anomaly/day + 10-40 normal/day)...`,
  );

  const today = new Date();
  const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  startDate.setUTCDate(startDate.getUTCDate() - DAYS + 1);

  for (let d = 0; d < DAYS; d++) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + d);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    const normalCount = randomInt(NORMAL_DOCS_MIN, NORMAL_DOCS_MAX);
    const completedCount = Math.min(
      normalCount,
      Math.max(
        1,
        Math.floor(
          normalCount * (COMPLETED_RATIO_MIN + Math.random() * (COMPLETED_RATIO_MAX - COMPLETED_RATIO_MIN)),
        ),
      ),
    );
    const docsThisDay = SPAM_DOCS_PER_DAY + normalCount;

    const spammerCreatedAt = get2pmETUTC(year, month, day);

    await prisma.$transaction(async (tx) => {
      const documentDataIds: string[] = [];
      const documentMetaIds: string[] = [];
      const envelopeIds: string[] = [];
      const envelopeItemIds: string[] = [];
      const completedEnvelopeIds: string[] = [];

      for (let i = 0; i < docsThisDay; i++) {
        const docData = await tx.documentData.create({
          data: {
            type: DocumentDataType.BYTES_64,
            data: MINIMAL_PDF_BASE64,
            initialData: MINIMAL_PDF_BASE64,
          },
        });
        documentDataIds.push(docData.id);
      }

      for (let i = 0; i < docsThisDay; i++) {
        const meta = await tx.documentMeta.create({ data: {} });
        documentMetaIds.push(meta.id);
      }

      for (let i = 0; i < docsThisDay; i++) {
        const secondaryId = mapDocumentIdToSecondaryId(nextDocId + i);
        const envelopeId = prefixedId('envelope');
        const envelopeItemId = prefixedId('envelope_item');

        envelopeIds.push(envelopeId);
        envelopeItemIds.push(envelopeItemId);

        const isSpam = i < SPAM_DOCS_PER_DAY;
        const normalIndex = i - SPAM_DOCS_PER_DAY;
        const status: DocumentStatus = isSpam
          ? DocumentStatus.DRAFT
          : normalIndex < completedCount
            ? DocumentStatus.COMPLETED
            : DocumentStatus.DRAFT;

        const createdAt = isSpam
          ? spammerCreatedAt
          : randomTimeOnDayUTC(year, month, day);

        const { userId, teamId } = isSpam
          ? { userId: spammerUserId, teamId: spammerTeamId }
          : normalUsers[Math.floor(Math.random() * normalUsers.length)];

        if (status === DocumentStatus.COMPLETED) {
          completedEnvelopeIds.push(envelopeId);
        }

        await tx.envelope.create({
          data: {
            id: envelopeId,
            secondaryId,
            type: EnvelopeType.DOCUMENT,
            documentMetaId: documentMetaIds[i],
            source: DocumentSource.DOCUMENT,
            teamId,
            userId,
            title: isSpam
              ? `[Spam] Doc ${year}-${month}-${day} #${i + 1}`
              : `[Demo] Doc ${year}-${month}-${day} #${i + 1}`,
            status,
            internalVersion: 1,
            createdAt,
            updatedAt: createdAt,
            ...(status === DocumentStatus.COMPLETED && {
              completedAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
            }),
            envelopeItems: {
              create: {
                id: envelopeItemId,
                title: 'Demo',
                order: 1,
                documentDataId: documentDataIds[i],
              },
            },
          },
        });
      }

      for (const envelopeId of completedEnvelopeIds) {
        await tx.recipient.create({
          data: {
            envelopeId,
            email: `signer-${envelopeId}@demo.local`,
            name: 'Demo Signer',
            token: nanoid(),
            role: RecipientRole.SIGNER,
            readStatus: ReadStatus.OPENED,
            sendStatus: SendStatus.SENT,
            signingStatus: SigningStatus.SIGNED,
            signedAt: new Date(),
          },
        });
      }
    });

    nextDocId += docsThisDay;
    if ((d + 1) % 5 === 0 || d === DAYS - 1) {
      console.log(`[seed-demo-metrics] Day ${d + 1}/${DAYS} done.`);
    }
  }

  await prisma.counter.update({
    where: { id: 'document' },
    data: { value: nextDocId - 1 },
  });

  console.log('[seed-demo-metrics] Done. Summary:');
  console.log(
    `  - ${DAYS} days, 10-40 normal + ${SPAM_DOCS_PER_DAY} anomaly docs/day (total 40-70/day)`,
  );
  console.log(`  - ~30-60% of normal docs completed (signed) per day`);
  console.log(`  - Normal docs spread randomly across the full day`);
  console.log(`  - Anomaly user: demo-anomaly-spammer@documenso.local (30 docs at 2pm ET daily)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
