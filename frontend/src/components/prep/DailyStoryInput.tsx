import { useState } from "react";
import type { Lesson } from "../../types";

interface Props {
  lesson: Lesson | null;
  onSend: (text: string) => void;
}

export default function DailyStoryInput({ lesson, onSend }: Props) {
  const [pastStory, setPastStory] = useState("");
  const [futurePlan, setFuturePlan] = useState("");

  const dayOfWeek = lesson?.day_of_week || "monday";
  const isWeekend = dayOfWeek === "saturday" || dayOfWeek === "sunday";
  const isMonday = dayOfWeek === "monday";
  const isFriday = dayOfWeek === "friday";

  const pastLabel = isMonday || isWeekend
    ? "주말간 무슨 일을 하셨나요?"
    : "어제 무슨 일을 하셨나요?";

  const futureLabel = isFriday || isWeekend
    ? "주말에 어떤 계획이 있으신가요?"
    : "오늘은 무슨 일을 하실 계획이세요?";

  const pastPlaceholder = isMonday || isWeekend
    ? "주말에 가족과 브런치를 먹으러 갔어요. 카페에서 커피도 마시고..."
    : "어제 회사에서 미팅이 있었어요. 저녁에는 운동을 하고...";

  const futurePlaceholder = isFriday || isWeekend
    ? "이번 주말에는 친구를 만나서 영화를 볼 계획이에요..."
    : "오늘은 프레젠테이션 준비를 하고, 저녁에 요가 수업에 갈 거예요...";

  const handleStart = () => {
    const parts: string[] = [];
    if (pastStory.trim()) {
      parts.push(`[${pastLabel}]\n${pastStory.trim()}`);
    }
    if (futurePlan.trim()) {
      parts.push(`[${futureLabel}]\n${futurePlan.trim()}`);
    }

    if (parts.length > 0) {
      onSend(
        `오늘은 ${dayOfWeek}입니다. 아래 내용을 자연스러운 영어로 다듬어주고, 강사처럼 후속 질문으로 스몰톡 연습을 해주세요:\n\n${parts.join("\n\n")}`,
      );
    } else {
      onSend(
        `스몰톡 연습을 시작해주세요. 오늘은 ${dayOfWeek}이고, "${pastLabel}" 같은 질문으로 시작해주세요.`,
      );
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 scrollbar-thin">
      <h2 className="mb-5 text-base font-bold text-gray-800">
        일상 이야기 준비
      </h2>

      {/* Past events */}
      <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-1.5 text-sm font-semibold text-gray-700">
          {pastLabel}
        </h3>
        <p className="mb-3 text-xs text-gray-400">
          한국어 또는 영어로 자유롭게 작성하세요
        </p>
        <textarea
          value={pastStory}
          onChange={(e) => setPastStory(e.target.value)}
          placeholder={pastPlaceholder}
          rows={5}
          className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Future plans */}
      <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-1.5 text-sm font-semibold text-gray-700">
          {futureLabel}
        </h3>
        <p className="mb-3 text-xs text-gray-400">
          한국어 또는 영어로 자유롭게 작성하세요
        </p>
        <textarea
          value={futurePlan}
          onChange={(e) => setFuturePlan(e.target.value)}
          placeholder={futurePlaceholder}
          rows={5}
          className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        연습 시작
      </button>
    </div>
  );
}
