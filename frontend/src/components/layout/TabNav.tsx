import type { Mode } from "../../types";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "prep", label: "수업 전 준비" },
  { mode: "review", label: "수업 후 복습" },
  { mode: "analytics", label: "학습 기록" },
];

interface Props {
  current: Mode;
  onChange: (mode: Mode) => void;
}

export default function TabNav({ current, onChange }: Props) {
  return (
    <div className="flex border-b border-gray-200 bg-white">
      {TABS.map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            current === mode
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
