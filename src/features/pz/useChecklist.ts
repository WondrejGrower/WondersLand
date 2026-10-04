import { useCallback, useEffect, useState } from "react";

/** Checklist progress only. Never contains party data or any key material. */
const KEY = "wondersland-pz-checklist:v1";
export const EXPORT_SCHEMA = "wondersland-pz-checklist";

export function useChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(arr)) setChecked(new Set(arr.filter((x): x is string => typeof x === "string")));
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const persist = (next: Set<string>) => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      // best effort
    }
  };

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  }, []);

  const exportJson = () =>
    JSON.stringify({ schema: EXPORT_SCHEMA, v: 1, exportedAt: new Date().toISOString(), checked: [...checked] }, null, 2);

  const importJson = (text: string, known: Set<string>): number => {
    const data = JSON.parse(text) as { schema?: unknown; checked?: unknown };
    if (data.schema !== EXPORT_SCHEMA || !Array.isArray(data.checked)) throw new Error("Not a checklist export");
    const next = new Set(data.checked.filter((x): x is string => typeof x === "string" && known.has(x)));
    setChecked(next);
    persist(next);
    return next.size;
  };

  return { checked, toggle, exportJson, importJson };
}
