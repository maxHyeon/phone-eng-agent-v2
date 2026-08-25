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
  resetChat: vi.fn().mockResolvedValue({ status: "cleared" }),
  streamChat: vi.fn().mockReturnValue({ abort: vi.fn() }),
  transcribeVoice: vi.fn(),
  getLessonRecordings: vi.fn().mockResolvedValue([]),
  getRecordingFileUrl: vi.fn().mockReturnValue(""),
  getLesson: vi.fn().mockResolvedValue({}),
  saveConversations: vi.fn().mockResolvedValue({ status: "saved" }),
  getConversations: vi.fn().mockResolvedValue({}),
  getLessonCorrections: vi.fn().mockResolvedValue([]),
  getLessonDrills: vi.fn().mockResolvedValue([]),
  generateReport: vi.fn().mockResolvedValue({ filename: "", path: "", corrections_count: 0, drills_count: 0, content: "" }),
  downloadReport: vi.fn().mockReturnValue(""),
  uploadRecording: vi.fn(),
  uploadScreenshot: vi.fn(),
  toggleDrill: vi.fn(),
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

describe("Prep sub-step persistence", () => {
  it("all three sub-step panels are always mounted", async () => {
    await act(async () => {
      render(<App />);
    });

    // Smalltalk panel content (visible by default)
    expect(screen.getByText("일상 이야기 준비")).toBeInTheDocument();
    // Article panel content (hidden but mounted)
    expect(screen.getByText("토픽 / 기사")).toBeInTheDocument();
  });

  it("switching sub-steps does NOT call resetChat", async () => {
    const user = userEvent.setup();
    const { resetChat } = await import("../src/api/client");

    await act(async () => {
      render(<App />);
    });

    vi.mocked(resetChat).mockClear();

    // Switch from smalltalk to article
    await user.click(screen.getByText("2. 기사 분석"));
    // Switch to freetalk
    await user.click(screen.getByText("3. 프리토킹"));
    // Switch back to smalltalk
    await user.click(screen.getByText("1. 일상 이야기"));

    expect(resetChat).not.toHaveBeenCalled();
  });

  it("DailyStoryInput textarea content survives sub-step switch", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    // Type in past story textarea (first textarea in DailyStoryInput)
    const pastTextarea = screen.getByPlaceholderText(
      /주말에 가족과 브런치를 먹으러/,
    );
    await user.type(pastTextarea, "어제 카페에 갔어요");

    // Switch to article
    await user.click(screen.getByText("2. 기사 분석"));

    // Switch back to smalltalk
    await user.click(screen.getByText("1. 일상 이야기"));

    // Textarea value should be preserved
    expect(pastTextarea).toHaveValue("어제 카페에 갔어요");
  });

  it("chat messages in smalltalk survive sub-step switch", async () => {
    const user = userEvent.setup();
    const { streamChat } = await import("../src/api/client");

    vi.mocked(streamChat).mockImplementation(
      (_msg, _mode, _lessonId, callbacks) => {
        setTimeout(() => {
          callbacks.onTextDelta("AI response for smalltalk");
          callbacks.onDone();
        }, 0);
        return { abort: vi.fn() } as any;
      },
    );

    await act(async () => {
      render(<App />);
    });

    // Send a message in the smalltalk chat panel
    // The smalltalk chat is in the flex-[3] section
    const textareas = screen.getAllByRole("textbox");
    const chatTextarea = textareas.find(
      (el) => el.getAttribute("placeholder")?.includes("스몰톡"),
    );
    expect(chatTextarea).toBeTruthy();

    await user.type(chatTextarea!, "hello smalltalk");
    const sendButtons = screen.getAllByText("전송");
    await user.click(sendButtons[0]);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("hello smalltalk")).toBeInTheDocument();

    // Switch to article and back
    await user.click(screen.getByText("2. 기사 분석"));
    await user.click(screen.getByText("1. 일상 이야기"));

    // Message should still be there
    expect(screen.getByText("hello smalltalk")).toBeInTheDocument();
  });

  it("each sub-step has independent chat state", async () => {
    const user = userEvent.setup();
    const { streamChat } = await import("../src/api/client");

    let callCount = 0;
    vi.mocked(streamChat).mockImplementation(
      (_msg, _mode, _lessonId, callbacks) => {
        callCount++;
        const resp = callCount === 1 ? "response-smalltalk" : "response-freetalk";
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

    // Send in smalltalk
    const chatTextarea = screen.getAllByRole("textbox").find(
      (el) => el.getAttribute("placeholder")?.includes("스몰톡"),
    );
    await user.type(chatTextarea!, "msg-smalltalk");
    const sendButtons = screen.getAllByText("전송");
    await user.click(sendButtons[0]);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText("msg-smalltalk")).toBeInTheDocument();
    expect(screen.getByText("response-smalltalk")).toBeInTheDocument();

    // Switch to freetalk and send there
    await user.click(screen.getByText("3. 프리토킹"));

    // Find freetalk's chat textarea (should now be visible)
    const freetalkTextarea = screen.getAllByRole("textbox").find(
      (el) => !el.closest('[style*="display: none"]'),
    );
    expect(freetalkTextarea).toBeTruthy();

    await user.type(freetalkTextarea!, "msg-freetalk");
    const sendBtns2 = screen.getAllByText("전송").filter(
      (el) => !el.closest('[style*="display: none"]'),
    );
    await user.click(sendBtns2[0]);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Freetalk should have its own messages
    expect(screen.getByText("response-freetalk")).toBeInTheDocument();

    // Switch back to smalltalk — it should NOT have freetalk messages mixed in
    await user.click(screen.getByText("1. 일상 이야기"));
    expect(screen.getByText("response-smalltalk")).toBeInTheDocument();
  });

  it("TopicInput fields survive sub-step switch", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    // Switch to article step
    await user.click(screen.getByText("2. 기사 분석"));

    // Type in topic input
    const topicInput = screen.getByPlaceholderText("토픽");
    await user.type(topicInput, "AI and Education");

    // Switch to freetalk then back to article
    await user.click(screen.getByText("3. 프리토킹"));
    await user.click(screen.getByText("2. 기사 분석"));

    // Topic should be preserved
    expect(topicInput).toHaveValue("AI and Education");
  });
});
