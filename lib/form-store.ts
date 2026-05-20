'use client';

import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FormStoreState {
  drafts: Record<string, any>;
  setDraft: (key: string, value: any) => void;
  clearDraft: (key: string) => void;
}

const useStore = create<FormStoreState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (key, value) =>
        set((state) => ({
          drafts: { ...state.drafts, [key]: value },
        })),
      clearDraft: (key) =>
        set((state) => {
          const next = { ...state.drafts };
          delete next[key];
          return { drafts: next };
        }),
    }),
    {
      name: 'procureflow-form-persistence',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function usePersistentFormState<T>(key: string, initial: T): [T, (val: T | ((curr: T) => T)) => void, () => void] {
  const persistedValue = useStore((s) => s.drafts[key]);
  const setStoreDraft = useStore((s) => s.setDraft);
  const clearStoreDraft = useStore((s) => s.clearDraft);
  
  const [state, setState] = useState<T>(initial);

  useEffect(() => {
    if (persistedValue !== undefined) {
      setState(persistedValue);
    }
  }, []);

  const setter = (val: T | ((curr: T) => T)) => {
    const next = typeof val === 'function' ? (val as Function)(state) : val;
    setState(next);
    setStoreDraft(key, next);
  };

  const clear = () => {
    setState(initial);
    clearStoreDraft(key);
  };

  return [state, setter, clear];
}