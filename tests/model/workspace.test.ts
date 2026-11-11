import { describe, expect, it } from 'vitest';
import { canonicalTagName, nodeKey, sameNode } from '../../src/model/tags';
import { deleteTag, renameTag } from '../../src/model/workspace';
import { element, ids, makeDemoWorkspace } from '../fixtures';

describe('глоссарий', () => {
  it('канонизирует пробелы, регистр и Unicode без потери смысла', () => {
    expect(canonicalTagName('  КуХнЯ\n ')).toBe('кухня');
    expect(canonicalTagName('день  рождения')).toBe('день рождения');
    expect(canonicalTagName('é')).toBe(canonicalTagName('é'));
  });

  it('ключ узла не зависит от порядка тегов', () => {
    expect(nodeKey([ids.kitchen, ids.repair])).toBe(nodeKey([ids.repair, ids.kitchen]));
    expect(sameNode([ids.kitchen, ids.repair], [ids.repair, ids.kitchen])).toBe(true);
    expect(sameNode([], null)).toBe(false);
  });

  it('переименование сохраняет назначения во всей рабочей области', () => {
    const workspace = makeDemoWorkspace();
    const renamed = renameTag(workspace, ids.kitchen, '  Кухонная зона  ');

    expect(renamed.tags.find((tag) => tag.id === ids.kitchen)?.name).toBe('Кухонная зона');
    expect(element(renamed, 'E3').tagIds).toEqual(element(workspace, 'E3').tagIds);
    expect(element(renamed, 'E4').tagIds).toEqual(element(workspace, 'E4').tagIds);
  });

  it('не разрешает переименовать кухня в существующий сад с другим регистром', () => {
    const workspace = makeDemoWorkspace();

    expect(() => renameTag(workspace, ids.kitchen, ' САД ')).toThrow(/уже существует/i);
    expect(workspace.tags.find((tag) => tag.id === ids.kitchen)?.name).toBe('кухня');
  });

  it('удаление ремонт затрагивает четыре элемента и сохраняет их', () => {
    const workspace = makeDemoWorkspace();
    const next = deleteTag(workspace, ids.repair, 2_000_000_000_000);

    expect(next.tags.some((tag) => tag.id === ids.repair)).toBe(false);
    expect(next.elements).toHaveLength(10);
    expect(['E1', 'E3', 'E4', 'E5'].map((id) => element(next, id).modifiedAt)).toEqual([
      2_000_000_000_000,
      2_000_000_000_000,
      2_000_000_000_000,
      2_000_000_000_000,
    ]);
    expect(element(next, 'E1').tagIds).toEqual([]);
    expect(element(next, 'E3').tagIds).toEqual([ids.kitchen, ids.electrical]);
    expect(element(next, 'E9').tagIds).toBeNull();
  });
});
