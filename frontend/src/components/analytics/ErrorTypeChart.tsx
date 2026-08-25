import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
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

export default function ErrorTypeChart({ stats }: Props) {
  if (!stats || stats.type_distribution.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">오류 유형 분포</h3>
        <p className="text-xs text-gray-400">아직 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">오류 유형 분포</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={stats.type_distribution}>
          <XAxis dataKey="error_type" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {stats.type_distribution.map((entry) => (
              <Cell key={entry.error_type} fill={COLORS[entry.error_type] || COLORS.other} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
