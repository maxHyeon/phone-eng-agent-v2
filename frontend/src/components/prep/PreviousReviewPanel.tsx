import { useState, useEffect, useCallback } from "react";
import type { Lesson, ReviewSummary } from "../../types";
import type { UseChatReturn } from "../../hooks/useChat";
import { getPreviousLesson, getReviewSummary } from "../../api/client";
import ChatPanel from "../chat/ChatPanel";

interface Props {
  lesson: Lesson | null;
  chat: UseChatReturn;
}

const ERROR_TYPE_COLORS: Record<string, string> = {
  tense: "bg-red-100 text-red-700",
  preposition: "bg-orange-100 text-orange-700",
  article: "bg-yellow-100 text-yellow-700",
  word_order: "bg-green-100 text-green-700",
  word_choice: "bg-blue-100 text-blue-700",
  pronunciation: "bg-purple-100 text-purple-700",
  grammar: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

export default function PreviousReviewPanel({ lesson, chat }: Props) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson) return;
    setLoading(true);
    setError(null);

    getPreviousLesson(lesson.id)
      .then((prevLesson) => getReviewSummary(prevLesson.id))
      .then(setSummary)
      .catch((err) => {
        if (err.message.startsWith("404")) {
          setError("no_previous");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [lesson?.id]);

  const handleSend = useCallback(
    (text: string) => {
      if (!summary) return;
      const isFirst = chat.messages.length === 0;
      if (isFirst) {
        const context = buildReviewContext(summary);
        chat.sendMessage(
          `${context}\n\n학습자 메시지: ${text}`,
          "prep:review_previous" as any,
          lesson?.id ?? null,
        );
      } else {
        chat.sendMessage(text, "prep:review_previous" as any, lesson?.id ?? null);
      }
    },
    [chat, lesson, summary],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-400">지난 수업 데이터 불러오는 중...</p>
      </div>
    );
  }

  if (error === "no_previous") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-500">아직 복습할 수업이 없습니다</p>
          <p className="mt-1 text-sm text-gray-400">
            첫 수업을 완료하면 다음 수업 준비 시 복습할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  const hasPolished = summary.polished_expressions.length > 0;
  const hasExpressions = summary.key_expressions.length > 0;
  const hasCorrections = summary.corrections.length > 0;
  const hasData = hasPolished || hasExpressions || hasCorrections;

  if (!hasData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-500">지난 수업의 복습 데이터가 없습니다</p>
          <p className="mt-1 text-sm text-gray-400">다음 단계로 넘어가세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left: Review data */}
      <div className="flex-[7] overflow-y-auto border-r border-gray-200 bg-gray-50 p-5 scrollbar-thin">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">지난 수업 복습</h2>
          <span className="text-sm text-gray-500">
            {summary.lesson_date} {summary.lesson_topic && `- ${summary.lesson_topic}`}
          </span>
        </div>

        {/* A. Polished Expressions */}
        {hasPolished && (
          <section className="mb-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              A. 다듬어진 표현
            </h3>
            <div className="space-y-3">
              {summary.polished_expressions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="mb-1 text-sm text-gray-500">
                    <span className="font-medium text-gray-600">내 입력:</span>{" "}
                    {item.user_input || "-"}
                  </div>
                  <div className="text-sm text-blue-700">
                    <span className="font-medium text-blue-800">AI 교정:</span>{" "}
                    {item.ai_output || "-"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* B. Key Expressions */}
        {hasExpressions && (
          <section className="mb-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              B. 핵심 표현
            </h3>
            <div className="space-y-2">
              {summary.key_expressions.map((expr) => (
                <div
                  key={expr.id}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="text-sm font-medium text-gray-800">
                    {expr.expression}
                    {expr.meaning && (
                      <span className="ml-2 font-normal text-gray-500">
                        — {expr.meaning}
                      </span>
                    )}
                  </div>
                  {expr.example && (
                    <div className="mt-1 text-xs italic text-gray-500">
                      예: {expr.example}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* C. Corrections */}
        {hasCorrections && (
          <section className="mb-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              C. 오류 교정
            </h3>
            <div className="space-y-3">
              {summary.corrections.map((corr) => (
                <div
                  key={corr.id}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {corr.error_type && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase ${ERROR_TYPE_COLORS[corr.error_type] || ERROR_TYPE_COLORS.other}`}
                      >
                        {corr.error_type}
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-red-500 line-through">
                      {corr.original}
                    </span>
                  </div>
                  <div className="text-sm text-green-700">
                    → {corr.corrected}
                  </div>
                  {corr.explanation && (
                    <div className="mt-1 text-xs text-gray-500">
                      {corr.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* D. Failed Drills */}
        {summary.failed_drills.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              D. 다시 풀어볼 문제
            </h3>
            <div className="space-y-2">
              {summary.failed_drills.map((drill) => (
                <div
                  key={drill.id}
                  className="rounded-lg border border-orange-200 bg-orange-50 p-3"
                >
                  <span className="mr-2 rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700 uppercase">
                    {drill.drill_type}
                  </span>
                  <span className="text-sm text-gray-700">{drill.question}</span>
                  {drill.correct_answer && (
                    <div className="mt-1 text-xs text-gray-500">
                      정답: {drill.correct_answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right: Chat panel */}
      <div className="flex-[3] flex flex-col min-h-0">
        <ChatPanel
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          mode="prep"
          onSend={handleSend}
          onStop={chat.stop}
        />
      </div>
    </div>
  );
}

function buildReviewContext(summary: ReviewSummary): string {
  const parts: string[] = [];
  parts.push(`[지난 수업 정보] 날짜: ${summary.lesson_date}, 주제: ${summary.lesson_topic || "없음"}`);

  if (summary.polished_expressions.length > 0) {
    parts.push("\n[다듬어진 표현]");
    for (const p of summary.polished_expressions) {
      parts.push(`- 입력: ${p.user_input || ""} → 교정: ${p.ai_output || ""}`);
    }
  }

  if (summary.key_expressions.length > 0) {
    parts.push("\n[핵심 표현]");
    for (const e of summary.key_expressions) {
      parts.push(`- ${e.expression}: ${e.meaning || ""} (예: ${e.example || ""})`);
    }
  }

  if (summary.corrections.length > 0) {
    parts.push("\n[오류 교정]");
    for (const c of summary.corrections) {
      parts.push(`- [${c.error_type || "기타"}] ${c.original} → ${c.corrected} (${c.explanation || ""})`);
    }
  }

  return parts.join("\n");
}
