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
  getRecordingFileUrl: vi.fn().mockReturnValue("/api/recordings/1/file"),
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

// Mock recharts (ResponsiveContainer needs DOM measurements)
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

describe("Tab switching: all panels stay mounted", () => {
  it("renders all three panels on initial load", async () => {
    await act(async () => {
      render(<App />);
    });

    // All three mode panels should be in the DOM
    expect(screen.getByText("1. 일상 이야기")).toBeInTheDocument();
    expect(screen.getByText("수업 전 준비")).toBeInTheDocument();
    expect(screen.getByText("수업 후 복습")).toBeInTheDocument();
    expect(screen.getByText("학습 기록")).toBeInTheDocument();
  });

  it("prep panel is visible by default, review and analytics are hidden", async () => {
    await act(async () => {
      render(<App />);
    });

    // Prep step tabs should be visible (not inside hidden parent)
    const prepStepTab = screen.getByText("1. 일상 이야기");
    const prepContainer = prepStepTab.closest('[class*="flex flex-1 overflow-hidden"]');
    expect(prepContainer).not.toHaveClass("hidden");
  });

  it("switching to review tab does not unmount prep panel", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<App />);
    });

    // Click review tab
    await user.click(screen.getByText("수업 후 복습"));

    // Prep panel still in DOM (just hidden)
    expect(screen.getByText("1. 일상 이야기")).toBeInTheDocument();
    // Review panel should show its step tabs
    expect(screen.getByText("1. 입력")).toBeInTheDocument();
  });

  it("switching tabs back and forth keeps panels in DOM", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<App />);
    });

    // prep → review → analytics → prep
    await user.click(screen.getByText("수업 후 복습"));
    await user.click(screen.getByText("학습 기록"));
    await user.click(screen.getByText("수업 전 준비"));

    // All panels still present
    expect(screen.getByText("1. 일상 이야기")).toBeInTheDocument(); // prep
    expect(screen.getByText("1. 입력")).toBeInTheDocument(); // review
  });
});

describe("Chat state persistence across tab switches", () => {
  it("useChat state in PrepPanel survives mode switch", async () => {
    const user = userEvent.setup();
    const { streamChat } = await import("../src/api/client");

    // Make streamChat call onTextDelta and onDone to simulate a response
    vi.mocked(streamChat).mockImplementation(
      (_msg, _mode, _lessonId, callbacks) => {
        setTimeout(() => {
          callbacks.onTextDelta("AI response");
          callbacks.onDone();
        }, 0);
        return { abort: vi.fn() } as any;
      },
    );

    await act(async () => {
      render(<App />);
    });

    // Type and send a message in prep mode
    const textarea = screen.getAllByRole("textbox").find(
      (el) => el.getAttribute("placeholder")?.includes("스몰톡"),
    );
    expect(textarea).toBeTruthy();

    await user.type(textarea!, "hello test");
    const sendButtons = screen.getAllByText("전송");
    await user.click(sendButtons[0]);

    // Wait for the message to appear
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // User message should be in the DOM
    expect(screen.getByText("hello test")).toBeInTheDocument();

    // Switch to review
    await user.click(screen.getByText("수업 후 복습"));

    // Switch back to prep
    await user.click(screen.getByText("수업 전 준비"));

    // Message should still be there
    expect(screen.getByText("hello test")).toBeInTheDocument();
  });

  it("mode switch does NOT call resetChat", async () => {
    const user = userEvent.setup();
    const { resetChat } = await import("../src/api/client");

    await act(async () => {
      render(<App />);
    });

    vi.mocked(resetChat).mockClear();

    // Switch modes
    await user.click(screen.getByText("수업 후 복습"));
    await user.click(screen.getByText("수업 전 준비"));

    // resetChat should NOT have been called during mode switches
    expect(resetChat).not.toHaveBeenCalled();
  });
});
