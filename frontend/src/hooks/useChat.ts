import { useCallback, useRef, useSyncExternalStore } from "react";
import type { ChatMessage, ToolEvent, Mode } from "../types";
import { streamChat } from "../api/client";

// ---- Module-level store (survives component unmount/remount) ----

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
}

const stores = new Map<string, ChatState>();
const listeners = new Set<() => void>();

function getState(key: string): ChatState {
  let s = stores.get(key);
  if (!s) {
    s = { messages: [], isStreaming: false };
    stores.set(key, s);
  }
  return s;
}

function setState(key: string, updater: (prev: ChatState) => ChatState) {
  const prev = getState(key);
  const next = updater(prev);
  stores.set(key, next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---- Hook ----

let keyCounter = 0;

export function useChat(stableKey?: string) {
  // Each useChat instance gets a unique key so separate instances don't share state.
  // The key is stable across re-renders via useRef.
  const keyRef = useRef(stableKey ?? `chat-${++keyCounter}`);
  const key = keyRef.current;
  const controllerRef = useRef<AbortController | null>(null);

  const state = useSyncExternalStore(
    subscribe,
    () => getState(key),
  );

  const sendMessage = useCallback(
    (text: string, mode: Mode, lessonId: number | null) => {
      setState(key, (s) => ({
        ...s,
        messages: [
          ...s.messages,
          { role: "user" as const, content: text },
          { role: "assistant" as const, content: "", toolEvents: [] },
        ],
        isStreaming: true,
      }));

      controllerRef.current = streamChat(text, mode, lessonId, {
        onTextDelta: (delta) => {
          setState(key, (s) => {
            if (s.messages.length === 0) return s;
            const msgs = [...s.messages];
            const last = msgs[msgs.length - 1];
            msgs[msgs.length - 1] = { ...last, content: last.content + delta };
            return { ...s, messages: msgs };
          });
        },
        onToolStart: (name) => {
          setState(key, (s) => {
            if (s.messages.length === 0) return s;
            const msgs = [...s.messages];
            const last = msgs[msgs.length - 1];
            const events: ToolEvent[] = [...(last.toolEvents || []), { name }];
            msgs[msgs.length - 1] = { ...last, toolEvents: events };
            return { ...s, messages: msgs };
          });
        },
        onToolResult: (name, result) => {
          setState(key, (s) => {
            if (s.messages.length === 0) return s;
            const msgs = [...s.messages];
            const last = msgs[msgs.length - 1];
            const events = (last.toolEvents || []).map((e) =>
              e.name === name && !e.result ? { ...e, result } : e,
            );
            msgs[msgs.length - 1] = { ...last, toolEvents: events };
            return { ...s, messages: msgs };
          });
        },
        onDone: () => {
          setState(key, (s) => ({ ...s, isStreaming: false }));
        },
        onError: () => {
          setState(key, (s) => ({ ...s, isStreaming: false }));
        },
      });
    },
    [key],
  );

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    setState(key, (s) => ({ ...s, isStreaming: false }));
  }, [key]);

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(key, () => ({ messages: [], isStreaming: false }));
  }, [key]);

  return {
    messages: state.messages,
    isStreaming: state.isStreaming,
    sendMessage,
    stop,
    clear,
  };
}

export type UseChatReturn = ReturnType<typeof useChat>;

// For loading saved conversations into a store
export function _loadStore(key: string, messages: ChatMessage[]) {
  stores.set(key, { messages, isStreaming: false });
  listeners.forEach((l) => l());
}

// For reading messages from a store (used when saving)
export function _getStoreMessages(key: string): ChatMessage[] {
  return getState(key).messages;
}

// For testing
export function _resetAllStores() {
  stores.clear();
  keyCounter = 0;
}
