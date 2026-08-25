import { useState, useEffect } from "react";
import type { Lesson } from "../../types";

interface Props {
  lesson: Lesson | null;
  onUpdateLesson: (data: Partial<Lesson>) => Promise<Lesson | undefined>;
  onSend: (text: string) => void;
}

export default function TopicInput({ lesson, onUpdateLesson, onSend }: Props) {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [questions, setQuestions] = useState("");

  useEffect(() => {
    if (lesson) {
      setTopic(lesson.topic || "");
      setScript(lesson.script_text || "");
      setQuestions(lesson.questions || "");
    }
  }, [lesson]);

  const handleSave = async () => {
    await onUpdateLesson({ topic, script_text: script, questions });
  };

  const handleAnalyze = async () => {
    await handleSave();
    const msg = `오늘 수업 스크립트를 분석해줘.\n\n[토픽]\n${topic}\n\n[스크립트]\n${script}\n\n[질문]\n${questions}`;
    onSend(msg);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">토픽 / 기사</h3>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="토픽"
        className="mb-2 w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />

      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="뉴스 기사 / 스크립트 붙여넣기"
        rows={6}
        className="mb-2 w-full resize-none rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />

      <textarea
        value={questions}
        onChange={(e) => setQuestions(e.target.value)}
        placeholder="토론 질문 (기사 기반 3개 + 확장 3개)"
        rows={4}
        className="mb-3 w-full resize-none rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded-lg border border-gray-300 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          저장
        </button>
        <button
          onClick={handleAnalyze}
          disabled={!script.trim()}
          className="flex-1 rounded-lg bg-blue-600 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
        >
          분석 시작
        </button>
      </div>
    </div>
  );
}
