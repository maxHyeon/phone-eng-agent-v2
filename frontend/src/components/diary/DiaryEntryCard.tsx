import { useState } from "react";
import type { DiaryEntry } from "../../types";
import { updateDiaryMemo, deleteDiary } from "../../api/client";

interface Props {
  entry: DiaryEntry;
  onUpdated: () => void;
}

export default function DiaryEntryCard({ entry, onUpdated }: Props) {
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState(entry.memo || "");
  const [saving, setSaving] = useState(false);

  const handleSaveMemo = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateDiaryMemo(entry.id, memoText.trim() || null);
      setEditingMemo(false);
      onUpdated();
    } catch {
      console.error("Failed to save memo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 일기를 삭제하시겠습니까?")) return;
    try {
      await deleteDiary(entry.id);
      onUpdated();
    } catch {
      console.error("Failed to delete");
    }
  };

  const sourceBadge =
    entry.source === "lesson" ? (
      <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
        수업
      </span>
    ) : (
      <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
        직접작성
      </span>
    );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sourceBadge}
          <span className="text-[10px] text-gray-400">
            {entry.created_at?.slice(11, 16)}
          </span>
        </div>
        {entry.source === "manual" && (
          <button
            onClick={handleDelete}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            title="삭제"
          >
            삭제
          </button>
        )}
      </div>

      {/* User input */}
      <div className="mb-2">
        <p className="text-xs font-medium text-gray-500 mb-0.5">내 입력</p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{entry.user_input}</p>
      </div>

      {/* AI output */}
      {entry.ai_output && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-500 mb-0.5">AI 교정</p>
          <p className="text-sm text-blue-800 whitespace-pre-wrap bg-blue-50 rounded px-2 py-1.5">
            {entry.ai_output}
          </p>
        </div>
      )}

      {/* Memo */}
      {editingMemo ? (
        <div className="mt-2">
          <input
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="메모 입력..."
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveMemo();
              if (e.key === "Escape") setEditingMemo(false);
            }}
          />
          <div className="mt-1 flex gap-1">
            <button
              onClick={handleSaveMemo}
              disabled={saving}
              className="rounded bg-blue-600 px-2 py-0.5 text-[10px] text-white hover:bg-blue-700 disabled:opacity-40"
            >
              저장
            </button>
            <button
              onClick={() => setEditingMemo(false)}
              className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          {entry.memo ? (
            <p className="text-xs text-gray-500 italic">
              메모: {entry.memo}
            </p>
          ) : null}
          {entry.source === "manual" && (
            <button
              onClick={() => {
                setMemoText(entry.memo || "");
                setEditingMemo(true);
              }}
              className="text-[10px] text-blue-500 hover:text-blue-700"
            >
              {entry.memo ? "수정" : "+ 메모"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
