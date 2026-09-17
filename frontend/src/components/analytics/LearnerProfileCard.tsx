import { useState, useEffect, useCallback } from "react";
import { getProfile, updateProfile, type LearnerProfile } from "../../api/client";

// 개인 컨텍스트도 함께 조회
async function fetchPersonalContext(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/profile/context");
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

const CATEGORY_LABEL: Record<string, { label: string; emoji: string }> = {
  profession: { label: "직업 / 분야", emoji: "💼" },
  family:     { label: "가족",        emoji: "👨‍👩‍👧" },
  interests:  { label: "관심사",      emoji: "🎯" },
  concerns:   { label: "고민",        emoji: "💭" },
  health:     { label: "건강",        emoji: "🏃" },
  lifestyle:  { label: "생활패턴",    emoji: "🌅" },
};
const CATEGORY_ORDER = ["profession", "family", "interests", "concerns", "health", "lifestyle"];

export default function LearnerProfileCard() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [context, setContext] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  const fetchAll = useCallback(async () => {
    const [profileRes, ctxRes] = await Promise.allSettled([
      getProfile(),
      fetchPersonalContext(),
    ]);
    if (profileRes.status === "fulfilled") setProfile(profileRes.value.profile);
    if (ctxRes.status === "fulfilled") setContext(ctxRes.value);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await updateProfile();
      await new Promise((r) => setTimeout(r, 1500));
      await fetchAll();
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 3000);
    } catch { /* silent */ }
    finally { setUpdating(false); }
  };

  return (
    <div className="space-y-4">
      {/* ── 학습 통계 프로필 ── */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-blue-800">📊 학습 현황</h2>
          <button
            onClick={handleUpdate}
            disabled={updating}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              justUpdated
                ? "bg-green-600 text-white"
                : updating
                ? "bg-blue-300 text-white cursor-wait"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {justUpdated ? "✓ 업데이트 완료" : updating ? "갱신 중..." : "↻ 프로필 갱신"}
          </button>
        </div>

        {profile ? (
          <div className="space-y-4">
            {/* 요약 */}
            <p className="text-sm text-blue-900 leading-relaxed">{profile.summary}</p>

            {/* 오류 분포 */}
            {profile.top_errors?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-2">빈발 오류</p>
                <div className="space-y-1.5">
                  {profile.top_errors.slice(0, 5).map((e) => (
                    <div key={e.type} className="flex items-center gap-2">
                      <span className="w-24 text-xs text-gray-600 shrink-0">{e.type}</span>
                      <div className="flex-1 bg-blue-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(e.pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-blue-700 w-10 text-right">{e.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 약점 / 강점 */}
            <div className="flex flex-wrap gap-2">
              {profile.weak_areas?.slice(0, 3).map((a) => (
                <span key={a} className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">⚠ {a}</span>
              ))}
              {profile.strong_areas?.slice(0, 3).map((a) => (
                <span key={a} className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">✓ {a}</span>
              ))}
            </div>

            {/* 단어장 통계 */}
            {profile.vocab_stats && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "전체", value: profile.vocab_stats.total, color: "text-gray-700" },
                  { label: "숙달", value: profile.vocab_stats.mastered, color: "text-green-600" },
                  { label: "학습 중", value: profile.vocab_stats.learning, color: "text-blue-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-white border border-blue-100 p-3 text-center">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 코칭 힌트 */}
            {profile.coaching_notes && (
              <div className="rounded-lg bg-white border border-blue-200 p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">💡 코칭 힌트</p>
                <p className="text-sm text-blue-800">{profile.coaching_notes}</p>
              </div>
            )}

            <p className="text-xs text-blue-400 text-right">
              마지막 갱신: {profile.created_at.slice(0, 16).replace("T", " ")}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-blue-600">프로필이 없습니다.</p>
            <p className="text-xs text-blue-400 mt-1">
              일상 이야기 작성 / 강의 피드백 교정 시 자동 생성됩니다.
            </p>
          </div>
        )}
      </div>

      {/* ── 개인 컨텍스트 ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-800 mb-4">🧑 개인 컨텍스트</h2>
        <p className="text-xs text-gray-400 mb-4">
          일기 및 일상 이야기에서 자동 추출됩니다. AI 코칭 시 스몰톡 소재로 활용됩니다.
        </p>

        {CATEGORY_ORDER.some((cat) => context[cat]) ? (
          <div className="space-y-3">
            {CATEGORY_ORDER.map((cat) => {
              const val = context[cat];
              if (!val) return null;
              const { label, emoji } = CATEGORY_LABEL[cat];
              return (
                <div key={cat} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-lg shrink-0 w-7">{emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{val}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">아직 추출된 정보가 없습니다.</p>
            <p className="text-xs text-gray-300 mt-1">
              일기를 쓰거나 일상 이야기를 입력하면 자동으로 채워집니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
