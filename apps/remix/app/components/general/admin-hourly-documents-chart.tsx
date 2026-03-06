import type { TooltipProps } from 'recharts';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

import type { GetHourlyDocumentsCreatedResult } from '@documenso/lib/server-only/admin/get-hourly-documents-created';

export type AdminHourlyDocumentsChartProps = {
  className?: string;
  title: string;
  data: GetHourlyDocumentsCreatedResult;
};

const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const hour = payload[0].payload?.hour as string | undefined;
    return (
      <div className="z-100 w-52 space-y-1 rounded-md border border-solid bg-white p-2 px-3">
        <p>{hour ? `${hour} UTC` : ''}</p>
        <p className="text-documenso">
          Documents created:{' '}
          <span className="text-black">{Number(payload[0].value).toLocaleString('en-US')}</span>
        </p>
      </div>
    );
  }

  return null;
};

export const AdminHourlyDocumentsChart = ({
  className,
  data,
  title,
}: AdminHourlyDocumentsChartProps) => {
  return (
    <div className={className}>
      <div className="border-border flex flex-1 flex-col justify-center rounded-2xl border p-6 pl-2">
        <div className="mb-6 flex px-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 10%)' }} />

            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              name="Documents created"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
