import { useState, useCallback } from "react";
import DiaryCalendar from "./DiaryCalendar";
import DiaryEntryList from "./DiaryEntryList";
import DiaryWriteForm from "./DiaryWriteForm";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DiaryTab() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showWriteModal, setShowWriteModal] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="flex h-full">
      {/* Left: Calendar + Write Button */}
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3 space-y-3 scrollbar-thin">
        <DiaryCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <button
          onClick={() => setShowWriteModal(true)}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + 새로운 일기 쓰기
        </button>
      </aside>

      {/* Right: Entry List */}
      <div className="flex-1 overflow-hidden">
        <DiaryEntryList date={selectedDate} refreshKey={refreshKey} />
      </div>

      {/* Write Modal */}
      <DiaryWriteForm
        isOpen={showWriteModal}
        date={selectedDate}
        onClose={() => setShowWriteModal(false)}
        onCreated={refresh}
      />
    </div>
  );
}
