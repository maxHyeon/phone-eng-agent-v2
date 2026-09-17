import { useState, useCallback } from "react";
import type { Lesson, PrepStep } from "../../types";
import type { UseChatReturn } from "../../hooks/useChat";
import { useIsMobile } from "../../hooks/useIsMobile";
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
  // 모바일 전용: 'input' | 'chat' 탭 상태
  const [mobileTab, setMobileTab] = useState<"input" | "chat">("input");
  const isMobile = useIsMobile();

  const handleSmalltalkSend = useCallback(
    (text: string) => {
      chats.smalltalk.sendMessage(text, "prep:smalltalk" as any, lesson?.id ?? null);
      // 모바일에서 연습 시작 시 자동으로 채팅 탭으로 전환
      if (isMobile) setMobileTab("chat");
    },
    [chats.smalltalk.sendMessage, lesson, isMobile],
  );

  const handleArticleSend = useCallback(
    (text: string) => {
      chats.article.sendMessage(text, "prep:article" as any, lesson?.id ?? null);
      if (isMobile) setMobileTab("chat");
    },
    [chats.article.sendMessage, lesson, isMobile],
  );

  const handleFreetalkSend = useCallback(
    (text: string) => {
      chats.freetalk.sendMessage(text, "prep:freetalk" as any, lesson?.id ?? null);
    },
    [chats.freetalk.sendMessage, lesson],
  );

  // step 변경 시 모바일 탭을 input으로 초기화
  const handleStepChange = (s: PrepStep) => {
    setStep(s);
    setMobileTab("input");
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      {/* Step navigation */}
      <div className="shrink-0 flex border-b border-gray-200 bg-white px-4 overflow-x-auto">
        {STEPS.map((s) => (
          <button
            key={s.key}
            onClick={() => handleStepChange(s.key)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              step === s.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Previous Review */}
        <div className="flex flex-1 min-h-0" style={{ display: step === "review_previous" ? "flex" : "none" }}>
          <PreviousReviewPanel lesson={lesson} chat={chats.review_previous} />
        </div>

        {/* Smalltalk */}
        <div className="flex flex-1 min-h-0 flex-col" style={{ display: step === "smalltalk" ? "flex" : "none" }}>
          {isMobile ? (
            /* ── 모바일: 입력 / 대화 탭 전환 ── */
            <>
              {/* 모바일 서브탭 */}
              <div className="shrink-0 flex border-b border-gray-100 bg-white">
                <button
                  onClick={() => setMobileTab("input")}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                    mobileTab === "input"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  ✏️ 내용 입력
                </button>
                <button
                  onClick={() => setMobileTab("chat")}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                    mobileTab === "chat"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  💬 대화
                  {chats.smalltalk.messages.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-xs">
                      {chats.smalltalk.messages.length}
                    </span>
                  )}
                </button>
              </div>

              {/* 내용 입력 탭 */}
              <div className="flex flex-1 min-h-0 overflow-hidden" style={{ display: mobileTab === "input" ? "flex" : "none" }}>
                <div className="flex-1 overflow-y-auto bg-gray-50">
                  <DailyStoryInput lesson={lesson} onSend={handleSmalltalkSend} />
                </div>
              </div>

              {/* 대화 탭 */}
              <div className="flex flex-1 min-h-0 flex-col overflow-hidden" style={{ display: mobileTab === "chat" ? "flex" : "none" }}>
                <ChatPanel
                  messages={chats.smalltalk.messages}
                  isStreaming={chats.smalltalk.isStreaming}
                  mode="prep"
                  onSend={handleSmalltalkSend}
                  onStop={chats.smalltalk.stop}
                />
              </div>
            </>
          ) : (
            /* ── 데스크톱: 기존 좌우 레이아웃 ── */
            <>
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
            </>
          )}
        </div>

        {/* Article */}
        <div className="flex flex-1 flex-col" style={{ display: step === "article" ? "flex" : "none" }}>
          {isMobile ? (
            /* ── 모바일: 입력 / 대화 탭 전환 ── */
            <>
              <div className="shrink-0 flex border-b border-gray-100 bg-white">
                <button
                  onClick={() => setMobileTab("input")}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                    mobileTab === "input"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  📰 기사 입력
                </button>
                <button
                  onClick={() => setMobileTab("chat")}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                    mobileTab === "chat"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  💬 분석 결과
                  {chats.article.messages.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-xs">
                      {chats.article.messages.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex flex-1 min-h-0 overflow-hidden" style={{ display: mobileTab === "input" ? "flex" : "none" }}>
                <div className="flex-1 overflow-y-auto bg-gray-50 p-3">
                  <TopicInput
                    lesson={lesson}
                    onUpdateLesson={updateLesson}
                    onSend={handleArticleSend}
                  />
                </div>
              </div>

              <div className="flex flex-1 min-h-0 flex-col overflow-hidden" style={{ display: mobileTab === "chat" ? "flex" : "none" }}>
                <ChatPanel
                  messages={chats.article.messages}
                  isStreaming={chats.article.isStreaming}
                  mode="prep"
                  onSend={handleArticleSend}
                  onStop={chats.article.stop}
                />
              </div>
            </>
          ) : (
            /* ── 데스크톱: 기존 좌우 레이아웃 ── */
            <>
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
            </>
          )}
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
