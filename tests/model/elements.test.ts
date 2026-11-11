import { describe, expect, it } from 'vitest';
import { ownElements, selectElements, sortElements } from '../../src/model/elements';
import { replaceContent, updateTitleAndTags } from '../../src/model/workspace';
import { element, ids, makeDemoWorkspace } from '../fixtures';

const titles = (items: { id: string }[]) => items.map((item) => item.id);

describe('выборки и собственные элементы', () => {
  it('в корне отличает собственный E0, девять размеченных и неразмеченный E9', () => {
    const workspace = makeDemoWorkspace();

    expect(titles(ownElements(workspace, []))).toEqual(['E0']);
    expect(titles(selectElements(workspace, []))).toEqual(['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8']);
  });

  it('в узле ремонт находит E1 собственным и E1/E3/E4/E5 в выборке', () => {
    const workspace = makeDemoWorkspace();

    expect(titles(ownElements(workspace, [ids.repair]))).toEqual(['E1']);
    expect(titles(selectElements(workspace, [ids.repair]))).toEqual(['E1', 'E3', 'E4', 'E5']);
  });

  it('в незаполненном узле ремонт+кухня нет собственных, но есть потомки', () => {
    const workspace = makeDemoWorkspace();

    expect(ownElements(workspace, [ids.repair, ids.kitchen])).toEqual([]);
    expect(titles(selectElements(workspace, [ids.repair, ids.kitchen]))).toEqual(['E3', 'E4', 'E5']);
  });

  it('узел неиспользуемого тега мечта доступен и пуст', () => {
    const workspace = makeDemoWorkspace();

    expect(ownElements(workspace, [ids.dream])).toEqual([]);
    expect(selectElements(workspace, [ids.dream])).toEqual([]);
  });

  it('назначение E9 пустого набора делает его собственным элементом корня', () => {
    const workspace = makeDemoWorkspace();
    const updated = updateTitleAndTags(element(workspace, 'E9'), { tagIds: [] }, 2_000_000_000_000);
    const next = { ...workspace, elements: workspace.elements.map((item) => item.id === 'E9' ? updated : item) };

    expect(titles(ownElements(next, []))).toEqual(['E0', 'E9']);
    expect(selectElements(next, [])).toHaveLength(10);
  });
});

describe('сортировка и идентичность элементов', () => {
  it('по умолчанию показывает сначала недавно изменённые', () => {
    const workspace = makeDemoWorkspace();

    expect(titles(sortElements(workspace.elements))[0]).toBe('E9');
    expect(titles(sortElements(workspace.elements)).at(-1)).toBe('E0');
  });

  it('по названию помещает E6 без названия в конец и E5 перед E3', () => {
    const workspace = makeDemoWorkspace();
    const sorted = sortElements(workspace.elements, 'title');

    expect(sorted.at(-1)?.id).toBe('E6');
    expect(sorted.findIndex((item) => item.id === 'E5')).toBeLessThan(sorted.findIndex((item) => item.id === 'E3'));
  });

  it('изменение названия и разметки сохраняет элемент и обновляет modifiedAt', () => {
    const original = element(makeDemoWorkspace(), 'E3');
    const updated = updateTitleAndTags(original, { title: 'Новый план', tagIds: [ids.repair] }, 2_000_000_000_000);

    expect(updated.id).toBe(original.id);
    expect(updated.content).toEqual(original.content);
    expect(updated.title).toBe('Новый план');
    expect(updated.tagIds).toEqual([ids.repair]);
    expect(updated.modifiedAt).toBe(2_000_000_000_000);
    expect(original.title).toBe('План');
  });

  it('изменение содержания создаёт другой элемент, заменяющий исходную запись', () => {
    const original = element(makeDemoWorkspace(), 'E3');
    const replaced = replaceContent(original, { kind: 'text', text: 'Другое содержание' }, 2_000_000_000_000);

    expect(replaced.id).not.toBe(original.id);
    expect(replaced.title).toBe(original.title);
    expect(replaced.tagIds).toEqual(original.tagIds);
    expect(replaced.modifiedAt).toBe(2_000_000_000_000);
  });

  it('изменение или удаление E7 не меняет независимый E8 с пустым содержанием', () => {
    const workspace = makeDemoWorkspace();
    const e7 = element(workspace, 'E7');
    const e8Before = element(workspace, 'E8');
    const e7Updated = updateTitleAndTags(e7, { title: 'Игорь Артемьев' }, 2_000_000_000_000);
    const next = { ...workspace, elements: [...workspace.elements.filter((item) => item.id !== 'E7'), e7Updated] };

    expect(element(next, 'E8')).toEqual(e8Before);
    expect(element(next, 'E8').content).toEqual({ kind: 'empty' });
    expect(element(next, 'E7').content).toEqual({ kind: 'empty' });
  });
});
