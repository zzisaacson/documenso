import { DateTime } from 'luxon';

import { prisma } from '@documenso/prisma';

export type GetDailyDocumentsCreatedResult = Array<{
  day: string;
  count: number;
}>;

type GetDailyDocumentsCreatedQueryResult = Array<{
  day: Date;
  count: bigint;
}>;

const LAST_N_DAYS = 30;

/**
 * Returns the number of documents created per day for the last 30 days.
 * Bucketed by calendar day (UTC). Days with no documents are included with count 0.
 */
export const getDailyDocumentsCreated = async (): Promise<GetDailyDocumentsCreatedResult> => {
  const result = await prisma.$queryRaw<GetDailyDocumentsCreatedQueryResult>`
    SELECT
      DATE_TRUNC('day', "Envelope"."createdAt")::date AS "day",
      COUNT(*)::bigint AS "count"
    FROM "Envelope"
    WHERE "Envelope"."type" = 'DOCUMENT'::"EnvelopeType"
      AND "Envelope"."createdAt" >= (CURRENT_DATE - INTERVAL '29 days')::timestamp
      AND "Envelope"."createdAt" < (CURRENT_DATE + INTERVAL '1 day')::timestamp
    GROUP BY DATE_TRUNC('day', "Envelope"."createdAt")::date
    ORDER BY "day" ASC
  `;

  const countByDay = new Map(
    result.map((row) => {
      const dayStr = DateTime.fromJSDate(row.day).toFormat('yyyy-MM-dd');
      return [dayStr, Number(row.count)];
    }),
  );

  const start = DateTime.now().minus({ days: LAST_N_DAYS - 1 }).startOf('day');
  const days: GetDailyDocumentsCreatedResult = [];

  for (let i = 0; i < LAST_N_DAYS; i++) {
    const d = start.plus({ days: i });
    const dayStr = d.toFormat('yyyy-MM-dd');
    days.push({
      day: dayStr,
      count: countByDay.get(dayStr) ?? 0,
    });
  }

  return days;
};
