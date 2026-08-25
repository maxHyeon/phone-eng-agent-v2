import { useState, useEffect } from "react";
import type { Lesson } from "../../types";
import { getLessons, deleteLesson } from "../../api/client";

const STATUS_BADGE: Record<string, string> = {
  prep: "bg-yellow-100 text-yellow-700",
  done: "bg-blue-100 text-blue-700",
  reviewed: "bg-green-100 text-green-700",
};

interface Props {
  currentLessonId?: number;
  onSelect?: (lesson: Lesson) => void;
  onDeleted?: (lessonId: number) => void;
}

export default function LessonHistory({ currentLessonId, onSelect, onDeleted }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getLessons().then(setLessons).catch(console.error);
  }, []);

  const handleDelete = async (lessonId: number) => {
    setDeleting(true);
    try {
      await deleteLesson(lessonId);
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      onDeleted?.(lessonId);
    } catch (err) {
      console.error("Failed to delete lesson:", err);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">수업 이력</h3>
      {lessons.length === 0 ? (
        <p className="text-xs text-gray-400">아직 수업 기록이 없습니다.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
          {lessons.map((l) => (
            <div key={l.id} className="relative">
              {confirmDeleteId === l.id ? (
                /* Delete confirmation inline */
                <div className="flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs">
                  <span className="text-red-700">삭제하시겠습니까?</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleDelete(l.id)}
                      disabled={deleting}
                      className="rounded bg-red-600 px-2 py-0.5 text-white hover:bg-red-700 disabled:opacity-40"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded border border-gray-300 px-2 py-0.5 text-gray-600 hover:bg-gray-100"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex w-full items-center justify-between rounded border px-3 py-1.5 text-xs transition-colors ${
                    l.id === currentLessonId
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <button
                    onClick={() => onSelect?.(l)}
                    className="flex-1 text-left"
                  >
                    <span className="font-medium text-gray-700">{l.date}</span>
                    {l.topic && <span className="ml-2 text-gray-500">{l.topic}</span>}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[l.status] || STATUS_BADGE.prep}`}>
                      {l.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(l.id);
                      }}
                      className="rounded p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="삭제"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
