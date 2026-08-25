import { useState, useRef } from "react";
import { createDiary } from "../../api/client";

interface Props {
  isOpen: boolean;
  date: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function DiaryWriteForm({ isOpen, date, onClose, onCreated }: Props) {
  const [input, setInput] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const mouseDownOnOverlay = useRef(false);

  if (!isOpen) return null;

  const canSave = input.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await createDiary({
        date,
        user_input: input.trim(),
        memo: memo.trim() || undefined,
      });
      setInput("");
      setMemo("");
      onCreated();
      onClose();
    } catch {
      console.error("Failed to create diary");
    } finally {
      setSaving(false);
    }
  };

  const dateObj = new Date(date + "T00:00:00");
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dateLabel = `${date} (${dayNames[dateObj.getDay()]})`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (mouseDownOnOverlay.current && e.target === e.currentTarget) onClose(); mouseDownOnOverlay.current = false; }}
    >
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800">일기 쓰기</h3>
            <p className="text-xs text-gray-500 mt-0.5">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="한국어 또는 영어로 자유롭게 작성하세요..."
          rows={6}
          autoFocus
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSave) {
              handleSubmit();
            }
          }}
        />

        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모 (선택)"
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">Cmd+Enter로 저장</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSave || saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {saving ? "교정 중..." : "작성하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
