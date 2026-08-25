import { useState, useEffect, useCallback } from "react";
import type { Lesson } from "../types";
import { getTodayLesson, getLesson, updateLesson as apiUpdateLesson } from "../api/client";

export function useLesson() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [todayLessonId, setTodayLessonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTodayLesson()
      .then((l) => {
        setLesson(l);
        setTodayLessonId(l.id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateLesson = useCallback(
    async (data: Partial<Lesson>) => {
      if (!lesson) return;
      const updated = await apiUpdateLesson(lesson.id, data);
      setLesson(updated);
      return updated;
    },
    [lesson],
  );

  const switchLesson = useCallback(
    async (lessonId: number) => {
      const fetched = await getLesson(lessonId);
      setLesson(fetched);
    },
    [],
  );

  const goToToday = useCallback(async () => {
    if (todayLessonId) {
      const fetched = await getLesson(todayLessonId);
      setLesson(fetched);
    }
  }, [todayLessonId]);

  const isHistorical = lesson != null && todayLessonId != null && lesson.id !== todayLessonId;

  return { lesson, loading, updateLesson, switchLesson, goToToday, isHistorical };
}
