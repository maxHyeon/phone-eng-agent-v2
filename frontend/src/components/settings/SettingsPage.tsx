import { useState, useEffect } from "react";
import {
  getProviders,
  getSettings,
  saveSettings,
  type ProviderField,
} from "../../api/client";

const PROVIDER_LABELS: Record<string, { name: string; desc: string }> = {
  anthropic: {
    name: "Anthropic API",
    desc: "Anthropic API 키로 직접 연결",
  },
  bedrock: {
    name: "AWS Bedrock",
    desc: "AWS 자격증명으로 Bedrock을 통해 연결",
  },
};

interface Props {
  onClose: () => void;
}

export default function SettingsPage({ onClose }: Props) {
  const [providers, setProviders] = useState<Record<string, ProviderField[]>>({});
  const [selectedProvider, setSelectedProvider] = useState("anthropic");
  const [values, setValues] = useState<Record<string, string>>({});
  const [hasValue, setHasValue] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProviders(), getSettings()])
      .then(([provRes, settRes]) => {
        setProviders(provRes.providers);
        setSelectedProvider(settRes.provider);
        setValues(settRes.values);
        setHasValue(settRes.has_value);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleValueChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      // 현재 선택된 프로바이더의 필드만 전송
      const fields = providers[selectedProvider] || [];
      const payload: Record<string, string> = {};
      for (const field of fields) {
        payload[field.key] = values[field.key] || field.default || "";
      }
      await saveSettings(selectedProvider, payload);
      setMessage("저장 완료. 서버를 재시작하면 적용됩니다.");

      // refresh has_value
      const settRes = await getSettings();
      setHasValue(settRes.has_value);
    } catch {
      setMessage("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="rounded-xl bg-white p-8 shadow-xl">
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  const currentFields = providers[selectedProvider] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-bold text-gray-800">AI 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Provider 선택 */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              AI Provider
            </label>
            <div className="space-y-2">
              {Object.keys(providers).map((providerKey) => {
                const info = PROVIDER_LABELS[providerKey] || {
                  name: providerKey,
                  desc: "",
                };
                return (
                  <label
                    key={providerKey}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      selectedProvider === providerKey
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={providerKey}
                      checked={selectedProvider === providerKey}
                      onChange={() => setSelectedProvider(providerKey)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {info.name}
                      </p>
                      <p className="text-xs text-gray-500">{info.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 선택된 프로바이더의 필드 */}
          <div className="space-y-3">
            {currentFields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-600">
                  {field.label}
                  {field.secret && hasValue[field.key] && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">
                      설정됨
                    </span>
                  )}
                </label>
                <input
                  type={field.secret ? "password" : "text"}
                  value={values[field.key] || ""}
                  onChange={(e) => handleValueChange(field.key, e.target.value)}
                  placeholder={field.default || `${field.label} 입력`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {field.key === "AWS_ACCESS_KEY_ID" && (
                  <p className="mt-1 text-[10px] text-gray-400">
                    비워두면 AWS 기본 자격증명 체인 사용 (~/.aws/credentials, IAM Role, SSO 등)
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 메시지 */}
          {message && (
            <p
              className={`text-xs ${message.includes("완료") ? "text-green-600" : "text-red-500"}`}
            >
              {message}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
