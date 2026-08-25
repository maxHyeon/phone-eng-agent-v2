import { useState, useEffect } from "react";
import type { Correction } from "../../types";
import { getLessonCorrections } from "../../api/client";

const ERROR_TYPE_COLORS: Record<string, string> = {
  tense: "bg-red-100 text-red-700",
  preposition: "bg-blue-100 text-blue-700",
  article: "bg-purple-100 text-purple-700",
  word_order: "bg-yellow-100 text-yellow-700",
  word_choice: "bg-green-100 text-green-700",
  pronunciation: "bg-orange-100 text-orange-700",
  grammar: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

interface Props {
  lessonId: number | null;
  refreshKey?: number;
}

export default function CorrectionList({ lessonId, refreshKey }: Props) {
  const [corrections, setCorrections] = useState<Correction[]>([]);

  useEffect(() => {
    if (!lessonId) return;
    getLessonCorrections(lessonId).then(setCorrections).catch(console.error);
  }, [lessonId, refreshKey]);

  if (corrections.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        교정 목록 ({corrections.length}건)
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
        {corrections.map((c) => (
          <div key={c.id} className="rounded border border-gray-100 p-2 text-xs">
            <div className="flex items-center gap-1.5 mb-1">
              {c.error_type && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ERROR_TYPE_COLORS[c.error_type] || ERROR_TYPE_COLORS.other}`}
                >
                  {c.error_type}
                </span>
              )}
            </div>
            <p className="text-red-600 line-through">{c.original}</p>
            <p className="text-green-700 font-medium">{c.corrected}</p>
            {c.explanation && (
              <p className="mt-1 text-gray-500">{c.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
