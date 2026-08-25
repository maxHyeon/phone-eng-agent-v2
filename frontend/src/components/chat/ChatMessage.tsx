import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType } from "../../types";

const TOOL_LABELS: Record<string, string> = {
  generate_smalltalk_scenario: "스몰톡 시나리오",
  polish_english: "영어 다듬기",
  analyze_script: "스크립트 분석",
  explain_expression: "표현 설명",
  transcribe_audio: "녹음 전사",
  extract_corrections: "교정 추출",
  generate_drill: "드릴 생성",
  evaluate_drill_answer: "드릴 평가",
  generate_quiz: "퀴즈 생성",
  analyze_error_patterns: "오류 패턴 분석",
};

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        {message.toolEvents && message.toolEvents.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.toolEvents.map((evt, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  evt.result
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700 animate-pulse"
                }`}
              >
                {evt.result ? "✓" : "⏳"} {TOOL_LABELS[evt.name] || evt.name}
              </span>
            ))}
          </div>
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-sm max-w-none text-sm leading-relaxed prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:my-2 prose-blockquote:my-1.5 prose-hr:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
