import { useState, useEffect } from "react";
import type { DiaryEntry } from "../../types";
import { getDiaryByDate } from "../../api/client";
import DiaryEntryCard from "./DiaryEntryCard";

interface Props {
  date: string;
  refreshKey: number;
}

export default function DiaryEntryList({ date, refreshKey }: Props) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    getDiaryByDate(date)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date, refreshKey]);

  if (!date) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        날짜를 선택해주세요
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        불러오는 중...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-sm text-gray-400">
        <p>이 날짜에 기록이 없습니다</p>
        <p className="mt-1 text-xs">아래에서 일기를 작성해보세요</p>
      </div>
    );
  }

  // Format date header
  const dateObj = new Date(date + "T00:00:00");
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const header = `${date} (${dayNames[dateObj.getDay()]})`;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 py-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{header}</h3>
        <p className="text-[10px] text-gray-400">{entries.length}개의 기록</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {entries.map((entry) => (
          <DiaryEntryCard
            key={`${entry.source}-${entry.id}`}
            entry={entry}
            onUpdated={() => {
              getDiaryByDate(date).then(setEntries).catch(console.error);
            }}
          />
        ))}
      </div>
    </div>
  );
}
