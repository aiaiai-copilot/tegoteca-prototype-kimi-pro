import type { Tag, Workspace } from '../types';
import { selectElements } from './elements';
import { canonicalTagName, differenceTagIds, isSubset, nodeKey, uniqueTagIds } from './tags';

export interface Transition {
  direction: 'ancestor' | 'descendant';
  tagIds: string[];
  changedTagIds: string[];
  distance: number;
  ownCount: number;
  selectionCount: number;
}

interface FilledNode {
  tagIds: string[];
  ownCount: number;
}

function filledNodes(workspace: Workspace): Map<string, FilledNode> {
  const nodes = new Map<string, FilledNode>();
  for (const element of workspace.elements) {
    if (element.tagIds === null) continue;
    const tagIds = uniqueTagIds(element.tagIds);
    const key = nodeKey(tagIds);
    const existing = nodes.get(key);
    if (existing) existing.ownCount += 1;
    else nodes.set(key, { tagIds, ownCount: 1 });
  }
  return nodes;
}

function selectionCount(workspace: Workspace, tagIds: readonly string[]): number {
  return workspace.elements.reduce((count, element) =>
    count + (element.tagIds !== null && isSubset(tagIds, element.tagIds) ? 1 : 0), 0,
  );
}

export function getTransitions(workspace: Workspace, current: readonly string[]): Transition[] {
  const currentIds = uniqueTagIds(current);
  const nodes = [...filledNodes(workspace).values()];

  const descendants = new Map<string, FilledNode>();
  for (const element of selectElements(workspace, currentIds)) {
    if (element.tagIds === null || element.tagIds.length <= currentIds.length) continue;
    const tagIds = uniqueTagIds(element.tagIds);
    descendants.set(nodeKey(tagIds), { tagIds, ownCount: 0 });
  }
  for (const node of nodes) {
    if (node.tagIds.length > currentIds.length && isSubset(currentIds, node.tagIds)) {
      descendants.set(nodeKey(node.tagIds), node);
    }
  }

  const nearestDescendants: FilledNode[] = [];
  const descendantCandidates = [...descendants.values()].sort((a, b) =>
    a.tagIds.length - b.tagIds.length || nodeKey(a.tagIds).localeCompare(nodeKey(b.tagIds)),
  );
  for (const candidate of descendantCandidates) {
    if (!nearestDescendants.some((neighbor) => isSubset(neighbor.tagIds, candidate.tagIds))) {
      nearestDescendants.push(candidate);
    }
  }

  const nearestAncestors: FilledNode[] = [];
  const ancestorCandidates = nodes
    .filter((node) => node.tagIds.length < currentIds.length && isSubset(node.tagIds, currentIds))
    .sort((a, b) => b.tagIds.length - a.tagIds.length || nodeKey(a.tagIds).localeCompare(nodeKey(b.tagIds)));
  for (const candidate of ancestorCandidates) {
    if (!nearestAncestors.some((neighbor) => isSubset(candidate.tagIds, neighbor.tagIds))) {
      nearestAncestors.push(candidate);
    }
  }

  const tagNames = new Map(workspace.tags.map((tag) => [tag.id, tag.name]));
  const byDisplayName = (a: string, b: string) =>
    (tagNames.get(a) ?? a).localeCompare(tagNames.get(b) ?? b, 'ru') || a.localeCompare(b);
  const transitions = [
    ...nearestAncestors.map((node): Transition => ({
      direction: 'ancestor',
      tagIds: node.tagIds,
      changedTagIds: differenceTagIds(currentIds, node.tagIds).sort(byDisplayName),
      distance: currentIds.length - node.tagIds.length,
      ownCount: node.ownCount,
      selectionCount: selectionCount(workspace, node.tagIds),
    })),
    ...nearestDescendants.map((node): Transition => ({
      direction: 'descendant',
      tagIds: node.tagIds,
      changedTagIds: differenceTagIds(node.tagIds, currentIds).sort(byDisplayName),
      distance: node.tagIds.length - currentIds.length,
      ownCount: node.ownCount,
      selectionCount: selectionCount(workspace, node.tagIds),
    })),
  ];

  return transitions.sort((a, b) => {
    const aLabel = a.changedTagIds.map((id) => tagNames.get(id) ?? id).join(' ');
    const bLabel = b.changedTagIds.map((id) => tagNames.get(id) ?? id).join(' ');
    return a.distance - b.distance
      || aLabel.localeCompare(bLabel, 'ru')
      || nodeKey(a.tagIds).localeCompare(nodeKey(b.tagIds));
  });
}

export function getAutocomplete(
  workspace: Workspace,
  current: readonly string[],
  query: string,
  scope: 'selection' | 'all',
): Tag[] {
  const selected = new Set(current);
  const available = new Set<string>();
  if (scope === 'all') {
    for (const tag of workspace.tags) available.add(tag.id);
  } else {
    for (const element of selectElements(workspace, current)) {
      for (const tagId of element.tagIds ?? []) available.add(tagId);
    }
  }

  const needle = canonicalTagName(query);
  return workspace.tags
    .filter((tag) => available.has(tag.id) && !selected.has(tag.id) && canonicalTagName(tag.name).includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base', numeric: true }) || a.id.localeCompare(b.id));
}
