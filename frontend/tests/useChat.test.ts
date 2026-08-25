import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { StreamCallbacks } from "../src/api/client";

const abortFn = vi.fn();
let capturedCallbacks: StreamCallbacks;

vi.mock("../src/api/client", () => ({
  streamChat: vi.fn(
    (_msg: string, _mode: string, _lessonId: number | null, callbacks: StreamCallbacks) => {
      capturedCallbacks = callbacks;
      return { abort: abortFn };
    },
  ),
}));

import { useChat, _resetAllStores } from "../src/hooks/useChat";

beforeEach(() => {
  vi.clearAllMocks();
  _resetAllStores();
});

describe("useChat", () => {
  it("sendMessage adds user + assistant messages", () => {
    const { result } = renderHook(() => useChat("test-1"));

    act(() => {
      result.current.sendMessage("hello", "prep", 1);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({ role: "user", content: "hello" });
    expect(result.current.messages[1]).toEqual({ role: "assistant", content: "", toolEvents: [] });
    expect(result.current.isStreaming).toBe(true);
  });

  it("onTextDelta appends to last message", () => {
    const { result } = renderHook(() => useChat("test-2"));

    act(() => result.current.sendMessage("hi", "prep", 1));
    act(() => capturedCallbacks.onTextDelta("Hello "));
    act(() => capturedCallbacks.onTextDelta("world"));

    expect(result.current.messages[1].content).toBe("Hello world");
  });

  it("onTextDelta does NOT crash when messages are empty", () => {
    const { result } = renderHook(() => useChat("test-3"));

    act(() => result.current.sendMessage("hi", "prep", 1));
    act(() => result.current.clear());

    expect(() => {
      act(() => capturedCallbacks.onTextDelta("late data"));
    }).not.toThrow();

    expect(result.current.messages).toHaveLength(0);
  });

  it("onToolStart does NOT crash when messages are empty", () => {
    const { result } = renderHook(() => useChat("test-4"));

    act(() => result.current.sendMessage("hi", "prep", 1));
    act(() => result.current.clear());

    expect(() => {
      act(() => capturedCallbacks.onToolStart("some_tool"));
    }).not.toThrow();
  });

  it("onToolResult does NOT crash when messages are empty", () => {
    const { result } = renderHook(() => useChat("test-5"));

    act(() => result.current.sendMessage("hi", "prep", 1));
    act(() => result.current.clear());

    expect(() => {
      act(() => capturedCallbacks.onToolResult("some_tool", { ok: true }));
    }).not.toThrow();
  });

  it("clear aborts active stream and resets state", () => {
    const { result } = renderHook(() => useChat("test-6"));

    act(() => result.current.sendMessage("hi", "prep", 1));
    expect(result.current.isStreaming).toBe(true);

    act(() => result.current.clear());

    expect(abortFn).toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isStreaming).toBe(false);
  });

  it("messages persist across rerenders", () => {
    const { result, rerender } = renderHook(() => useChat("test-7"));

    act(() => result.current.sendMessage("hello", "prep", 1));
    act(() => capturedCallbacks.onTextDelta("response"));
    act(() => capturedCallbacks.onDone());

    rerender();

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe("hello");
    expect(result.current.messages[1].content).toBe("response");
    expect(result.current.isStreaming).toBe(false);
  });

  it("state survives unmount and remount with same key", () => {
    // First mount — send a message
    const { result, unmount } = renderHook(() => useChat("persist-key"));

    act(() => result.current.sendMessage("hello", "prep", 1));
    act(() => capturedCallbacks.onTextDelta("world"));
    act(() => capturedCallbacks.onDone());

    expect(result.current.messages).toHaveLength(2);

    // Unmount
    unmount();

    // Remount with same key — messages should still be there
    const { result: result2 } = renderHook(() => useChat("persist-key"));
    expect(result2.current.messages).toHaveLength(2);
    expect(result2.current.messages[0].content).toBe("hello");
    expect(result2.current.messages[1].content).toBe("world");
  });

  it("different keys have independent state", () => {
    const { result: r1 } = renderHook(() => useChat("key-a"));
    const { result: r2 } = renderHook(() => useChat("key-b"));

    act(() => r1.current.sendMessage("msg-a", "prep", 1));

    expect(r1.current.messages).toHaveLength(2);
    expect(r2.current.messages).toHaveLength(0);
  });
});
