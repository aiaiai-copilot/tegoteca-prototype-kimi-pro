import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useNavigation } from '../../src/state/useNavigation';

const available = ['ремонт', 'кухня', 'сад', 'мечта'];

beforeEach(() => {
  window.localStorage.clear();
});

describe('история навигации', () => {
  it('начинает с корня и не добавляет записи при back/forward', () => {
    const { result } = renderHook(() => useNavigation(available, 'test-history'));
    expect(result.current.current).toEqual([]);

    act(() => result.current.navigate(['ремонт']));
    act(() => result.current.navigate(['ремонт', 'кухня']));
    expect(result.current.history.entries).toHaveLength(3);

    act(() => result.current.back());
    expect(result.current.current).toEqual(['ремонт']);
    expect(result.current.canForward).toBe(true);
    expect(result.current.history.entries).toHaveLength(3);

    act(() => result.current.forward());
    expect(result.current.current).toEqual(['ремонт', 'кухня']);
    expect(result.current.history.entries).toHaveLength(3);
    expect(result.current.canForward).toBe(false);
  });

  it('новый переход после возврата заменяет прежнее продолжение', () => {
    const { result } = renderHook(() => useNavigation(available, 'test-branch'));
    act(() => result.current.navigate(['ремонт']));
    act(() => result.current.navigate(['ремонт', 'кухня']));
    act(() => result.current.back());
    act(() => result.current.navigate(['сад']));

    expect(result.current.current).toEqual(['сад']);
    expect(result.current.history.entries).toEqual([[], ['ремонт'], ['сад']]);
    expect(result.current.canForward).toBe(false);
  });

  it('изменение доступных тегов само по себе не создаёт посещений и сохраняет continuation', () => {
    const { result, rerender } = renderHook(
      ({ tags }) => useNavigation(tags, 'test-data-change'),
      { initialProps: { tags: available } },
    );
    act(() => result.current.navigate(['ремонт']));
    act(() => result.current.navigate(['ремонт', 'кухня']));
    act(() => result.current.back());
    const entries = result.current.history.entries;

    rerender({ tags: [...available, 'новый'] });

    expect(result.current.history.entries).toBe(entries);
    expect(result.current.current).toEqual(['ремонт']);
    expect(result.current.canForward).toBe(true);
  });

  it('удаление выбранного тега сокращает текущий и будущие узлы без смены позиции истории', () => {
    const { result, rerender } = renderHook(
      ({ tags }) => useNavigation(tags, 'test-delete'),
      { initialProps: { tags: available } },
    );
    act(() => result.current.navigate(['ремонт']));
    act(() => result.current.navigate(['ремонт', 'кухня']));
    act(() => result.current.back());

    rerender({ tags: available.filter((tag) => tag !== 'ремонт') });

    expect(result.current.current).toEqual([]);
    expect(result.current.history.entries).toEqual([[], [], ['кухня']]);
    expect(result.current.history.index).toBe(1);
    expect(result.current.canForward).toBe(true);
    act(() => result.current.forward());
    expect(result.current.current).toEqual(['кухня']);
  });

  it('восстанавливает последний узел, режим и сортировку после повторного открытия', () => {
    const first = renderHook(() => useNavigation(available, 'test-restore'));
    act(() => first.result.current.navigate(['сад']));
    act(() => first.result.current.setViewMode('selection'));
    act(() => first.result.current.setSortMode('title'));
    first.unmount();

    const second = renderHook(() => useNavigation(available, 'test-restore'));
    expect(second.result.current.current).toEqual(['сад']);
    expect(second.result.current.viewMode).toBe('selection');
    expect(second.result.current.sortMode).toBe('title');
  });

  it('выход в корень снимает все выбранные теги одним действием', () => {
    const { result } = renderHook(() => useNavigation(available, 'test-root'));
    act(() => result.current.navigate(['ремонт', 'кухня']));
    act(() => result.current.goRoot());

    expect(result.current.current).toEqual([]);
    expect(result.current.history.entries).toEqual([[], ['ремонт', 'кухня'], []]);
  });
});
