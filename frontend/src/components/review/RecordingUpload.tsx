import { useState, useEffect, useRef } from "react";
import type { Lesson, Recording } from "../../types";
import { uploadRecording, getLessonRecordings, getRecordingFileUrl } from "../../api/client";

interface Props {
  lesson: Lesson | null;
  onUploaded: (recording: Recording) => void;
}

export default function RecordingUpload({ lesson, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load existing recordings for this lesson
  useEffect(() => {
    if (lesson) {
      getLessonRecordings(lesson.id).then(setRecordings).catch(console.error);
    }
  }, [lesson]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lesson) return;

    setUploading(true);
    try {
      const recording = await uploadRecording(lesson.id, file);
      setRecordings((prev) => [recording, ...prev]);
      onUploaded(recording);
    } catch {
      // error handled silently
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handlePlay = (recording: Recording) => {
    if (playingId === recording.id) {
      // Stop current playback
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }

    // Stop previous if playing
    audioRef.current?.pause();

    const audio = new Audio(getRecordingFileUrl(recording.id));
    audio.onended = () => setPlayingId(null);
    audio.play().catch(console.error);
    audioRef.current = audio;
    setPlayingId(recording.id);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const formatStatus = (status: string) => {
    if (status === "done") return "전사 완료";
    if (status === "error") return "전사 오류";
    return "대기 중";
  };

  const extractFilename = (filePath: string) => {
    const parts = filePath.split("/");
    const full = parts[parts.length - 1];
    // Remove lesson_id prefix (e.g., "1_recording.mp3" → "recording.mp3")
    const idx = full.indexOf("_");
    return idx > 0 ? full.slice(idx + 1) : full;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">녹음 업로드</h3>

      {/* Upload area */}
      <label
        className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed py-4 text-sm transition-colors ${
          uploading
            ? "border-yellow-300 bg-yellow-50 text-yellow-600"
            : "border-gray-300 text-gray-500 hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <input
          type="file"
          accept=".mp3,.wav,.m4a,.webm"
          onChange={handleFile}
          disabled={uploading || !lesson}
          className="hidden"
        />
        {uploading ? "전사 처리 중..." : "녹음 파일 선택 (.mp3, .wav)"}
      </label>

      {/* Recording list */}
      {recordings.length > 0 && (
        <div className="mt-3 space-y-2">
          {recordings.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center gap-2 rounded border border-gray-100 px-3 py-2"
            >
              {/* Play/Stop button */}
              <button
                onClick={() => handlePlay(rec)}
                className={`shrink-0 rounded-full p-1.5 text-xs transition-colors ${
                  playingId === rec.id
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                }`}
                title={playingId === rec.id ? "정지" : "재생"}
              >
                {playingId === rec.id ? "\u23F9" : "\u25B6"}
              </button>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-gray-700">
                  {extractFilename(rec.file_path)}
                </p>
                <p className={`text-[10px] ${rec.status === "done" ? "text-green-600" : rec.status === "error" ? "text-red-500" : "text-gray-400"}`}>
                  {formatStatus(rec.status)}
                </p>
              </div>

              {/* Download link */}
              <a
                href={getRecordingFileUrl(rec.id)}
                download
                className="shrink-0 rounded p-1.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="다운로드"
              >
                {"\u2B07"}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
