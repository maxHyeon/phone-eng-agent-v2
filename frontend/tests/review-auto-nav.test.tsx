/**
 * Tests for review panel auto-navigation:
 * - When agent uses analysis tools (extract_corrections / generate_drill),
 *   auto-navigate from input step to summary step.
 * - When agent response has no analysis tools, stay on input step.
 * - Manual tab navigation still works.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StreamCallbacks } from "../src/api/client";

let capturedCallbacks: StreamCallbacks | null = null;

vi.mock("../src/api/client", () => ({
  getTodayLesson: vi.fn().mockResolvedValue({
    id: 1,
    date: "2026-04-27",
    day_of_week: "monday",
    topic: null,
    script_text: null,
    questions: null,
    status: "prep",
    created_at: "2026-04-27",
  }),
  getErrorStats: vi.fn().mockResolvedValue({
    type_distribution: [],
    trend: [],
    total_corrections: 0,
    total_lessons: 0,
  }),
  getLessons: vi.fn().mockResolvedValue([]),
  getExpressions: vi.fn().mockResolvedValue([]),
  getLessonCorrections: vi.fn().mockResolvedValue([
    { id: 1, lesson_id: 1, original: "I go yesterday", corrected: "I went yesterday", explanation: "past tense", error_type: "tense", source: "feedback" },
  ]),
  getLessonDrills: vi.fn().mockResolvedValue([
    { id: 1, lesson_id: 1, correction_id: 1, drill_type: "fill_blank", question: "I ___ yesterday.", correct_answer: "went", is_completed: false },
  ]),
  resetChat: vi.fn().mockResolvedValue({ status: "cleared" }),
  streamChat: vi.fn((_msg: string, _mode: string, _lessonId: number | null, callbacks: StreamCallbacks) => {
    capturedCallbacks = callbacks;
    return { abort: vi.fn() };
  }),
  transcribeVoice: vi.fn(),
  generateReport: vi.fn().mockResolvedValue({
    filename: "review_2026-04-27_1.md",
    path: "/reports/review_2026-04-27_1.md",
    corrections_count: 1,
    drills_count: 1,
    content: "# Review Report\n\n## Corrections\n\n1. I go yesterday → I went yesterday",
  }),
  downloadReport: vi.fn().mockReturnValue("/api/reports/review_2026-04-27_1.md"),
  uploadRecording: vi.fn(),
  uploadScreenshot: vi.fn(),
  toggleDrill: vi.fn(),
  getLessonRecordings: vi.fn().mockResolvedValue([]),
  getRecordingFileUrl: vi.fn().mockReturnValue(""),
  getLesson: vi.fn().mockResolvedValue({}),
  saveConversations: vi.fn().mockResolvedValue({ status: "saved" }),
  getConversations: vi.fn().mockResolvedValue({}),
  deleteLesson: vi.fn().mockResolvedValue({ status: "deleted" }),
}));

vi.mock("../src/hooks/useVoiceInput", () => ({
  useVoiceInput: () => ({
    isRecording: false,
    isTranscribing: false,
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  Legend: () => null,
}));

import App from "../src/App";
import { _resetAllStores } from "../src/hooks/useChat";

beforeEach(() => {
  vi.clearAllMocks();
  _resetAllStores();
  capturedCallbacks = null;
});

async function goToReviewInput(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("수업 후 복습"));
}

describe("Review auto-navigation", () => {
  it("auto-navigates to summary when agent uses extract_corrections tool", async () => {
    const user = userEvent.setup();
    const { generateReport, getLessonCorrections } = await import("../src/api/client");

    await act(async () => {
      render(<App />);
    });
    await goToReviewInput(user);

    // Send a message via the chat input
    const chatTextarea = screen.getAllByRole("textbox").filter(
      (el) =>
        !el.closest('[style*="display: none"]') &&
        el.getAttribute("placeholder")?.includes("피드백 내용을 붙여넣거나"),
    )[0];
    await user.type(chatTextarea, "analyze feedback");
    const sendBtns = screen.getAllByText("전송").filter(
      (el) => !el.closest('[style*="display: none"]'),
    );
    await user.click(sendBtns[0]);

    // Simulate agent streaming with tool calls
    await act(async () => {
      capturedCallbacks!.onToolStart("extract_corrections");
      capturedCallbacks!.onToolResult("extract_corrections", { count: 1 });
      capturedCallbacks!.onTextDelta("분석 완료");
      capturedCallbacks!.onDone();
    });

    // Wait for async operations (generateReport, loadData)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Should have called generateReport and loadData
    expect(generateReport).toHaveBeenCalledWith(1);
    expect(getLessonCorrections).toHaveBeenCalledWith(1);

    // Summary tab should be active — look for summary-specific content
    expect(screen.getByText("분석 결과")).toBeInTheDocument();
    expect(screen.getByText("리포트 다운로드")).toBeInTheDocument();
  });

  it("auto-navigates to summary when agent uses generate_drill tool", async () => {
    const user = userEvent.setup();
    const { generateReport } = await import("../src/api/client");

    await act(async () => {
      render(<App />);
    });
    await goToReviewInput(user);

    const chatTextarea = screen.getAllByRole("textbox").filter(
      (el) =>
        !el.closest('[style*="display: none"]') &&
        el.getAttribute("placeholder")?.includes("피드백 내용을 붙여넣거나"),
    )[0];
    await user.type(chatTextarea, "create drills");
    const sendBtns = screen.getAllByText("전송").filter(
      (el) => !el.closest('[style*="display: none"]'),
    );
    await user.click(sendBtns[0]);

    await act(async () => {
      capturedCallbacks!.onToolStart("generate_drill");
      capturedCallbacks!.onToolResult("generate_drill", { count: 1 });
      capturedCallbacks!.onTextDelta("드릴 생성 완료");
      capturedCallbacks!.onDone();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(generateReport).toHaveBeenCalledWith(1);
  });

  it("does NOT auto-navigate when agent response has no analysis tools", async () => {
    const user = userEvent.setup();
    const { generateReport } = await import("../src/api/client");

    await act(async () => {
      render(<App />);
    });
    await goToReviewInput(user);

    const chatTextarea = screen.getAllByRole("textbox").filter(
      (el) =>
        !el.closest('[style*="display: none"]') &&
        el.getAttribute("placeholder")?.includes("피드백 내용을 붙여넣거나"),
    )[0];
    await user.type(chatTextarea, "what does this mean?");
    const sendBtns = screen.getAllByText("전송").filter(
      (el) => !el.closest('[style*="display: none"]'),
    );
    await user.click(sendBtns[0]);

    // Agent responds with text only — no tool calls
    await act(async () => {
      capturedCallbacks!.onTextDelta("It means...");
      capturedCallbacks!.onDone();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Should NOT have called generateReport — still on input step
    expect(generateReport).not.toHaveBeenCalled();

    // Input step content should still be visible
    expect(screen.getByText("녹음 업로드")).toBeInTheDocument();
    expect(screen.getByText("강사 피드백")).toBeInTheDocument();
  });

  it("sends correct mode to streamChat (review:input)", async () => {
    const user = userEvent.setup();
    const { streamChat } = await import("../src/api/client");

    await act(async () => {
      render(<App />);
    });
    await goToReviewInput(user);

    const chatTextarea = screen.getAllByRole("textbox").filter(
      (el) =>
        !el.closest('[style*="display: none"]') &&
        el.getAttribute("placeholder")?.includes("피드백 내용을 붙여넣거나"),
    )[0];
    await user.type(chatTextarea, "test");
    const sendBtns = screen.getAllByText("전송").filter(
      (el) => !el.closest('[style*="display: none"]'),
    );
    await user.click(sendBtns[0]);

    expect(streamChat).toHaveBeenCalledWith(
      "test",
      "review:input",
      1,
      expect.any(Object),
    );
  });

  it("manual summary tab click works even without tool events", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });
    await goToReviewInput(user);

    // Click summary tab manually
    await user.click(screen.getByText("2. 분석 결과"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Should show the summary view (may show empty state)
    const summaryTab = screen.getByText("2. 분석 결과");
    expect(summaryTab.className).toContain("border-blue-600");
  });

  it("FeedbackInput send also triggers auto-nav when agent uses tools", async () => {
    const user = userEvent.setup();
    const { generateReport } = await import("../src/api/client");

    await act(async () => {
      render(<App />);
    });
    await goToReviewInput(user);

    // Use FeedbackInput textarea (not the chat panel)
    const feedbackTextarea = screen.getByPlaceholderText(/강사 피드백을 붙여넣으세요/);
    await user.type(feedbackTextarea, "You should use past tense");

    // Click "피드백 분석" button
    await user.click(screen.getByText("피드백 분석"));

    // Simulate agent with tool calls
    await act(async () => {
      capturedCallbacks!.onToolStart("extract_corrections");
      capturedCallbacks!.onToolResult("extract_corrections", { count: 1 });
      capturedCallbacks!.onToolStart("generate_drill");
      capturedCallbacks!.onToolResult("generate_drill", { count: 1 });
      capturedCallbacks!.onTextDelta("분석 완료");
      capturedCallbacks!.onDone();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(generateReport).toHaveBeenCalledWith(1);
  });
});
