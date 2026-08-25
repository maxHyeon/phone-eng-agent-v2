import { useState, useEffect, useCallback } from "react";
import type { VocabEntry } from "../../types";
import { getVocabFlashcards, updateVocabMastery } from "../../api/client";

type Direction = "en_to_kr" | "kr_to_en";
type Category = "word" | "idiom" | "pattern";

const CATEGORY_BADGES: Record<string, string> = {
  word: "bg-blue-100 text-blue-700",
  idiom: "bg-purple-100 text-purple-700",
  pattern: "bg-green-100 text-green-700",
};

interface Props {
  refreshKey: number;
}

export default function VocabFlashcardView({ refreshKey }: Props) {
  const [cards, setCards] = useState<VocabEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<Direction>("en_to_kr");
  const [category, setCategory] = useState<Category | "">("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVocabFlashcards(category || undefined);
      setCards(data);
      setIndex(0);
      setFlipped(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const current = cards[index] || null;

  const handleFlip = () => setFlipped((f) => !f);

  const handleRate = async (rating: 0 | 1 | 2) => {
    if (!current) return;
    const newMastery = rating === 0
      ? Math.max(0, current.mastery - 1)
      : rating === 2
        ? Math.min(2, current.mastery + 1)
        : current.mastery;

    if (newMastery !== current.mastery) {
      await updateVocabMastery(current.id, newMastery);
      setCards((prev) => prev.map((c) => c.id === current.id ? { ...c, mastery: newMastery } : c));
    }
    goNext();
  };

  const handleMastered = async () => {
    if (!current) return;
    await updateVocabMastery(current.id, 3);
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== current.id);
      if (index >= next.length && next.length > 0) setIndex(next.length - 1);
      return next;
    });
    setFlipped(false);
  };

  const goNext = () => {
    setFlipped(false);
    setIndex((i) => (i + 1 < cards.length ? i + 1 : 0));
  };

  const goPrev = () => {
    setFlipped(false);
    setIndex((i) => (i - 1 >= 0 ? i - 1 : cards.length - 1));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") { e.preventDefault(); handleFlip(); }
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "1") handleRate(0);
      else if (e.key === "2") handleRate(1);
      else if (e.key === "3") handleRate(2);
      else if (e.key === "4") handleMastered();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p className="text-gray-400">불러오는 중...</p></div>;
  }

  if (cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">
            {loading ? "불러오는 중..." : "모든 표현을 외웠습니다!"}
          </p>
          {!loading && (
            <button
              onClick={load}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              다시 불러오기
            </button>
          )}
          <p className="mt-2 text-xs text-gray-400">리스트뷰에서 "다시 학습"으로 되돌릴 수 있습니다</p>
        </div>
      </div>
    );
  }

  const front = direction === "en_to_kr" ? current?.expression : current?.meaning;
  const back = direction === "en_to_kr"
    ? { main: current?.meaning, sub: current?.example }
    : { main: current?.expression, sub: current?.example };

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="shrink-0 flex items-center justify-between border-b border-gray-200 bg-white p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setDirection("en_to_kr")}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${direction === "en_to_kr" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            영→한
          </button>
          <button
            onClick={() => setDirection("kr_to_en")}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${direction === "kr_to_en" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            한→영
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded-lg px-2 py-1 text-xs ${!category ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            전체
          </button>
          {(["word", "idiom", "pattern"] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-lg px-2 py-1 text-xs ${category === c ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {c === "word" ? "단어" : c === "idiom" ? "숙어" : "패턴"}
            </button>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div
          onClick={handleFlip}
          className="w-full max-w-2xl cursor-pointer rounded-2xl border-2 border-gray-200 bg-white p-10 shadow-md transition-all hover:shadow-lg min-h-[200px] flex flex-col items-center justify-center"
        >
          {!flipped ? (
            <>
              <p className="text-2xl font-medium text-gray-800 text-center">{front}</p>
              {current && (
                <span className={`mt-3 rounded px-2 py-0.5 text-xs font-medium uppercase ${CATEGORY_BADGES[current.category]}`}>
                  {current.category}
                </span>
              )}
              <p className="mt-4 text-xs text-gray-400">(클릭 또는 Space로 뒤집기)</p>
            </>
          ) : (
            <>
              <p className="text-xl font-medium text-blue-700 text-center">{back?.main}</p>
              {back?.sub && (
                <p className="mt-3 text-sm italic text-gray-500 text-center">예: {back.sub}</p>
              )}
              {current?.note && (
                <p className="mt-2 text-xs text-gray-400 text-center">메모: {current.note}</p>
              )}
            </>
          )}
        </div>

        {/* Rating buttons */}
        {flipped && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => handleRate(0)}
              className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
            >
              모르겠어요
            </button>
            <button
              onClick={() => handleRate(1)}
              className="rounded-lg bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-200"
            >
              애매해요
            </button>
            <button
              onClick={() => handleRate(2)}
              className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
            >
              알아요!
            </button>
            <button
              onClick={handleMastered}
              className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
            >
              외웠어요!
            </button>
          </div>
        )}

        {/* Progress */}
        <p className="mt-4 text-sm text-gray-400">
          {index + 1} / {cards.length}
        </p>

        {/* Navigation */}
        <div className="mt-2 flex gap-4">
          <button onClick={goPrev} className="text-gray-400 hover:text-gray-600 text-sm">← 이전</button>
          <button onClick={goNext} className="text-gray-400 hover:text-gray-600 text-sm">다음 →</button>
        </div>
      </div>
    </div>
  );
}
