export interface Lesson {
  id: number;
  date: string;
  day_of_week: string | null;
  topic: string | null;
  script_text: string | null;
  questions: string | null;
  status: string;
  created_at: string;
}

export interface Expression {
  id: number;
  lesson_id: number;
  expression: string;
  meaning: string | null;
  example: string | null;
  source: string;
  created_at: string;
}

export interface Correction {
  id: number;
  lesson_id: number;
  original: string;
  corrected: string;
  explanation: string | null;
  error_type: string | null;
  source: string;
  created_at: string;
}

export interface Recording {
  id: number;
  lesson_id: number;
  file_path: string;
  transcript_text: string | null;
  duration_seconds: number | null;
  status: string;
  created_at: string;
}

export interface Drill {
  id: number;
  lesson_id: number;
  correction_id: number | null;
  drill_type: string;
  question: string;
  correct_answer: string | null;
  user_answer: string | null;
  is_completed: boolean;
  feedback: string | null;
  created_at: string;
}

export interface ErrorPattern {
  id: number;
  pattern_type: string;
  description: string | null;
  occurrence_count: number;
  last_occurred: string | null;
  example_corrections: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: number;
  lesson_id: number;
  question: string;
  answer: string;
  quiz_type: string;
  user_answer: string | null;
  is_correct: boolean | null;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolEvents?: ToolEvent[];
}

export interface ToolEvent {
  name: string;
  result?: Record<string, unknown>;
}

export interface ErrorStats {
  type_distribution: { error_type: string; count: number }[];
  trend: { date: string; error_type: string; count: number }[];
  total_corrections: number;
  total_lessons: number;
}

export type Mode = "prep" | "review" | "analytics";

export type ReviewStep = "input" | "summary" | "drill" | "writing";

export type PrepStep = "review_previous" | "smalltalk" | "article" | "freetalk";

export interface PolishedExpression {
  id: number;
  user_input: string | null;
  ai_output: string | null;
}

export interface ReviewSummary {
  lesson_id: number;
  lesson_date: string;
  lesson_topic: string | null;
  polished_expressions: PolishedExpression[];
  key_expressions: Expression[];
  corrections: Correction[];
  failed_drills: Drill[];
}

export interface VocabEntry {
  id: number;
  expression: string;
  meaning: string;
  example: string | null;
  note: string | null;
  category: "word" | "idiom" | "pattern";
  source_lesson_id: number | null;
  source_context: string | null;
  mastery: number;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntry {
  id: number;
  date: string;
  user_input: string;
  ai_output: string | null;
  memo: string | null;
  source: "manual" | "lesson";
  lesson_id: number | null;
  created_at: string;
  updated_at: string;
}
