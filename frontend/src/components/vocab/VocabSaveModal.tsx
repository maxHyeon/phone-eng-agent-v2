import { useState, useEffect, useRef } from "react";
import type { VocabEntry } from "../../types";
import { createVocab, updateVocab } from "../../api/client";

type Category = "word" | "idiom" | "pattern";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  lessonId?: number | null;
  mode?: string;
  editEntry?: VocabEntry | null;
}

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "word", label: "단어" },
  { key: "idiom", label: "숙어" },
  { key: "pattern", label: "문장패턴" },
];

export default function VocabSaveModal({ isOpen, onClose, onSaved, lessonId, mode, editEntry }: Props) {
  const [category, setCategory] = useState<Category>("word");
  const [expression, setExpression] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const mouseDownOnOverlay = useRef(false);

  const isEdit = !!editEntry;

  useEffect(() => {
    if (editEntry) {
      setCategory(editEntry.category);
      setExpression(editEntry.expression);
      setMeaning(editEntry.meaning);
      setExample(editEntry.example || "");
      setNote(editEntry.note || "");
    } else if (isOpen) {
      setCategory("word");
      setExpression("");
      setMeaning("");
      setExample("");
      setNote("");
    }
  }, [editEntry, isOpen]);

  if (!isOpen) return null;

  const canSave = expression.trim() && meaning.trim();

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (isEdit && editEntry) {
        await updateVocab(editEntry.id, {
          expression: expression.trim(),
          meaning: meaning.trim(),
          example: example.trim() || undefined,
          note: note.trim() || undefined,
          category,
        });
        setToast("수정되었습니다");
      } else {
        await createVocab({
          expression: expression.trim(),
          meaning: meaning.trim(),
          example: example.trim() || undefined,
          note: note.trim() || undefined,
          category,
          source_lesson_id: lessonId ?? undefined,
          source_context: mode,
        });
        setToast("저장되었습니다");
      }
      onSaved?.();
      setTimeout(() => {
        setToast("");
        onClose();
      }, 800);
    } catch {
      setToast("저장 실패");
      setTimeout(() => setToast(""), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSave) {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (mouseDownOnOverlay.current && e.target === e.currentTarget) onClose(); mouseDownOnOverlay.current = false; }}
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onKeyDown={handleKeyDown}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">
            {isEdit ? "표현 수정" : "표현 저장"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>

        {/* Category toggle */}
        <div className="mb-4 flex gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Expression */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            표현 <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="get the ball rolling"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Meaning */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            뜻 <span className="text-red-500">*</span>
          </label>
          <input
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="일을 시작하다"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Example */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">예문</label>
          <input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Let's get the ball rolling on this project."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Note */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">메모</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="회의에서 자주 쓰임"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Toast */}
        {toast && (
          <p className={`mb-3 text-center text-sm font-medium ${toast.includes("실패") ? "text-red-500" : "text-green-600"}`}>
            {toast}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? "저장 중..." : isEdit ? "수정" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
