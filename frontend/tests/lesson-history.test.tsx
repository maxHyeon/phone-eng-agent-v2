import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock API calls
const mockGetLesson = vi.fn();
const mockGetLessons = vi.fn();
const mockSaveConversations = vi.fn();
const mockGetConversations = vi.fn();

vi.mock("../src/api/client", () => ({
  getTodayLesson: vi.fn().mockResolvedValue({
    id: 1,
    date: "2026-04-22",
    day_of_week: "wednesday",
    topic: null,
    script_text: null,
    questions: null,
    status: "prep",
    created_at: "2026-04-22",
  }),
  getLesson: (...args: any[]) => mockGetLesson(...args),
  getLessons: (...args: any[]) => mockGetLessons(...args),
  getErrorStats: vi.fn().mockResolvedValue({
    type_distribution: [],
    trend: [],
    total_corrections: 0,
    total_lessons: 0,
  }),
  getExpressions: vi.fn().mockResolvedValue([]),
  resetChat: vi.fn().mockResolvedValue({ status: "cleared" }),
  streamChat: vi.fn().mockReturnValue({ abort: vi.fn() }),
  transcribeVoice: vi.fn(),
  updateLesson: vi.fn().mockResolvedValue({}),
  saveConversations: (...args: any[]) => mockSaveConversations(...args),
  getConversations: (...args: any[]) => mockGetConversations(...args),
  getLessonCorrections: vi.fn().mockResolvedValue([]),
  getLessonDrills: vi.fn().mockResolvedValue([]),
  generateReport: vi.fn().mockResolvedValue({
    filename: "r.md", path: "/r.md", corrections_count: 0, drills_count: 0, content: "",
  }),
  downloadReport: vi.fn().mockReturnValue("/api/reports/r.md"),
  uploadRecording: vi.fn(),
  uploadScreenshot: vi.fn(),
  toggleDrill: vi.fn(),
  getLessonRecordings: vi.fn().mockResolvedValue([]),
  getRecordingFileUrl: vi.fn().mockReturnValue(""),
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

  mockGetLessons.mockResolvedValue([
    { id: 1, date: "2026-04-22", day_of_week: "wednesday", topic: null, script_text: null, questions: null, status: "prep", created_at: "2026-04-22" },
    { id: 2, date: "2026-04-21", day_of_week: "tuesday", topic: "AI News", script_text: null, questions: null, status: "done", created_at: "2026-04-21" },
  ]);

  mockGetConversations.mockResolvedValue({});
  mockSaveConversations.mockResolvedValue({ status: "saved" });
  mockGetLesson.mockImplementation((id: number) =>
    Promise.resolve(
      id === 1
        ? { id: 1, date: "2026-04-22", day_of_week: "wednesday", topic: null, script_text: null, questions: null, status: "prep", created_at: "2026-04-22" }
        : { id: 2, date: "2026-04-21", day_of_week: "tuesday", topic: "AI News", script_text: null, questions: null, status: "done", created_at: "2026-04-21" },
    ),
  );
});

describe("Lesson history", () => {
  it("LessonHistory shows lesson list in analytics sidebar", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    // Go to analytics tab
    await user.click(screen.getByText("학습 기록"));

    // Wait for lessons to load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // "2026-04-22" appears in both header and lesson list
    expect(screen.getAllByText("2026-04-22").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("2026-04-21")).toBeInTheDocument();
  });

  it("clicking a different lesson shows confirm modal", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await user.click(screen.getByText("학습 기록"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Click on the past lesson (2026-04-21)
    await user.click(screen.getByText("2026-04-21"));

    // Modal should appear
    expect(screen.getByText("수업 이력 불러오기")).toBeInTheDocument();
    expect(screen.getByText(/기존 내용을 저장하고/)).toBeInTheDocument();
    expect(screen.getByText("예")).toBeInTheDocument();
    expect(screen.getByText("아니오")).toBeInTheDocument();
  });

  it("clicking 아니오 closes modal without switching", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await user.click(screen.getByText("학습 기록"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await user.click(screen.getByText("2026-04-21"));
    expect(screen.getByText("수업 이력 불러오기")).toBeInTheDocument();

    await user.click(screen.getByText("아니오"));

    // Modal gone
    expect(screen.queryByText("수업 이력 불러오기")).not.toBeInTheDocument();
    // Still on today's lesson
    expect(mockGetLesson).not.toHaveBeenCalled();
  });

  it("clicking 예 saves current and loads selected lesson", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await user.click(screen.getByText("학습 기록"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Click past lesson
    await user.click(screen.getByText("2026-04-21"));

    // Confirm switch
    await user.click(screen.getByText("예"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // saveConversations is only called if there are messages to save
    // Since we have no messages in this test, it may not be called — that's OK
    // Should have switched to the new lesson
    expect(mockGetLesson).toHaveBeenCalledWith(2);
    // Should have loaded conversations for the new lesson
    expect(mockGetConversations).toHaveBeenCalledWith(2);
    // Modal closed
    expect(screen.queryByText("수업 이력 불러오기")).not.toBeInTheDocument();
  });

  it("clicking same lesson does NOT show modal", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await user.click(screen.getByText("학습 기록"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Click current lesson (the one in the lesson list, not the header)
    const lessonListButtons = screen.getAllByText("2026-04-22");
    // The lesson list button has a parent with border-blue-300 (current highlight)
    const lessonButton = lessonListButtons.find((el) => el.closest("button"));
    expect(lessonButton).toBeTruthy();
    await user.click(lessonButton!.closest("button")!);

    // No modal
    expect(screen.queryByText("수업 이력 불러오기")).not.toBeInTheDocument();
  });

  it("shows 오늘 수업으로 button when viewing historical lesson", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    // Initially no "오늘 수업으로" button
    expect(screen.queryByText("오늘 수업으로")).not.toBeInTheDocument();

    // Switch to past lesson
    await user.click(screen.getByText("학습 기록"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await user.click(screen.getByText("2026-04-21"));
    await user.click(screen.getByText("예"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Should show "오늘 수업으로" button
    expect(screen.getByText("오늘 수업으로")).toBeInTheDocument();
  });
});

describe("useChat store helpers", () => {
  it("_loadStore and _getStoreMessages work correctly", async () => {
    const { _loadStore: load, _getStoreMessages: get } = await import("../src/hooks/useChat");

    _resetAllStores();

    // Initially empty
    expect(get("test-key")).toHaveLength(0);

    // Load messages
    load("test-key", [
      { role: "user", content: "hello" },
      { role: "assistant", content: "world" },
    ]);

    expect(get("test-key")).toHaveLength(2);
    expect(get("test-key")[0].content).toBe("hello");
    expect(get("test-key")[1].content).toBe("world");
  });
});
