import { describe, expect, it } from 'vitest';
import { generateDiagnosticWorkspace } from '../../src/model/diagnostic';
import { nodeKey } from '../../src/model/tags';

describe('диагностический генератор', () => {
  it('создаёт 10 000 элементов, 100 тегов и от одного до шести уникальных тегов на элемент', () => {
    const workspace = generateDiagnosticWorkspace();

    expect(workspace.elements).toHaveLength(10_000);
    expect(workspace.tags).toHaveLength(100);
    for (const item of workspace.elements) {
      expect(item.tagIds).not.toBeNull();
      expect(item.tagIds!.length).toBeGreaterThanOrEqual(1);
      expect(item.tagIds!.length).toBeLessThanOrEqual(6);
      expect(new Set(item.tagIds!).size).toBe(item.tagIds!.length);
      expect(item.content).toEqual({ kind: 'text', text: expect.any(String) });
    }
  });

  it('воспроизводит одинаковый набор по seed и меняет его при другом seed', () => {
    const first = generateDiagnosticWorkspace(30, 12, 42);
    const repeated = generateDiagnosticWorkspace(30, 12, 42);
    const different = generateDiagnosticWorkspace(30, 12, 43);

    expect(first).toEqual(repeated);
    expect(first.elements.map((item) => nodeKey(item.tagIds!))).not.toEqual(different.elements.map((item) => nodeKey(item.tagIds!)));
  });
});
