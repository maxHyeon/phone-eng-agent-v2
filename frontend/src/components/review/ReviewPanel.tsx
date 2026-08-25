import { useState, useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Lesson, Recording, Correction, Drill, ReviewStep } from "../../types";
import type { UseChatReturn } from "../../hooks/useChat";
import {
  generateReport,
  downloadReport,
  getLessonCorrections,
  getLessonDrills,
  toggleDrill,
} from "../../api/client";
import RecordingUpload from "./RecordingUpload";
import FeedbackInput from "./FeedbackInput";
import ChatPanel from "../chat/ChatPanel";

const ANALYSIS_TOOLS = new Set(["extract_corrections", "generate_drill"]);

const STEPS: { key: ReviewStep; label: string }[] = [
  { key: "input", label: "1. 입력" },
  { key: "summary", label: "2. 분석 결과" },
  { key: "drill", label: "3. 드릴 연습" },
  { key: "writing", label: "4. 자유 작문" },
];

const ERROR_TYPE_COLORS: Record<string, string> = {
  tense: "bg-red-100 text-red-700",
  preposition: "bg-blue-100 text-blue-700",
  article: "bg-purple-100 text-purple-700",
  word_order: "bg-yellow-100 text-yellow-700",
  word_choice: "bg-green-100 text-green-700",
  pronunciation: "bg-orange-100 text-orange-700",
  grammar: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

interface Props {
  lesson: Lesson | null;
  chats: { input: UseChatReturn; writing: UseChatReturn };
}

export default function ReviewPanel({ lesson, chats }: Props) {
  const [step, setStep] = useState<ReviewStep>("input");
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportFilename, setReportFilename] = useState("");

  // Track previous streaming state to detect streaming-end transitions
  const prevStreamingRef = useRef(false);

  // Reload corrections/drills when moving to summary or drill step
  const loadData = useCallback(async () => {
    if (!lesson) return;
    const [c, d] = await Promise.all([
      getLessonCorrections(lesson.id),
      getLessonDrills(lesson.id),
    ]);
    setCorrections(c);
    setDrills(d);
  }, [lesson]);

  const handleInputSend = useCallback(
    (text: string) => {
      chats.input.sendMessage(text, "review:input" as any, lesson?.id ?? null);
    },
    [chats.input.sendMessage, lesson],
  );

  const handleWritingSend = useCallback(
    (text: string) => {
      chats.writing.sendMessage(text, "review:writing" as any, lesson?.id ?? null);
    },
    [chats.writing.sendMessage, lesson],
  );

  const handleRecordingUploaded = useCallback(
    (recording: Recording) => {
      if (recording.transcript_text) {
        handleInputSend(
          `녹음 전사 내용을 분석해줘. 먼저 각 발화의 화자(Teacher/Student)를 구분하고, Student의 발화에서 틀린 부분을 찾아 교정하고 드릴을 만들어줘:\n\n${recording.transcript_text}`,
        );
      }
    },
    [handleInputSend],
  );

  // Auto-navigate to summary when agent finishes and used analysis tools
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = chats.input.isStreaming;

    // Only act on streaming-end transition (true → false)
    if (!wasStreaming || chats.input.isStreaming) return;
    if (step !== "input" || !lesson) return;

    // Check if the latest assistant message used analysis tools
    const lastMsg = chats.input.messages[chats.input.messages.length - 1];
    const hasAnalysis = lastMsg?.toolEvents?.some((e) => ANALYSIS_TOOLS.has(e.name));
    if (!hasAnalysis) return;

    // Agent used analysis tools → generate report, load data, navigate
    generateReport(lesson.id)
      .then((result) => {
        setReportMarkdown(result.content);
        setReportFilename(result.filename);
        return loadData();
      })
      .catch(console.error)
      .finally(() => {
        setStep("summary");
      });
  }, [chats.input.isStreaming, chats.input.messages, step, lesson, loadData]);

  const handleGoToSummary = useCallback(async () => {
    if (!lesson) return;
    try {
      await loadData();
    } catch {
      // corrections/drills not available yet
    }
    try {
      const result = await generateReport(lesson.id);
      setReportMarkdown(result.content);
      setReportFilename(result.filename);
    } catch {
      // no report yet
    }
    setStep("summary");
  }, [lesson, loadData]);

  const handleGoToDrill = useCallback(async () => {
    try {
      await loadData();
    } catch {
      // drills not available yet
    }
    setStep("drill");
  }, [loadData]);

  const handleGoToWriting = useCallback(() => {
    setStep("writing");
  }, []);

  const handleToggleDrill = async (drill: Drill) => {
    const updated = await toggleDrill(drill.id, !drill.is_completed);
    setDrills((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const completedDrills = drills.filter((d) => d.is_completed).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Step navigation */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        {STEPS.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              if (s.key === "summary") handleGoToSummary();
              else if (s.key === "drill") handleGoToDrill();
              else if (s.key === "writing") handleGoToWriting();
              else setStep(s.key);
            }}
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
      <div className="flex flex-1 overflow-hidden">
        {/* Input */}
        <div className="flex flex-1" style={{ display: step === "input" ? "flex" : "none" }}>
          <aside className="w-80 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3 space-y-3 scrollbar-thin">
            <RecordingUpload
              lesson={lesson}
              onUploaded={handleRecordingUploaded}
            />
            <FeedbackInput lesson={lesson} onSend={handleInputSend} />
            {chats.input.isStreaming && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                분석 중... 완료되면 자동으로 분석 결과로 이동합니다.
              </div>
            )}
          </aside>
          <ChatPanel
            messages={chats.input.messages}
            isStreaming={chats.input.isStreaming}
            mode="review"
            onSend={handleInputSend}
            onStop={chats.input.stop}
          />
        </div>

        {/* Summary */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin" style={{ display: step === "summary" ? "block" : "none" }}>
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">분석 결과</h2>
              {reportFilename && (
                <a
                  href={downloadReport(reportFilename)}
                  download
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                  리포트 다운로드
                </a>
              )}
            </div>

            {/* Error summary */}
            {corrections.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  오류 유형 분포 ({corrections.length}건)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    corrections.reduce<Record<string, number>>((acc, c) => {
                      const t = c.error_type || "other";
                      acc[t] = (acc[t] || 0) + 1;
                      return acc;
                    }, {}),
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <span
                        key={type}
                        className={`rounded-full px-3 py-1 text-sm font-medium ${ERROR_TYPE_COLORS[type] || ERROR_TYPE_COLORS.other}`}
                      >
                        {type}: {count}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Corrections list */}
            {corrections.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">교정 목록</h3>
                <div className="space-y-3">
                  {corrections.map((c, i) => (
                    <div key={c.id} className="rounded border border-gray-100 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                        {c.error_type && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ERROR_TYPE_COLORS[c.error_type] || ERROR_TYPE_COLORS.other}`}
                          >
                            {c.error_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-red-600 line-through">{c.original}</p>
                      <p className="text-sm text-green-700 font-medium">{c.corrected}</p>
                      {c.explanation && (
                        <p className="mt-1 text-xs text-gray-500">{c.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report markdown preview */}
            {reportMarkdown && (
              <details className="mb-6 rounded-lg border border-gray-200 bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  전체 리포트 보기
                </summary>
                <div className="border-t border-gray-100 px-4 py-3 prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {reportMarkdown}
                  </ReactMarkdown>
                </div>
              </details>
            )}

            {corrections.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <p>아직 분석 결과가 없습니다.</p>
                <p className="text-sm mt-1">입력 단계에서 녹음 파일이나 피드백을 제출하세요.</p>
              </div>
            )}

            {/* Next step */}
            {corrections.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleGoToDrill}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  드릴 연습으로 이동
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drill */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin" style={{ display: step === "drill" ? "block" : "none" }}>
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">드릴 연습</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {completedDrills}/{drills.length} 완료
                </p>
              </div>
              <button
                onClick={handleGoToWriting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                자유 작문으로 이동
              </button>
            </div>

            {drills.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p>드릴이 없습니다.</p>
                <p className="text-sm mt-1">분석 결과에서 드릴이 자동 생성됩니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drills.map((drill, i) => (
                  <label
                    key={drill.id}
                    className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      drill.is_completed
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={drill.is_completed}
                      onChange={() => handleToggleDrill(drill)}
                      className="mt-1 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                        <span className="text-xs font-medium text-gray-400 uppercase">
                          {drill.drill_type.replace("_", " ")}
                        </span>
                      </div>
                      <p
                        className={`text-sm ${drill.is_completed ? "text-gray-400 line-through" : "text-gray-700"}`}
                      >
                        {drill.question}
                      </p>
                      {drill.correct_answer && drill.is_completed && (
                        <p className="mt-1.5 text-sm text-green-600">
                          A: {drill.correct_answer}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Writing */}
        <div className="flex flex-1" style={{ display: step === "writing" ? "flex" : "none" }}>
          <ChatPanel
            messages={chats.writing.messages}
            isStreaming={chats.writing.isStreaming}
            mode="review"
            onSend={(text) => {
              if (chats.writing.messages.length === 0) {
                handleWritingSend(
                  `자유 작문 연습을 시작합니다. 오늘 수업에서 배운 표현과 교정된 내용을 활용해서 자유롭게 작문하겠습니다. 제가 작문하면 교정해주고, 개선할 부분을 알려주세요.\n\n${text}`,
                );
              } else {
                handleWritingSend(text);
              }
            }}
            onStop={chats.writing.stop}
          />
        </div>
      </div>
    </div>
  );
}
