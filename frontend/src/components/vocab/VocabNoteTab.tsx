import { useState, useCallback } from "react";
import type { VocabEntry } from "../../types";
import VocabListView from "./VocabListView";
import VocabFlashcardView from "./VocabFlashcardView";
import VocabSaveModal from "./VocabSaveModal";

type View = "list" | "flashcard";

export default function VocabNoteTab() {
  const [view, setView] = useState<View>("list");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editEntry, setEditEntry] = useState<VocabEntry | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="flex h-full flex-col">
      {/* View toggle + refresh */}
      <div className="shrink-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("list")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === "list" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            리스트
          </button>
          <button
            onClick={() => setView("flashcard")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === "flashcard" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            플래시카드
          </button>
        </div>
        <button
          onClick={refresh}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="새로고침"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === "list" ? (
          <VocabListView onEdit={setEditEntry} refreshKey={refreshKey} />
        ) : (
          <VocabFlashcardView refreshKey={refreshKey} />
        )}
      </div>

      {/* Edit modal */}
      <VocabSaveModal
        isOpen={!!editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={() => { setEditEntry(null); refresh(); }}
        editEntry={editEntry}
      />
    </div>
  );
}
