import { useState } from "react";
import type { Lesson } from "../../types";
import { uploadScreenshot } from "../../api/client";

interface Props {
  lesson: Lesson | null;
  onSend: (text: string) => void;
}

export default function FeedbackInput({ lesson, onSend }: Props) {
  const [feedbackText, setFeedbackText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleTextAnalyze = () => {
    if (!feedbackText.trim()) return;
    onSend(`강사 피드백을 분석해줘:\n\n${feedbackText}`);
  };

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lesson) return;

    setUploadingImage(true);
    try {
      const result = await uploadScreenshot(lesson.id, file);
      onSend(`강사 피드백 스크린샷에서 추출된 내용을 분석해줘:\n\n${result.extracted_text}`);
    } catch {
      // error handled silently
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">강사 피드백</h3>

      <textarea
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        placeholder="강사 피드백을 붙여넣으세요 (발음 체크, 문법 교정, 코멘트 등)"
        rows={4}
        className="mb-2 w-full resize-none rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />

      <div className="flex gap-2 mb-2">
        <button
          onClick={handleTextAnalyze}
          disabled={!feedbackText.trim()}
          className="flex-1 rounded-lg bg-orange-500 py-1.5 text-sm text-white hover:bg-orange-600 disabled:opacity-40"
        >
          피드백 분석
        </button>
      </div>

      <label
        className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed py-3 text-xs transition-colors ${
          uploadingImage
            ? "border-yellow-300 bg-yellow-50 text-yellow-600"
            : "border-gray-300 text-gray-400 hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleScreenshot}
          disabled={uploadingImage || !lesson}
          className="hidden"
        />
        {uploadingImage ? "이미지 분석 중..." : "또는 스크린샷 이미지 업로드"}
      </label>
    </div>
  );
}
