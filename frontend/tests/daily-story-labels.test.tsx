/**
 * Tests for DailyStoryInput future label logic:
 * - Friday: "주말에 어떤 계획이 있으신가요?"
 * - Saturday/Sunday: "주말에 어떤 계획이 있으신가요?"
 * - Other weekdays (Mon-Thu): "오늘은 무슨 일을 하실 계획이세요?"
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DailyStoryInput from "../src/components/prep/DailyStoryInput";
import type { Lesson } from "../src/types";

function makeLesson(day_of_week: string): Lesson {
  return {
    id: 1,
    date: "2026-05-08",
    day_of_week,
    topic: null,
    script_text: null,
    questions: null,
    status: "prep",
    created_at: "2026-05-08",
  };
}

describe("DailyStoryInput future label", () => {
  it("shows weekend plan label on friday", () => {
    render(<DailyStoryInput lesson={makeLesson("friday")} onSend={() => {}} />);
    expect(screen.getByText("주말에 어떤 계획이 있으신가요?")).toBeInTheDocument();
  });

  it("shows weekend plan label on saturday", () => {
    render(<DailyStoryInput lesson={makeLesson("saturday")} onSend={() => {}} />);
    expect(screen.getByText("주말에 어떤 계획이 있으신가요?")).toBeInTheDocument();
  });

  it("shows weekend plan label on sunday", () => {
    render(<DailyStoryInput lesson={makeLesson("sunday")} onSend={() => {}} />);
    expect(screen.getByText("주말에 어떤 계획이 있으신가요?")).toBeInTheDocument();
  });

  it("shows today plan label on monday", () => {
    render(<DailyStoryInput lesson={makeLesson("monday")} onSend={() => {}} />);
    expect(screen.getByText("오늘은 무슨 일을 하실 계획이세요?")).toBeInTheDocument();
  });

  it("shows today plan label on wednesday", () => {
    render(<DailyStoryInput lesson={makeLesson("wednesday")} onSend={() => {}} />);
    expect(screen.getByText("오늘은 무슨 일을 하실 계획이세요?")).toBeInTheDocument();
  });

  it("shows today plan label on thursday", () => {
    render(<DailyStoryInput lesson={makeLesson("thursday")} onSend={() => {}} />);
    expect(screen.getByText("오늘은 무슨 일을 하실 계획이세요?")).toBeInTheDocument();
  });

  it("does NOT show today plan label on friday", () => {
    render(<DailyStoryInput lesson={makeLesson("friday")} onSend={() => {}} />);
    expect(screen.queryByText("오늘은 무슨 일을 하실 계획이세요?")).not.toBeInTheDocument();
  });
});

describe("DailyStoryInput past label", () => {
  it("shows weekend past label on monday", () => {
    render(<DailyStoryInput lesson={makeLesson("monday")} onSend={() => {}} />);
    expect(screen.getByText("주말간 무슨 일을 하셨나요?")).toBeInTheDocument();
  });

  it("shows yesterday label on weekdays (tue-fri)", () => {
    render(<DailyStoryInput lesson={makeLesson("wednesday")} onSend={() => {}} />);
    expect(screen.getByText("어제 무슨 일을 하셨나요?")).toBeInTheDocument();
  });
});
