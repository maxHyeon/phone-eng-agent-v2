import { useState, useCallback } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
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
  const [mobileTab, setMobileTab] = useState<"calendar" | "entries">("calendar");
  const isMobile = useIsMobile();

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    // 모바일: 날짜 선택 시 자동으로 일기 목록 탭으로 이동
    if (isMobile) setMobileTab("entries");
  };

  return (
    <div className="flex h-full flex-col">
      {isMobile ? (
        /* ── 모바일: 캘린더 | 일기 목록 탭 전환 ── */
        <>
          <div className="shrink-0 flex border-b border-gray-100 bg-white">
            <button
              onClick={() => setMobileTab("calendar")}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                mobileTab === "calendar"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-400"
              }`}
            >
              📅 캘린더
            </button>
            <button
              onClick={() => setMobileTab("entries")}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                mobileTab === "entries"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-400"
              }`}
            >
              📝 {selectedDate} 일기
            </button>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden" style={{ display: mobileTab === "calendar" ? "flex" : "none" }}>
            <div className="flex-1 overflow-y-auto bg-gray-50 p-3 space-y-3">
              <DiaryCalendar selectedDate={selectedDate} onSelectDate={handleSelectDate} />
              <button
                onClick={() => setShowWriteModal(true)}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                + 새로운 일기 쓰기
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden" style={{ display: mobileTab === "entries" ? "flex" : "none" }}>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="shrink-0 px-3 pt-3 pb-2">
                <button
                  onClick={() => setShowWriteModal(true)}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  + 새로운 일기 쓰기
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <DiaryEntryList date={selectedDate} refreshKey={refreshKey} />
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── 데스크톱: 기존 좌우 레이아웃 ── */
        <div className="flex h-full">
          <aside className="w-72 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3 space-y-3 scrollbar-thin">
            <DiaryCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <button
              onClick={() => setShowWriteModal(true)}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + 새로운 일기 쓰기
            </button>
          </aside>
          <div className="flex-1 overflow-hidden">
            <DiaryEntryList date={selectedDate} refreshKey={refreshKey} />
          </div>
        </div>
      )}

      <DiaryWriteForm
        isOpen={showWriteModal}
        date={selectedDate}
        onClose={() => setShowWriteModal(false)}
        onCreated={refresh}
      />
    </div>
  );
}
