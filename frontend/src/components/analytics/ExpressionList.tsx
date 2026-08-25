import { useState, useEffect } from "react";
import type { Expression } from "../../types";
import { getExpressions } from "../../api/client";

export default function ExpressionList() {
  const [expressions, setExpressions] = useState<Expression[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      getExpressions(search || undefined).then(setExpressions).catch(console.error);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">표현 사전</h3>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="표현 검색..."
        className="mb-2 w-full rounded border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
      />
      {expressions.length === 0 ? (
        <p className="text-xs text-gray-400">
          {search ? "검색 결과가 없습니다." : "아직 저장된 표현이 없습니다."}
        </p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
          {expressions.map((expr) => (
            <div key={expr.id} className="rounded border border-gray-100 px-3 py-1.5 text-xs">
              <p className="font-medium text-blue-700">{expr.expression}</p>
              {expr.meaning && <p className="text-gray-600">{expr.meaning}</p>}
              {expr.example && <p className="text-gray-400 italic">{expr.example}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
