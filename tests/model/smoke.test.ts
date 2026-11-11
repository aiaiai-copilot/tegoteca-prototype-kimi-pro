import { describe, expect, it } from 'vitest';
import { isMarked, type Element } from '../../src/types';

const base = {
  id: 'element',
  title: 'Запись',
  content: { kind: 'empty' } as const,
  createdAt: 1,
  modifiedAt: 1,
};

describe('состояние разметки', () => {
  it('отличает незаданную разметку от заданного пустого набора', () => {
    const unmarked: Element = { ...base, tagIds: null };
    const rootElement: Element = { ...base, id: 'root-element', tagIds: [] };

    expect(isMarked(unmarked)).toBe(false);
    expect(isMarked(rootElement)).toBe(true);
  });
});
