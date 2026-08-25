import { useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType, Mode } from "../../types";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

const WELCOME: Record<Mode, string[]> = {
  prep: [
    "수업 전 준비 모드입니다.",
    "스몰톡 연습을 시작하거나, 사이드바에서 토픽/기사를 입력하세요.",
  ],
  review: [
    "수업 후 복습 모드입니다.",
    "사이드바에서 녹음 파일이나 피드백을 입력하면 분석을 시작합니다.",
  ],
  analytics: [
    "학습 기록 모드입니다.",
    "'학습 분석해줘' 또는 '주간 리포트'를 요청해보세요.",
  ],
};

interface Props {
  messages: ChatMessageType[];
  isStreaming: boolean;
  mode: Mode;
  onSend: (text: string) => void;
  onStop: () => void;
}

export default function ChatPanel({ messages, isStreaming, mode, onSend, onStop }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-gray-400">
              {WELCOME[mode].map((line, i) => (
                <p key={i} className="mb-1 text-sm">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <ChatMessage key={i} message={msg} />)
        )}
        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5">
              <span className="text-gray-400 animate-pulse text-sm">...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <ChatInput mode={mode} isStreaming={isStreaming} onSend={onSend} onStop={onStop} />
    </div>
  );
}
