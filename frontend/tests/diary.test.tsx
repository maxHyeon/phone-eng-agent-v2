/**
 * Tests for Diary feature components.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock API client
const mockGetDiaryDates = vi.fn();
const mockGetDiaryByDate = vi.fn();
const mockCreateDiary = vi.fn();
const mockUpdateDiaryMemo = vi.fn();
const mockDeleteDiary = vi.fn();

vi.mock("../src/api/client", () => ({
  getDiaryDates: (...args: any[]) => mockGetDiaryDates(...args),
  getDiaryByDate: (...args: any[]) => mockGetDiaryByDate(...args),
  createDiary: (...args: any[]) => mockCreateDiary(...args),
  updateDiaryMemo: (...args: any[]) => mockUpdateDiaryMemo(...args),
  deleteDiary: (...args: any[]) => mockDeleteDiary(...args),
}));

import DiaryTab from "../src/components/diary/DiaryTab";
import DiaryCalendar from "../src/components/diary/DiaryCalendar";
import DiaryEntryCard from "../src/components/diary/DiaryEntryCard";
import DiaryWriteForm from "../src/components/diary/DiaryWriteForm";
import type { DiaryEntry } from "../src/types";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDiaryDates.mockResolvedValue([]);
  mockGetDiaryByDate.mockResolvedValue([]);
  mockCreateDiary.mockResolvedValue({
    id: 1,
    date: "2026-05-27",
    user_input: "test",
    ai_output: "test corrected",
    memo: null,
    source: "manual",
    lesson_id: null,
    created_at: "2026-05-27T10:00:00",
    updated_at: "2026-05-27T10:00:00",
  });
});

describe("DiaryCalendar", () => {
  it("renders current month and year", async () => {
    await act(async () => {
      render(<DiaryCalendar selectedDate="2026-05-27" onSelectDate={() => {}} />);
    });
    expect(screen.getByText(/2026년/)).toBeInTheDocument();
    expect(screen.getByText(/5월/)).toBeInTheDocument();
  });

  it("calls onSelectDate when a day is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    await act(async () => {
      render(<DiaryCalendar selectedDate="2026-05-27" onSelectDate={onSelect} />);
    });

    await user.click(screen.getByText("15"));
    expect(onSelect).toHaveBeenCalledWith("2026-05-15");
  });

  it("shows dot indicator for dates with entries", async () => {
    mockGetDiaryDates.mockResolvedValue(["2026-05-10", "2026-05-20"]);

    await act(async () => {
      render(<DiaryCalendar selectedDate="2026-05-27" onSelectDate={() => {}} />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Day 10 button should have a dot (span inside)
    const day10 = screen.getByText("10");
    const dot = day10.parentElement?.querySelector("span.rounded-full");
    expect(dot).toBeTruthy();
  });

  it("navigates to previous month", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<DiaryCalendar selectedDate="2026-05-27" onSelectDate={() => {}} />);
    });

    // Find the prev button (first button in the header with the chevron)
    const buttons = screen.getAllByRole("button");
    const prevBtn = buttons[0]; // First button is the prev month arrow
    await user.click(prevBtn);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText(/4월/)).toBeInTheDocument();
  });
});

describe("DiaryEntryCard", () => {
  const manualEntry: DiaryEntry = {
    id: 1,
    date: "2026-05-27",
    user_input: "오늘 좋은 하루였다",
    ai_output: "Today was a good day.",
    memo: "기분 좋음",
    source: "manual",
    lesson_id: null,
    created_at: "2026-05-27T20:00:00",
    updated_at: "2026-05-27T20:00:00",
  };

  const lessonEntry: DiaryEntry = {
    id: 1000001,
    date: "2026-05-27",
    user_input: "어제 부모님 오셨어요",
    ai_output: "My parents came over yesterday.",
    memo: null,
    source: "lesson",
    lesson_id: 1,
    created_at: "2026-05-27T09:00:00",
    updated_at: "2026-05-27T09:00:00",
  };

  it("renders user input and AI output", () => {
    render(<DiaryEntryCard entry={manualEntry} onUpdated={() => {}} />);
    expect(screen.getByText("오늘 좋은 하루였다")).toBeInTheDocument();
    expect(screen.getByText("Today was a good day.")).toBeInTheDocument();
  });

  it("shows source badge for manual entry", () => {
    render(<DiaryEntryCard entry={manualEntry} onUpdated={() => {}} />);
    expect(screen.getByText("직접작성")).toBeInTheDocument();
  });

  it("shows source badge for lesson entry", () => {
    render(<DiaryEntryCard entry={lessonEntry} onUpdated={() => {}} />);
    expect(screen.getByText("수업")).toBeInTheDocument();
  });

  it("shows memo if present", () => {
    render(<DiaryEntryCard entry={manualEntry} onUpdated={() => {}} />);
    expect(screen.getByText(/기분 좋음/)).toBeInTheDocument();
  });

  it("shows delete button only for manual entries", () => {
    const { unmount } = render(<DiaryEntryCard entry={manualEntry} onUpdated={() => {}} />);
    expect(screen.getByText("삭제")).toBeInTheDocument();
    unmount();

    render(<DiaryEntryCard entry={lessonEntry} onUpdated={() => {}} />);
    expect(screen.queryByText("삭제")).not.toBeInTheDocument();
  });
});

describe("DiaryWriteForm (modal)", () => {
  it("does not render when isOpen is false", () => {
    render(
      <DiaryWriteForm isOpen={false} date="2026-05-27" onClose={() => {}} onCreated={() => {}} />,
    );
    expect(screen.queryByText("일기 쓰기")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true", () => {
    render(
      <DiaryWriteForm isOpen={true} date="2026-05-27" onClose={() => {}} onCreated={() => {}} />,
    );
    expect(screen.getByText("일기 쓰기")).toBeInTheDocument();
    expect(screen.getByText(/2026-05-27/)).toBeInTheDocument();
  });

  it("submit button is disabled when input is empty", () => {
    render(
      <DiaryWriteForm isOpen={true} date="2026-05-27" onClose={() => {}} onCreated={() => {}} />,
    );
    const btn = screen.getByText("작성하기");
    expect(btn).toBeDisabled();
  });

  it("calls createDiary and onCreated on submit", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <DiaryWriteForm isOpen={true} date="2026-05-27" onClose={onClose} onCreated={onCreated} />,
    );

    const textarea = screen.getByPlaceholderText("한국어 또는 영어로 자유롭게 작성하세요...");
    await user.type(textarea, "오늘 카페 갔다");

    await user.click(screen.getByText("작성하기"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockCreateDiary).toHaveBeenCalledWith({
      date: "2026-05-27",
      user_input: "오늘 카페 갔다",
    });
    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe("DiaryTab integration", () => {
  it("renders calendar and write button", async () => {
    await act(async () => {
      render(<DiaryTab />);
    });

    expect(screen.getByText("+ 새로운 일기 쓰기")).toBeInTheDocument();
  });

  it("opens write modal when button is clicked", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<DiaryTab />);
    });

    await user.click(screen.getByText("+ 새로운 일기 쓰기"));
    expect(screen.getByText("일기 쓰기")).toBeInTheDocument();
  });
});
