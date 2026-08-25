import { useState, useRef, useCallback } from "react";
import type { Mode } from "../../types";
import { useVoiceInput } from "../../hooks/useVoiceInput";

const PLACEHOLDERS: Record<Mode, string> = {
  prep: "스몰톡 연습이나 토픽 관련 질문을 해보세요...",
  review: "피드백 내용을 붙여넣거나 질문하세요...",
  analytics: "학습 분석이나 리포트를 요청하세요...",
};

interface Props {
  mode: Mode;
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export default function ChatInput({ mode, isStreaming, onSend, onStop }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, isTranscribing, start: startRecording, stop: stopRecording } = useVoiceInput();

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [text, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const transcript = await stopRecording();
      if (transcript) {
        onSend(transcript);
      }
    } else {
      await startRecording();
    }
  };

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={PLACEHOLDERS[mode]}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          disabled={isStreaming}
        />

        {/* Voice input button */}
        <button
          onClick={handleVoiceToggle}
          disabled={isStreaming || isTranscribing}
          className={`rounded-lg p-2 text-sm transition-colors ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : isTranscribing
                ? "bg-yellow-100 text-yellow-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          title={isRecording ? "녹음 중지" : isTranscribing ? "전사 중..." : "음성 입력"}
        >
          {isRecording ? "⏹" : isTranscribing ? "..." : "🎤"}
        </button>

        {/* Send / Stop button */}
        {isStreaming ? (
          <button
            onClick={onStop}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
          >
            중지
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          >
            전송
          </button>
        )}
      </div>
    </div>
  );
}
