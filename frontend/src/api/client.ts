import type { Lesson, Expression, Correction, Drill, Recording, ErrorPattern, ErrorStats, Quiz, ChatMessage, ReviewSummary, VocabEntry, DiaryEntry } from "../types";

const BASE = "/api";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ===== Lessons =====
export const getTodayLesson = () => fetchJSON<Lesson>("/lessons/today");
export const getLessons = () => fetchJSON<Lesson[]>("/lessons");
export const getLesson = (id: number) => fetchJSON<Lesson>(`/lessons/${id}`);
export const deleteLesson = (id: number) =>
  fetchJSON<{ status: string }>(`/lessons/${id}`, { method: "DELETE" });
export const updateLesson = (id: number, data: Partial<Lesson>) =>
  fetchJSON<Lesson>(`/lessons/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const saveConversations = (lessonId: number, conversations: Record<string, ChatMessage[]>) =>
  fetchJSON<{ status: string }>(`/lessons/${lessonId}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversations }),
  });
export const getConversations = (lessonId: number) =>
  fetchJSON<Record<string, ChatMessage[]>>(`/lessons/${lessonId}/conversations`);

// ===== Previous Lesson Review =====
export const getPreviousLesson = (currentLessonId: number) =>
  fetchJSON<Lesson>(`/lessons/previous?current_lesson_id=${currentLessonId}`);
export const getReviewSummary = (lessonId: number) =>
  fetchJSON<ReviewSummary>(`/lessons/${lessonId}/review-summary`);

// ===== Expressions =====
export const getExpressions = (search?: string) =>
  fetchJSON<Expression[]>(`/expressions${search ? `?search=${encodeURIComponent(search)}` : ""}`);
export const getLessonExpressions = (lessonId: number) =>
  fetchJSON<Expression[]>(`/lessons/${lessonId}/expressions`);

// ===== Corrections =====
export const getLessonCorrections = (lessonId: number) =>
  fetchJSON<Correction[]>(`/lessons/${lessonId}/corrections`);
export const createCorrection = (lessonId: number, data: { original: string; corrected: string; explanation?: string }) =>
  fetchJSON<Correction>(`/lessons/${lessonId}/corrections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

// ===== Drills =====
export const getLessonDrills = (lessonId: number) =>
  fetchJSON<Drill[]>(`/lessons/${lessonId}/drills`);
export const toggleDrill = (drillId: number, isCompleted: boolean) =>
  fetchJSON<Drill>(`/drills/${drillId}/toggle`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_completed: isCompleted }),
  });

// ===== Recordings =====
export const getLessonRecordings = (lessonId: number) =>
  fetchJSON<Recording[]>(`/lessons/${lessonId}/recordings`);
export const getRecordingFileUrl = (recordingId: number) =>
  `${BASE}/recordings/${recordingId}/file`;
export const uploadRecording = async (lessonId: number, file: File): Promise<Recording> => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload/recording?lesson_id=${lessonId}`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

// ===== Screenshots =====
export const uploadScreenshot = async (lessonId: number, file: File): Promise<{ extracted_text: string }> => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload/screenshot?lesson_id=${lessonId}`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

// ===== Whisper (voice input) =====
export const transcribeVoice = async (audioBlob: Blob): Promise<string> => {
  const form = new FormData();
  form.append("file", audioBlob, "voice.webm");
  const res = await fetch(`${BASE}/whisper/transcribe`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  return data.text;
};

// ===== Report =====
export interface ReportResult {
  filename: string;
  path: string;
  corrections_count: number;
  drills_count: number;
  content: string;
}

export const generateReport = (lessonId: number) =>
  fetchJSON<ReportResult>(`/lessons/${lessonId}/report`, { method: "POST" });

export const downloadReport = (filename: string) =>
  `${BASE}/reports/${encodeURIComponent(filename)}`;

// ===== Analytics =====
export const getErrorPatterns = () => fetchJSON<ErrorPattern[]>("/analytics/error-patterns");
export const getErrorStats = () => fetchJSON<ErrorStats>("/analytics/stats");

// ===== Quizzes =====
export const getLessonQuizzes = (lessonId: number) =>
  fetchJSON<Quiz[]>(`/lessons/${lessonId}/quizzes`);
export const answerQuiz = (quizId: number, answer: string) =>
  fetchJSON<Quiz>(`/quizzes/${quizId}/answer`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_answer: answer }),
  });

// ===== Settings =====
export interface ProviderField {
  key: string;
  label: string;
  secret: boolean;
  default?: string;
}

export const getProviders = () =>
  fetchJSON<{ providers: Record<string, ProviderField[]> }>("/settings/providers");

export const getSettings = () =>
  fetchJSON<{ provider: string; values: Record<string, string>; has_value: Record<string, boolean> }>("/settings");

export const saveSettings = (provider: string, values: Record<string, string>) =>
  fetchJSON<{ status: string; provider: string }>("/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, values }),
  });

// ===== Chat (SSE streaming) =====
export const resetChat = (lessonId?: number, mode?: string) =>
  fetchJSON<{ status: string }>("/chat/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lesson_id: lessonId, mode }),
  });

export interface StreamCallbacks {
  onTextDelta: (text: string) => void;
  onToolStart: (name: string) => void;
  onToolResult: (name: string, result: Record<string, unknown>) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export function streamChat(
  message: string,
  mode: string,
  lessonId: number | null,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  fetch(BASE + "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode, lesson_id: lessonId }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            const data = line.slice(6);
            if (eventType === "text_delta") {
              callbacks.onTextDelta(JSON.parse(data));
            } else if (eventType === "tool_start") {
              const parsed = JSON.parse(data);
              callbacks.onToolStart(parsed.name);
            } else if (eventType === "tool_result") {
              const parsed = JSON.parse(data);
              callbacks.onToolResult(parsed.name, parsed.result);
            } else if (eventType === "done") {
              callbacks.onDone();
            }
            eventType = "";
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") callbacks.onError(err);
    });

  return controller;
}

// ===== Vocabulary Book =====
export const createVocab = (data: { expression: string; meaning: string; example?: string; note?: string; category?: string; source_lesson_id?: number; source_context?: string }) =>
  fetchJSON<VocabEntry>("/vocab", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getVocabs = (params?: { category?: string; search?: string; sort?: string }) => {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);
  if (params?.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return fetchJSON<VocabEntry[]>(`/vocab${qs ? `?${qs}` : ""}`);
};

export const updateVocab = (id: number, data: Partial<Pick<VocabEntry, "expression" | "meaning" | "example" | "note" | "category">>) =>
  fetchJSON<VocabEntry>(`/vocab/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const deleteVocab = (id: number) =>
  fetchJSON<{ status: string }>(`/vocab/${id}`, { method: "DELETE" });

export const updateVocabMastery = (id: number, mastery: number) =>
  fetchJSON<VocabEntry>(`/vocab/${id}/mastery`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mastery }),
  });

export const getVocabFlashcards = (category?: string) =>
  fetchJSON<VocabEntry[]>(`/vocab/flashcard${category ? `?category=${category}` : ""}`);

// ===== Diary =====
export const getDiaryDates = (year: number, month: number) =>
  fetchJSON<string[]>(`/diary/dates?year=${year}&month=${month}`);

export const getDiaryByDate = (date: string) =>
  fetchJSON<DiaryEntry[]>(`/diary/${date}`);

export const createDiary = (data: { date: string; user_input: string; memo?: string }) =>
  fetchJSON<DiaryEntry>("/diary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updateDiaryMemo = (id: number, memo: string | null) =>
  fetchJSON<DiaryEntry>(`/diary/${id}/memo`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memo }),
  });

export const deleteDiary = (id: number) =>
  fetchJSON<{ status: string }>(`/diary/${id}`, { method: "DELETE" });
