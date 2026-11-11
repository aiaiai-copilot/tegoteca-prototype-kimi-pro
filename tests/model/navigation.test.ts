import { describe, expect, it } from 'vitest';
import { getAutocomplete, getTransitions, type Transition } from '../../src/model/navigation';
import { sameNode } from '../../src/model/tags';
import { element, ids, makeDemoWorkspace } from '../fixtures';
import type { Element, Workspace } from '../../src/types';

function toElement(workspace: Workspace, transition: Transition): string {
  return workspace.elements.find((item) => sameNode(item.tagIds, transition.tagIds))?.id ?? 'unknown';
}

function transitionTo(workspace: Workspace, transitions: Transition[], elementId: string): Transition {
  const target = element(workspace, elementId);
  const found = transitions.find((transition) => sameNode(transition.tagIds, target.tagIds));
  if (!found) throw new Error(`Missing transition to ${elementId}`);
  return found;
}

function withElement(workspace: Workspace, newElement: Element): Workspace {
  return { ...workspace, elements: [...workspace.elements, newElement] };
}

const intermediate: Element = {
  id: 'NEW',
  title: 'Ремонт кухни',
  content: { kind: 'text', text: 'Собственная запись узла' },
  tagIds: [ids.repair, ids.kitchen],
  createdAt: 2_000_000_000_000,
  modifiedAt: 2_000_000_000_000,
};

describe('соседние заполненные узлы', () => {
  it('из ремонт+кухня ведёт только к непосредственным заполненным предкам и потомкам', () => {
    const workspace = makeDemoWorkspace();
    const transitions = getTransitions(workspace, [ids.repair, ids.kitchen]);

    expect(transitions.filter((item) => item.direction === 'ancestor').map((item) => toElement(workspace, item))).toEqual(['E1', 'E2']);
    expect(transitions.filter((item) => item.direction === 'descendant').map((item) => toElement(workspace, item))).toEqual(['E3', 'E4']);
    expect(transitions.some((item) => sameNode(item.tagIds, []))).toBe(false);
    expect(transitions.some((item) => sameNode(item.tagIds, element(workspace, 'E5').tagIds))).toBe(false);

    const e3 = transitionTo(workspace, transitions, 'E3');
    const e4 = transitionTo(workspace, transitions, 'E4');
    expect(e3.changedTagIds).toEqual([ids.electrical]);
    expect(e3.distance).toBe(1);
    expect(e4.changedTagIds).toEqual(expect.arrayContaining([ids.budget, ids.urgent]));
    expect(e4.changedTagIds).toHaveLength(2);
    expect(e4.distance).toBe(2);
    expect(transitions.indexOf(e3)).toBeLessThan(transitions.indexOf(e4));
    expect(e3.selectionCount).toBe(2);
    expect(e3.ownCount).toBe(1);
    expect(transitionTo(workspace, transitions, 'E1').selectionCount).toBe(4);
    expect(transitionTo(workspace, transitions, 'E1').ownCount).toBe(1);
  });

  it('новый заполненный промежуточный узел перехватывает переходы из ремонт', () => {
    const original = makeDemoWorkspace();
    const expanded = withElement(original, intermediate);
    const transitions = getTransitions(expanded, [ids.repair]);

    expect(transitions.filter((item) => item.direction === 'descendant').map((item) => toElement(expanded, item))).toEqual(['NEW']);
    expect(transitionTo(expanded, transitions, 'NEW').selectionCount).toBe(4);
    expect(transitionTo(expanded, transitions, 'NEW').ownCount).toBe(1);

    const restored = getTransitions(original, [ids.repair]);
    expect(restored.filter((item) => item.direction === 'descendant').map((item) => toElement(original, item))).toEqual(['E3', 'E4']);
  });

  it('незаполненный узел мечта не порождает фантомных заполненных соседей', () => {
    const workspace = makeDemoWorkspace();
    const transitions = getTransitions(workspace, [ids.dream]);

    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ direction: 'ancestor', tagIds: [], changedTagIds: [ids.dream], selectionCount: 9, ownCount: 1 });
    expect(transitions.every((item) => item.ownCount > 0)).toBe(true);
  });
});

describe('автодополнение навигации', () => {
  it('предлагает теги из текущей выборки без уже выбранных', () => {
    const workspace = makeDemoWorkspace();
    const suggestions = getAutocomplete(workspace, [ids.repair, ids.kitchen], '', 'selection');

    expect(suggestions.map((tag) => tag.name)).toEqual(['бюджет', 'срочно', 'электрика']);
    expect(suggestions.some((tag) => tag.id === ids.garden)).toBe(false);
    expect(suggestions.some((tag) => tag.id === ids.dream)).toBe(false);
    expect(suggestions.some((tag) => tag.id === ids.repair || tag.id === ids.kitchen)).toBe(false);
    expect(getAutocomplete(workspace, [ids.repair, ids.kitchen], 'Э', 'selection').map((tag) => tag.name)).toEqual(['электрика']);
  });

  it('по явному выбору предлагает все доступные теги, включая неиспользуемые', () => {
    const workspace = makeDemoWorkspace();
    const suggestions = getAutocomplete(workspace, [ids.repair, ids.kitchen], '', 'all');

    expect(suggestions.some((tag) => tag.id === ids.garden)).toBe(true);
    expect(suggestions.some((tag) => tag.id === ids.dream)).toBe(true);
    expect(suggestions.some((tag) => tag.id === ids.repair || tag.id === ids.kitchen)).toBe(false);
    expect(getAutocomplete(workspace, [], 'меч', 'all').map((tag) => tag.name)).toEqual(['мечта']);
    expect(getAutocomplete(workspace, [], 'меч', 'selection')).toEqual([]);
  });
});
