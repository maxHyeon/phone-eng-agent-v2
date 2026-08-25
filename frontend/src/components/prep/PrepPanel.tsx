import { useState, useCallback } from "react";
import type { Lesson, PrepStep } from "../../types";
import type { UseChatReturn } from "../../hooks/useChat";
import DailyStoryInput from "./DailyStoryInput";
import TopicInput from "./TopicInput";
import PreviousReviewPanel from "./PreviousReviewPanel";
import ChatPanel from "../chat/ChatPanel";

const STEPS: { key: PrepStep; label: string }[] = [
  { key: "review_previous", label: "0. 지난 수업 복습" },
  { key: "smalltalk", label: "1. 일상 이야기" },
  { key: "article", label: "2. 기사 분석" },
  { key: "freetalk", label: "3. 프리토킹" },
];

interface Props {
  lesson: Lesson | null;
  updateLesson: (data: Partial<Lesson>) => Promise<Lesson | undefined>;
  chats: Record<PrepStep, UseChatReturn>;
}

export default function PrepPanel({ lesson, updateLesson, chats }: Props) {
  const [step, setStep] = useState<PrepStep>("smalltalk");

  const handleSmalltalkSend = useCallback(
    (text: string) => {
      chats.smalltalk.sendMessage(text, "prep:smalltalk" as any, lesson?.id ?? null);
    },
    [chats.smalltalk.sendMessage, lesson],
  );

  const handleArticleSend = useCallback(
    (text: string) => {
      chats.article.sendMessage(text, "prep:article" as any, lesson?.id ?? null);
    },
    [chats.article.sendMessage, lesson],
  );

  const handleFreetalkSend = useCallback(
    (text: string) => {
      chats.freetalk.sendMessage(text, "prep:freetalk" as any, lesson?.id ?? null);
    },
    [chats.freetalk.sendMessage, lesson],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      {/* Step navigation */}
      <div className="shrink-0 flex border-b border-gray-200 bg-white px-4">
        {STEPS.map((s) => (
          <button
            key={s.key}
            onClick={() => setStep(s.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              step === s.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Step content — all panels always mounted, hidden via inline style */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Previous Review */}
        <div className="flex flex-1 min-h-0" style={{ display: step === "review_previous" ? "flex" : "none" }}>
          <PreviousReviewPanel lesson={lesson} chat={chats.review_previous} />
        </div>

        {/* Smalltalk */}
        <div className="flex flex-1 min-h-0" style={{ display: step === "smalltalk" ? "flex" : "none" }}>
          <div className="flex-1 overflow-hidden border-r border-gray-200 bg-gray-50">
            <DailyStoryInput lesson={lesson} onSend={handleSmalltalkSend} />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <ChatPanel
              messages={chats.smalltalk.messages}
              isStreaming={chats.smalltalk.isStreaming}
              mode="prep"
              onSend={handleSmalltalkSend}
              onStop={chats.smalltalk.stop}
            />
          </div>
        </div>

        {/* Article */}
        <div className="flex flex-1" style={{ display: step === "article" ? "flex" : "none" }}>
          <aside className="w-80 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3 scrollbar-thin">
            <TopicInput
              lesson={lesson}
              onUpdateLesson={updateLesson}
              onSend={handleArticleSend}
            />
          </aside>
          <ChatPanel
            messages={chats.article.messages}
            isStreaming={chats.article.isStreaming}
            mode="prep"
            onSend={handleArticleSend}
            onStop={chats.article.stop}
          />
        </div>

        {/* Freetalk */}
        <div className="flex flex-1" style={{ display: step === "freetalk" ? "flex" : "none" }}>
          <ChatPanel
            messages={chats.freetalk.messages}
            isStreaming={chats.freetalk.isStreaming}
            mode="prep"
            onSend={(text) => {
              if (chats.freetalk.messages.length === 0 && lesson?.questions) {
                handleFreetalkSend(
                  `토론 질문을 기반으로 프리토킹 연습을 시작합니다. 강사처럼 질문을 하나씩 던져주고, 제 답변을 교정해주세요.\n\n[토론 질문]\n${lesson.questions}\n\n${text}`,
                );
              } else if (chats.freetalk.messages.length === 0) {
                handleFreetalkSend(
                  `프리토킹 연습을 시작합니다. 강사처럼 자유 대화를 진행해주세요. 제 답변을 교정하고 후속 질문을 해주세요.\n\n${text}`,
                );
              } else {
                handleFreetalkSend(text);
              }
            }}
            onStop={chats.freetalk.stop}
          />
        </div>
      </div>
    </div>
  );
}
