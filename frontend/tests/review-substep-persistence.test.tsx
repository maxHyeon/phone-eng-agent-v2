import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock all API calls
vi.mock("../src/api/client", () => ({
  getTodayLesson: vi.fn().mockResolvedValue({
    id: 1,
    date: "2026-04-20",
    day_of_week: "monday",
    topic: null,
    script_text: null,
    questions: null,
    status: "prep",
    created_at: "2026-04-20",
  }),
  getErrorStats: vi.fn().mockResolvedValue({
    type_distribution: [],
    trend: [],
    total_corrections: 0,
    total_lessons: 0,
  }),
  getLessons: vi.fn().mockResolvedValue([]),
  getExpressions: vi.fn().mockResolvedValue([]),
  getLessonCorrections: vi.fn().mockResolvedValue([]),
  getLessonDrills: vi.fn().mockResolvedValue([]),
  resetChat: vi.fn().mockResolvedValue({ status: "cleared" }),
  streamChat: vi.fn().mockReturnValue({ abort: vi.fn() }),
  transcribeVoice: vi.fn(),
  generateReport: vi.fn().mockResolvedValue({
    filename: "report.md",
    path: "/reports/report.md",
    corrections_count: 0,
    drills_count: 0,
    content: "# Report",
  }),
  downloadReport: vi.fn().mockReturnValue("/api/reports/report.md"),
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

// Mock useVoiceInput to avoid navigator.mediaDevices
vi.mock("../src/hooks/useVoiceInput", () => ({
  useVoiceInput: () => ({
    isRecording: false,
    isTranscribing: false,
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

// Mock recharts
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
});

/** Helper: navigate to review mode */
async function goToReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("수업 후 복습"));
}

describe("Review sub-step persistence", () => {
  it("all review sub-step panels are always mounted", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<App />);
    });

    await goToReview(user);

    // Input step content (visible by default)
    expect(screen.getByText("녹음 업로드")).toBeInTheDocument();
    expect(screen.getByText("강사 피드백")).toBeInTheDocument();

    // Writing step content (hidden but mounted — its ChatPanel has the textarea)
    // Summary/Drill panels also mounted
    expect(screen.getByText("1. 입력")).toBeInTheDocument();
    expect(screen.getByText("2. 분석 결과")).toBeInTheDocument();
    expect(screen.getByText("3. 드릴 연습")).toBeInTheDocument();
    expect(screen.getByText("4. 자유 작문")).toBeInTheDocument();
  });

  it("switching review sub-steps does NOT call resetChat", async () => {
    const user = userEvent.setup();
    const { resetChat } = await import("../src/api/client");

    await act(async () => {
      render(<App />);
    });

    await goToReview(user);
    vi.mocked(resetChat).mockClear();

    // Navigate through sub-steps
    await user.click(screen.getByText("2. 분석 결과"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await user.click(screen.getByText("3. 드릴 연습"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await user.click(screen.getByText("4. 자유 작문"));
    await user.click(screen.getByText("1. 입력"));

    expect(resetChat).not.toHaveBeenCalled();
  });

  it("FeedbackInput textarea survives sub-step switch", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await goToReview(user);

    // Type in feedback textarea
    const feedbackTextarea = screen.getByPlaceholderText(
      /강사 피드백을 붙여넣으세요/,
    );
    await user.type(feedbackTextarea, "pronunciation was great");

    // Switch to drill then back to input
    await user.click(screen.getByText("3. 드릴 연습"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await user.click(screen.getByText("1. 입력"));

    expect(feedbackTextarea).toHaveValue("pronunciation was great");
  });

  it("input chat messages survive sub-step switch", async () => {
    const user = userEvent.setup();
    const { streamChat } = await import("../src/api/client");

    vi.mocked(streamChat).mockImplementation(
      (_msg, _mode, _lessonId, callbacks) => {
        setTimeout(() => {
          callbacks.onTextDelta("AI analysis result");
          callbacks.onDone();
        }, 0);
        return { abort: vi.fn() } as any;
      },
    );

    await act(async () => {
      render(<App />);
    });

    await goToReview(user);

    // Find the visible chat textarea in review input step
    // The chat input placeholder for review mode is "피드백 내용을 붙여넣거나 질문하세요..."
    const chatTextarea = screen.getAllByRole("textbox").filter(
      (el) =>
        !el.closest('[style*="display: none"]') &&
        el.getAttribute("placeholder")?.includes("피드백 내용을 붙여넣거나"),
    )[0];
    expect(chatTextarea).toBeTruthy();

    await user.type(chatTextarea!, "analyze my recording");
    const sendButtons = screen.getAllByText("전송").filter(
      (el) => !el.closest('[style*="display: none"]'),
    );
    await user.click(sendButtons[0]);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("analyze my recording")).toBeInTheDocument();

    // Switch to summary then back
    await user.click(screen.getByText("2. 분석 결과"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await user.click(screen.getByText("1. 입력"));

    expect(screen.getByText("analyze my recording")).toBeInTheDocument();
  });

  it("input and writing have independent chat state", async () => {
    const user = userEvent.setup();
    const { streamChat } = await import("../src/api/client");

    let callCount = 0;
    vi.mocked(streamChat).mockImplementation(
      (_msg, _mode, _lessonId, callbacks) => {
        callCount++;
        const resp = callCount === 1 ? "input-response" : "writing-response";
        setTimeout(() => {
          callbacks.onTextDelta(resp);
          callbacks.onDone();
        }, 0);
        return { abort: vi.fn() } as any;
      },
    );

    await act(async () => {
      render(<App />);
    });

    await goToReview(user);

    // Send in input step — chat placeholder for review is "피드백 내용을 붙여넣거나 질문하세요..."
    const chatTextarea = screen.getAllByRole("textbox").filter(
      (el) =>
        !el.closest('[style*="display: none"]') &&
        el.getAttribute("placeholder")?.includes("피드백 내용을 붙여넣거나"),
    )[0];
    expect(chatTextarea).toBeTruthy();
    await user.type(chatTextarea, "input-msg");
    const sendBtns = screen.getAllByText("전송").filter(
      (el) => !el.closest('[style*="display: none"]'),
    );
    await user.click(sendBtns[0]);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("input-response")).toBeInTheDocument();

    // Switch to writing and send there
    await user.click(screen.getByText("4. 자유 작문"));

    const writingTextarea = screen.getAllByRole("textbox").filter(
      (el) =>
        !el.closest('[style*="display: none"]') &&
        el.getAttribute("placeholder")?.includes("피드백 내용을 붙여넣거나"),
    )[0];
    await user.type(writingTextarea, "writing-msg");
    const writeSendBtns = screen.getAllByText("전송").filter(
      (el) => !el.closest('[style*="display: none"]'),
    );
    await user.click(writeSendBtns[0]);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("writing-response")).toBeInTheDocument();

    // Switch back to input — its chat should still have "input-response"
    await user.click(screen.getByText("1. 입력"));
    expect(screen.getByText("input-response")).toBeInTheDocument();
  });
});
