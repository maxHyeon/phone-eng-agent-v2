import { useState, useCallback, useEffect, useRef } from "react";
import type { Mode, ErrorStats, Lesson, ChatMessage } from "./types";
import { useChat, _loadStore, _getStoreMessages, _resetAllStores } from "./hooks/useChat";
import { useLesson } from "./hooks/useLesson";
import { getErrorStats, saveConversations, getConversations } from "./api/client";
import TabNav from "./components/layout/TabNav";
import ChatPanel from "./components/chat/ChatPanel";
import PrepPanel from "./components/prep/PrepPanel";
import ReviewPanel from "./components/review/ReviewPanel";
import ErrorTypeChart from "./components/analytics/ErrorTypeChart";
import ErrorTrendChart from "./components/analytics/ErrorTrendChart";
import LessonHistory from "./components/analytics/LessonHistory";
import ExpressionList from "./components/analytics/ExpressionList";
import VocabNoteTab from "./components/vocab/VocabNoteTab";
import VocabSaveButton from "./components/vocab/VocabSaveButton";
import VocabSaveModal from "./components/vocab/VocabSaveModal";
import DiaryTab from "./components/diary/DiaryTab";
import SettingsPage from "./components/settings/SettingsPage";
import ConfirmModal from "./components/common/ConfirmModal";

const CHAT_KEYS = [
  "prep:review_previous", "prep:smalltalk", "prep:article", "prep:freetalk",
  "review:input", "review:writing", "analytics",
];

export default function App() {
  const [mode, setMode] = useState<Mode>("prep");
  const { lesson, loading, updateLesson, switchLesson, goToToday, isHistorical } = useLesson();
  const prepReviewPreviousChat = useChat("prep:review_previous");
  const prepSmalltalkChat = useChat("prep:smalltalk");
  const prepArticleChat = useChat("prep:article");
  const prepFreetalkChat = useChat("prep:freetalk");
  const reviewInputChat = useChat("review:input");
  const reviewWritingChat = useChat("review:writing");
  const analyticsChat = useChat("analytics");
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [analyticsSubTab, setAnalyticsSubTab] = useState<"errors" | "vocab" | "diary">("errors");
  const [pendingLesson, setPendingLesson] = useState<Lesson | null>(null);
  const [switching, setSwitching] = useState(false);

  // Load analytics stats when switching to analytics tab
  useEffect(() => {
    if (mode === "analytics") {
      getErrorStats().then(setStats).catch(console.error);
    }
  }, [mode]);

  const handleAnalyticsSend = useCallback(
    (text: string) => {
      analyticsChat.sendMessage(text, "analytics", lesson?.id ?? null);
    },
    [analyticsChat.sendMessage, lesson],
  );

  const handleModeChange = useCallback(
    (newMode: Mode) => {
      setMode(newMode);
    },
    [],
  );

  // --- Conversation save/load helpers ---
  const collectConversations = useCallback(() => {
    const conversations: Record<string, ChatMessage[]> = {};
    for (const key of CHAT_KEYS) {
      const msgs = _getStoreMessages(key);
      if (msgs.length > 0) {
        conversations[key] = msgs;
      }
    }
    return conversations;
  }, []);

  const saveCurrentConversations = useCallback(async () => {
    if (!lesson) return;
    const conversations = collectConversations();
    if (Object.keys(conversations).length > 0) {
      await saveConversations(lesson.id, conversations);
    }
  }, [lesson, collectConversations]);

  const loadLessonConversations = useCallback(async (lessonId: number) => {
    const saved = await getConversations(lessonId);
    for (const [key, msgs] of Object.entries(saved)) {
      if (msgs.length > 0) {
        _loadStore(key, msgs);
      }
    }
  }, []);

  // --- Auto-save: debounced on message changes ---
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anyStreaming =
    prepReviewPreviousChat.isStreaming || prepSmalltalkChat.isStreaming || prepArticleChat.isStreaming || prepFreetalkChat.isStreaming ||
    reviewInputChat.isStreaming || reviewWritingChat.isStreaming || analyticsChat.isStreaming;

  // Total message count across all chats — used to detect changes
  const totalMessages =
    prepReviewPreviousChat.messages.length + prepSmalltalkChat.messages.length + prepArticleChat.messages.length + prepFreetalkChat.messages.length +
    reviewInputChat.messages.length + reviewWritingChat.messages.length + analyticsChat.messages.length;

  useEffect(() => {
    if (!lesson || anyStreaming || totalMessages === 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveCurrentConversations().catch(console.error);
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [totalMessages, anyStreaming, lesson, saveCurrentConversations]);

  // --- Auto-save: on page unload (beforeunload + visibilitychange) ---
  // Keep lesson ref up-to-date for the sync save handler
  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;

  useEffect(() => {
    const syncSave = () => {
      const lid = lessonRef.current?.id;
      if (!lid) return;
      const conversations = collectConversations();
      if (Object.keys(conversations).length === 0) return;
      const blob = new Blob(
        [JSON.stringify({ conversations })],
        { type: "application/json" },
      );
      navigator.sendBeacon(`/api/lessons/${lid}/conversations`, blob);
    };

    const handleBeforeUnload = () => syncSave();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") syncSave();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [collectConversations]);

  // --- Lesson switching ---
  const handleLessonSelect = useCallback(
    (selected: Lesson) => {
      if (selected.id === lesson?.id) return;
      setPendingLesson(selected);
    },
    [lesson],
  );

  const handleConfirmSwitch = useCallback(async () => {
    if (!pendingLesson) return;
    setSwitching(true);
    try {
      await saveCurrentConversations();
      _resetAllStores();
      await switchLesson(pendingLesson.id);
      await loadLessonConversations(pendingLesson.id);
    } catch (err) {
      console.error("Failed to switch lesson:", err);
    } finally {
      setSwitching(false);
      setPendingLesson(null);
    }
  }, [pendingLesson, saveCurrentConversations, switchLesson, loadLessonConversations]);

  const handleGoToToday = useCallback(async () => {
    if (!lesson) return;
    setSwitching(true);
    try {
      await saveCurrentConversations();
      _resetAllStores();
      await goToToday();
    } catch (err) {
      console.error("Failed to return to today:", err);
    } finally {
      setSwitching(false);
    }
  }, [saveCurrentConversations, goToToday, lesson]);

  const handleLessonDeleted = useCallback(
    async (lessonId: number) => {
      if (lessonId === lesson?.id) {
        _resetAllStores();
        await goToToday();
      }
    },
    [lesson, goToToday],
  );

  // Load conversations when lesson changes (initial load or after switch)
  useEffect(() => {
    if (lesson && !loading) {
      loadLessonConversations(lesson.id).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  // --- Vocab save shortcut: Cmd+Shift+S ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "s") {
        e.preventDefault();
        setShowVocabModal((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">
            Phone English Agent
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {lesson && (
              <>
                <span>{lesson.date}</span>
                {lesson.topic && (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-600">
                    {lesson.topic}
                  </span>
                )}
              </>
            )}
            {isHistorical && (
              <button
                onClick={handleGoToToday}
                disabled={switching}
                className="rounded-lg bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-40"
              >
                오늘 수업으로
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
              title="설정"
            >
              설정
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <TabNav current={mode} onChange={handleModeChange} />

      {/* Main area — all panels always mounted, hidden via inline style */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden" style={{ display: mode === "prep" ? "flex" : "none" }}>
          <PrepPanel lesson={lesson} updateLesson={updateLesson} chats={{ review_previous: prepReviewPreviousChat, smalltalk: prepSmalltalkChat, article: prepArticleChat, freetalk: prepFreetalkChat }} />
        </div>
        <div className="flex flex-1 overflow-hidden" style={{ display: mode === "review" ? "flex" : "none" }}>
          <ReviewPanel lesson={lesson} chats={{ input: reviewInputChat, writing: reviewWritingChat }} />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden" style={{ display: mode === "analytics" ? "flex" : "none" }}>
          {/* Analytics sub-tabs */}
          <div className="shrink-0 flex border-b border-gray-200 bg-white px-4">
            <button
              onClick={() => setAnalyticsSubTab("errors")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${analyticsSubTab === "errors" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              오류분석
            </button>
            <button
              onClick={() => setAnalyticsSubTab("vocab")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${analyticsSubTab === "vocab" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              표현노트
            </button>
            <button
              onClick={() => setAnalyticsSubTab("diary")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${analyticsSubTab === "diary" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              일기장
            </button>
          </div>
          {/* Error analysis (existing) */}
          <div className="flex flex-1 overflow-hidden" style={{ display: analyticsSubTab === "errors" ? "flex" : "none" }}>
            <aside className="w-80 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3 space-y-3 scrollbar-thin">
              <ErrorTypeChart stats={stats} />
              <ErrorTrendChart stats={stats} />
              <LessonHistory currentLessonId={lesson?.id} onSelect={handleLessonSelect} onDeleted={handleLessonDeleted} />
              <ExpressionList />
            </aside>
            <ChatPanel
              messages={analyticsChat.messages}
              isStreaming={analyticsChat.isStreaming}
              mode="analytics"
              onSend={handleAnalyticsSend}
              onStop={analyticsChat.stop}
            />
          </div>
          {/* Vocab note */}
          <div className="flex flex-1 overflow-hidden" style={{ display: analyticsSubTab === "vocab" ? "flex" : "none" }}>
            <VocabNoteTab />
          </div>
          {/* Diary */}
          <div className="flex flex-1 overflow-hidden" style={{ display: analyticsSubTab === "diary" ? "flex" : "none" }}>
            <DiaryTab />
          </div>
        </div>
      </div>

      {/* Lesson switch confirm modal */}
      {pendingLesson && (
        <ConfirmModal
          title="수업 이력 불러오기"
          message={`기존 내용을 저장하고 ${pendingLesson.date} 수업의 기록을 불러오시겠습니까?`}
          onConfirm={handleConfirmSwitch}
          onCancel={() => setPendingLesson(null)}
        />
      )}

      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} />}

      {/* Vocab floating button + modal */}
      <VocabSaveButton onClick={() => setShowVocabModal(true)} />
      <VocabSaveModal
        isOpen={showVocabModal}
        onClose={() => setShowVocabModal(false)}
        lessonId={lesson?.id}
        mode={mode}
      />
    </div>
  );
}
