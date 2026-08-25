import { useState, useEffect } from "react";
import type { Drill } from "../../types";
import { getLessonDrills, toggleDrill } from "../../api/client";

interface Props {
  lessonId: number | null;
  refreshKey?: number;
}

export default function DrillPanel({ lessonId, refreshKey }: Props) {
  const [drills, setDrills] = useState<Drill[]>([]);

  useEffect(() => {
    if (!lessonId) return;
    getLessonDrills(lessonId).then(setDrills).catch(console.error);
  }, [lessonId, refreshKey]);

  const handleToggle = async (drill: Drill) => {
    const updated = await toggleDrill(drill.id, !drill.is_completed);
    setDrills((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  if (drills.length === 0) return null;

  const completed = drills.filter((d) => d.is_completed).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-700">
        문장 구조 드릴
      </h3>
      <p className="mb-3 text-xs text-gray-400">
        {completed}/{drills.length} 완료
      </p>
      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
        {drills.map((drill) => (
          <label
            key={drill.id}
            className={`flex items-start gap-2 rounded border p-2 text-xs cursor-pointer transition-colors ${
              drill.is_completed
                ? "border-green-200 bg-green-50"
                : "border-gray-100 hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={drill.is_completed}
              onChange={() => handleToggle(drill)}
              className="mt-0.5 rounded"
            />
            <div className="flex-1">
              <span className="text-[10px] font-medium text-gray-400 uppercase">
                {drill.drill_type.replace("_", " ")}
              </span>
              <p className={`${drill.is_completed ? "text-gray-400 line-through" : "text-gray-700"}`}>
                {drill.question}
              </p>
              {drill.correct_answer && drill.is_completed && (
                <p className="mt-1 text-green-600">A: {drill.correct_answer}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
