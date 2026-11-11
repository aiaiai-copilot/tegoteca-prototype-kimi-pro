import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { SortMode, ViewMode } from '../types';
import { nodeKey, sameNode, uniqueTagIds } from '../model/tags';

interface HistoryState {
  entries: string[][];
  index: number;
}

export interface NavigationState {
  current: string[];
  history: HistoryState;
  canBack: boolean;
  canForward: boolean;
  viewMode: ViewMode;
  sortMode: SortMode;
  navigate(tagIds: readonly string[]): void;
  back(): void;
  forward(): void;
  goRoot(): void;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  setSortMode: Dispatch<SetStateAction<SortMode>>;
}

function readStorage<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function useStoredState<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStorage(key, fallback, validate));
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Интерфейс продолжает работать, даже если браузер запретил window.localStorage.
    }
  }, [key, value]);
  return [value, setValue];
}

const isViewMode = (value: unknown): value is ViewMode => value === 'own' || value === 'selection';
const isSortMode = (value: unknown): value is SortMode => value === 'modified' || value === 'title';
const isNode = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((tagId) => typeof tagId === 'string');

export function useNavigation(
  availableTagIds: readonly string[],
  storagePrefix = 'tegoteca',
): NavigationState {
  const availableKey = nodeKey(availableTagIds);
  const [history, setHistory] = useState<HistoryState>(() => {
    const lastNode = readStorage(`${storagePrefix}:last-node`, [], isNode);
    const available = new Set(availableTagIds);
    return { entries: [lastNode.filter((tagId) => available.has(tagId))], index: 0 };
  });
  const [viewMode, setViewMode] = useStoredState<ViewMode>(`${storagePrefix}:view-mode`, 'own', isViewMode);
  const [sortMode, setSortMode] = useStoredState<SortMode>(`${storagePrefix}:sort-mode`, 'modified', isSortMode);

  useEffect(() => {
    const available = new Set(availableTagIds);
    setHistory((previous) => {
      let changed = false;
      const entries = previous.entries.map((entry) => {
        const filtered = entry.filter((tagId) => available.has(tagId));
        if (filtered.length !== entry.length) changed = true;
        return filtered.length === entry.length ? entry : filtered;
      });
      return changed ? { entries, index: previous.index } : previous;
    });
    // availableKey стабильно описывает набор, а не новую ссылку на массив.
  }, [availableKey]);

  const current = history.entries[history.index] ?? [];
  const currentKey = nodeKey(current);
  useEffect(() => {
    try {
      window.localStorage.setItem(`${storagePrefix}:last-node`, currentKey === '[]' ? JSON.stringify([]) : JSON.stringify(current));
    } catch {
      // Последний узел восстановится при следующем доступном сохранении.
    }
  }, [currentKey, storagePrefix]);

  function navigate(tagIds: readonly string[]): void {
    const available = new Set(availableTagIds);
    const target = uniqueTagIds(tagIds).filter((tagId) => available.has(tagId));
    setHistory((previous) => {
      const active = previous.entries[previous.index] ?? [];
      if (sameNode(active, target)) return previous;
      const entries = [...previous.entries.slice(0, previous.index + 1), target];
      return { entries, index: entries.length - 1 };
    });
  }

  return {
    current,
    history,
    canBack: history.index > 0,
    canForward: history.index < history.entries.length - 1,
    viewMode,
    sortMode,
    navigate,
    back: () => setHistory((previous) => ({ ...previous, index: Math.max(0, previous.index - 1) })),
    forward: () => setHistory((previous) => ({
      ...previous,
      index: Math.min(previous.entries.length - 1, previous.index + 1),
    })),
    goRoot: () => navigate([]),
    setViewMode,
    setSortMode,
  };
}
