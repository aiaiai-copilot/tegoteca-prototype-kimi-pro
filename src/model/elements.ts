import type { Element, SortMode, Workspace } from '../types';
import { isSubset, sameNode } from './tags';

export function selectElements(workspace: Workspace, selected: readonly string[]): Element[] {
  return workspace.elements.filter((element) =>
    element.tagIds !== null && isSubset(selected, element.tagIds),
  );
}

export function ownElements(workspace: Workspace, selected: readonly string[]): Element[] {
  return workspace.elements.filter((element) => sameNode(element.tagIds, selected));
}

function compareModifiedDesc(a: Element, b: Element): number {
  return b.modifiedAt - a.modifiedAt || a.id.localeCompare(b.id);
}

export function sortElements(elements: readonly Element[], mode: SortMode = 'modified'): Element[] {
  return [...elements].sort((a, b) => {
    if (mode === 'modified') return compareModifiedDesc(a, b);

    const aHasTitle = a.title.trim().length > 0;
    const bHasTitle = b.title.trim().length > 0;
    if (aHasTitle !== bHasTitle) return aHasTitle ? -1 : 1;
    if (!aHasTitle) return compareModifiedDesc(a, b);

    return a.title.localeCompare(b.title, 'ru', { sensitivity: 'base', numeric: true })
      || compareModifiedDesc(a, b);
  });
}
