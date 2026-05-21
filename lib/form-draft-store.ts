'use client';

import { useEffect, useRef } from 'react';

const safeJsonParse = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

function makeKey(baseKey: string) {
  return `procureflow-draft:${baseKey}`;
}

export function readDraft<T>(baseKey: string): T | null {
  if (typeof window === 'undefined') return null;
  return safeJsonParse<T>(window.localStorage.getItem(makeKey(baseKey)));
}

export function writeDraft<T>(baseKey: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(makeKey(baseKey), JSON.stringify(value));
}

export function clearDraft(baseKey: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(makeKey(baseKey));
}

export function useFormDraftAutoSave<T>({
  draftKey,
  draft,
  enabled,
  debounceMs = 400,
}: {
  draftKey: string;
  draft: T;
  enabled: boolean;
  debounceMs?: number;
}) {
  const latest = useRef(draft);
  latest.current = draft;

  useEffect(() => {
    if (!enabled) return;

    const t = window.setTimeout(() => {
      writeDraft(draftKey, latest.current);
    }, debounceMs);

    return () => {
      window.clearTimeout(t);
    };
  }, [draftKey, enabled, debounceMs, draft]);
}

