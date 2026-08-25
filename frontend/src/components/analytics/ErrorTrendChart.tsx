import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ErrorStats } from "../../types";

const COLORS: Record<string, string> = {
  tense: "#ef4444",
  preposition: "#3b82f6",
  article: "#a855f7",
  word_order: "#eab308",
  word_choice: "#22c55e",
  pronunciation: "#f97316",
  grammar: "#ec4899",
  other: "#6b7280",
};

interface Props {
  stats: ErrorStats | null;
}

export default function ErrorTrendChart({ stats }: Props) {
  if (!stats || stats.trend.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">오류 추이</h3>
        <p className="text-xs text-gray-400">아직 데이터가 없습니다.</p>
      </div>
    );
  }

  // Transform trend data: group by date, pivot error_types as columns
  const dateMap = new Map<string, Record<string, number>>();
  const errorTypes = new Set<string>();

  for (const row of stats.trend) {
    errorTypes.add(row.error_type);
    const existing = dateMap.get(row.date) || {};
    existing[row.error_type] = row.count;
    dateMap.set(row.date, existing);
  }

  const chartData = Array.from(dateMap.entries()).map(([date, counts]) => ({
    date: date.slice(5), // MM-DD format
    ...counts,
  }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">오류 추이</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {Array.from(errorTypes).map((type) => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              stroke={COLORS[type] || COLORS.other}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
