/**
 * Clears envelope/document data from the database while preserving a specific user
 * (and their org/team), then runs the demo metrics seed.
 *
 * Preserves: User with email PRESERVE_USER_EMAIL and their Organisation, Team, etc.
 * Deletes: All Envelope, DocumentMeta, DocumentData; resets Counter.
 *
 * Run from repo root: npm run with:env -- npx tsx packages/prisma/scripts/clear-and-seed-demo.ts
 */

import { prisma } from '..';

const PRESERVE_USER_EMAIL = 'isaacsonzachary@gmail.com';

async function main() {
  const preserveUser = await prisma.user.findFirst({
    where: { email: PRESERVE_USER_EMAIL, disabled: false },
    include: {
      ownedOrganisations: { include: { teams: true } },
    },
  });

  if (!preserveUser) {
    throw new Error(
      `User ${PRESERVE_USER_EMAIL} not found or disabled. Cannot clear DB without preserving this user.`,
    );
  }

  if (!preserveUser.ownedOrganisations?.[0]?.teams?.[0]) {
    throw new Error(
      `User ${PRESERVE_USER_EMAIL} has no personal org/team. Demo seed requires a user with org/team.`,
    );
  }

  console.log(`[clear-and-seed-demo] Preserving user: ${PRESERVE_USER_EMAIL} (id=${preserveUser.id})`);

  console.log('[clear-and-seed-demo] Deleting all envelopes (cascade: items, recipients, fields, etc.)...');
  const deletedEnvelopes = await prisma.envelope.deleteMany({});
  console.log(`[clear-and-seed-demo] Deleted ${deletedEnvelopes.count} envelopes.`);

  console.log('[clear-and-seed-demo] Deleting all DocumentMeta...');
  const deletedMeta = await prisma.documentMeta.deleteMany({});
  console.log(`[clear-and-seed-demo] Deleted ${deletedMeta.count} document meta rows.`);

  console.log('[clear-and-seed-demo] Deleting all DocumentData...');
  const deletedData = await prisma.documentData.deleteMany({});
  console.log(`[clear-and-seed-demo] Deleted ${deletedData.count} document data rows.`);

  console.log('[clear-and-seed-demo] Resetting document/template counters...');
  await prisma.counter.upsert({
    where: { id: 'document' },
    create: { id: 'document', value: 0 },
    update: { value: 0 },
  });
  await prisma.counter.upsert({
    where: { id: 'template' },
    create: { id: 'template', value: 0 },
    update: { value: 0 },
  });

  console.log('[clear-and-seed-demo] Done. Run demo metrics seed:');
  console.log('  npm run with:env -- npx tsx packages/prisma/scripts/seed-demo-metrics.ts');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
