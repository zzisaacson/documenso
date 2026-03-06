import { DateTime } from 'luxon';

import { prisma } from '@documenso/prisma';

export type GetHourlyDocumentsCreatedResult = Array<{
  hour: string; // "HH:00" format, e.g. "00:00", "13:00"
  count: number;
}>;

type QueryResult = Array<{
  hour: Date;
  count: bigint;
}>;

/**
 * Returns the number of documents created per hour for the last 24 hours (UTC).
 * Hours with no documents are included with count 0.
 */
export const getHourlyDocumentsCreated = async (): Promise<GetHourlyDocumentsCreatedResult> => {
  const result = await prisma.$queryRaw<QueryResult>`
    SELECT
      DATE_TRUNC('hour', "Envelope"."createdAt") AS "hour",
      COUNT(*)::bigint AS "count"
    FROM "Envelope"
    WHERE "Envelope"."type" = 'DOCUMENT'::"EnvelopeType"
      AND "Envelope"."createdAt" >= NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', "Envelope"."createdAt")
    ORDER BY "hour" ASC
  `;

  const countByHour = new Map(
    result.map((row) => {
      const hourStr = DateTime.fromJSDate(row.hour, { zone: 'utc' }).toFormat('HH:00');
      return [hourStr, Number(row.count)];
    }),
  );

  // Build the last 24 hours, starting from the hour 23 hours ago up to the current hour.
  const now = DateTime.now().setZone('utc').startOf('hour');
  const hours: GetHourlyDocumentsCreatedResult = [];

  for (let i = 23; i >= 0; i--) {
    const h = now.minus({ hours: i });
    const hourStr = h.toFormat('HH:00');
    hours.push({ hour: hourStr, count: countByHour.get(hourStr) ?? 0 });
  }

  return hours;
};
