import { useState, useEffect, useCallback } from "react";
import type { VocabEntry } from "../../types";
import { getVocabs, deleteVocab, updateVocabMastery } from "../../api/client";

type Category = "word" | "idiom" | "pattern";

const CATEGORY_BADGES: Record<string, string> = {
  word: "bg-blue-100 text-blue-700",
  idiom: "bg-purple-100 text-purple-700",
  pattern: "bg-green-100 text-green-700",
};

interface Props {
  onEdit: (entry: VocabEntry) => void;
  refreshKey: number;
}

export default function VocabListView({ onEdit, refreshKey }: Props) {
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  const [category, setCategory] = useState<Category | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVocabs({
        category: category || undefined,
        search: search || undefined,
      });
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDelete = async (id: number) => {
    await deleteVocab(id);
    setDeleteConfirm(null);
    load();
  };

  const handleResetMastery = async (id: number) => {
    await updateVocabMastery(id, 0);
    load();
  };

  const MASTERY_DOT: Record<number, string> = {
    0: "bg-red-400",
    1: "bg-yellow-400",
    2: "bg-green-400",
    3: "bg-blue-400",
  };

  return (
    <div className="flex h-full flex-col">
      {/* Filters */}
      <div className="shrink-0 space-y-2 border-b border-gray-200 bg-white p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${!category ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            전체
          </button>
          {(["word", "idiom", "pattern"] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${category === c ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {c === "word" ? "단어" : c === "idiom" ? "숙어" : "문장패턴"}
            </button>
          ))}
        </div>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="표현 또는 뜻 검색..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {loading && <p className="text-center text-sm text-gray-400">불러오는 중...</p>}
        {!loading && entries.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">저장된 표현이 없습니다</p>
            <p className="mt-1 text-sm text-gray-400">우하단 + 버튼으로 첫 표현을 저장해보세요</p>
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${MASTERY_DOT[entry.mastery] || MASTERY_DOT[0]}`} />
                  <span className="text-sm font-medium text-gray-800">{entry.expression}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${CATEGORY_BADGES[entry.category]}`}>
                    {entry.category}
                  </span>
                  {entry.mastery >= 3 && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                      외움
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">{entry.meaning}</p>
                {entry.example && (
                  <p className="mt-0.5 text-xs italic text-gray-400">예: {entry.example}</p>
                )}
                {entry.note && (
                  <p className="mt-0.5 text-xs text-gray-400">메모: {entry.note}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                {entry.mastery >= 3 && (
                  <button
                    onClick={() => handleResetMastery(entry.id)}
                    className="rounded px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50"
                    title="다시 학습"
                  >
                    다시 학습
                  </button>
                )}
                <button
                  onClick={() => onEdit(entry)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="편집"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {deleteConfirm === entry.id ? (
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="rounded px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 hover:bg-red-200"
                  >
                    삭제
                  </button>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(entry.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="삭제"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && entries.length > 0 && (
          <p className="text-center text-xs text-gray-400 pt-2">
            총 {entries.length}개 표현
          </p>
        )}
      </div>
    </div>
  );
}
