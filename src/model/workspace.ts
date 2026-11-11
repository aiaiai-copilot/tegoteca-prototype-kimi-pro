import type { Content, Element, Workspace } from '../types';
import { canonicalTagName, displayTagName, uniqueTagIds } from './tags';

export function updateTitleAndTags(
  element: Element,
  patch: { title?: string; tagIds?: string[] | null },
  now: number,
): Element {
  return {
    ...element,
    title: patch.title === undefined ? element.title : patch.title.trim(),
    tagIds: patch.tagIds === undefined
      ? element.tagIds
      : patch.tagIds === null ? null : uniqueTagIds(patch.tagIds),
    modifiedAt: now,
  };
}

export function replaceContent(element: Element, content: Content, now: number): Element {
  return {
    ...element,
    id: crypto.randomUUID(),
    content,
    createdAt: now,
    modifiedAt: now,
  };
}

export function renameTag(workspace: Workspace, id: string, newName: string): Workspace {
  const name = displayTagName(newName);
  if (!name) throw new Error('Название тега не может быть пустым.');
  const canonical = canonicalTagName(name);
  const conflict = workspace.tags.some((tag) => tag.id !== id && canonicalTagName(tag.name) === canonical);
  if (conflict) throw new Error('Тег с таким названием уже существует.');
  if (!workspace.tags.some((tag) => tag.id === id)) throw new Error('Тег не найден.');

  return {
    ...workspace,
    tags: workspace.tags.map((tag) => tag.id === id ? { ...tag, name } : tag),
  };
}

export function deleteTag(workspace: Workspace, id: string, now = Date.now()): Workspace {
  return {
    tags: workspace.tags.filter((tag) => tag.id !== id),
    elements: workspace.elements.map((element) => {
      if (element.tagIds === null || !element.tagIds.includes(id)) return element;
      return {
        ...element,
        tagIds: element.tagIds.filter((tagId) => tagId !== id),
        modifiedAt: now,
      };
    }),
  };
}

export function updateTagDescription(workspace: Workspace, id: string, description: string): Workspace {
  return {
    ...workspace,
    tags: workspace.tags.map((tag) => tag.id === id ? { ...tag, description: description.trim() } : tag),
  };
}

export function elementsUsingTag(workspace: Workspace, id: string): Element[] {
  return workspace.elements.filter((element) => element.tagIds?.includes(id));
}
