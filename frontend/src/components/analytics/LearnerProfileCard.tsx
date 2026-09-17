import { useState, useEffect, useCallback } from "react";
import { getProfile, updateProfile, type LearnerProfile } from "../../api/client";

export default function LearnerProfileCard() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [updating, setUpdating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      setProfile(res.profile);
    } catch {
      // 프로필 없어도 조용히 처리
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await updateProfile();
      // 백그라운드 스레드가 완료될 시간을 줌 (1.5초)
      await new Promise((r) => setTimeout(r, 1500));
      await fetchProfile();
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 3000);
    } catch {
      // silent
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
          📊 학습자 프로필
        </h3>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            justUpdated
              ? "bg-green-600 text-white"
              : updating
              ? "bg-blue-300 text-white cursor-wait"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {justUpdated ? (
            <>✓ 업데이트 완료</>
          ) : updating ? (
            <><span className="animate-pulse">●</span> 갱신 중...</>
          ) : (
            <>↻ 프로필 갱신</>
          )}
        </button>
      </div>

      {profile ? (
        <div className="space-y-2">
          {/* 요약 */}
          <p className="text-xs text-blue-900 leading-relaxed">{profile.summary}</p>

          {/* 약점 / 강점 */}
          <div className="flex flex-wrap gap-1.5">
            {profile.weak_areas.slice(0, 3).map((area) => (
              <span key={area} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                ⚠ {area}
              </span>
            ))}
            {profile.strong_areas.slice(0, 2).map((area) => (
              <span key={area} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                ✓ {area}
              </span>
            ))}
          </div>

          {/* 코칭 힌트 */}
          {profile.coaching_notes && (
            <p className="text-xs text-blue-700 border-t border-blue-200 pt-2">
              💡 {profile.coaching_notes}
            </p>
          )}

          {/* 갱신 시각 */}
          <p className="text-[10px] text-blue-400 text-right">
            마지막 갱신: {profile.created_at.slice(0, 16).replace("T", " ")}
          </p>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-blue-600">프로필이 없습니다.</p>
          <p className="text-xs text-blue-400 mt-0.5">
            수업 후 갱신 버튼을 누르거나, 일상 이야기 / 피드백 교정 시 자동 생성됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
