import { useState, useEffect } from "react";
import { getDiaryDates } from "../../api/client";

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function DiaryCalendar({ selectedDate, onSelectDate }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [dotDates, setDotDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    getDiaryDates(year, month)
      .then((dates) => setDotDates(new Set(dates)))
      .catch(console.error);
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const formatDate = (day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {year}년 {month}월
        </span>
        <button
          onClick={nextMonth}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] font-medium text-gray-400">
            {w}
          </span>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = formatDate(day);
          const isSelected = dateStr === selectedDate;
          const hasDot = dotDates.has(dateStr);
          const isToday =
            year === today.getFullYear() &&
            month === today.getMonth() + 1 &&
            day === today.getDate();

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : isToday
                    ? "bg-blue-50 text-blue-600 font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {day}
              {hasDot && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
