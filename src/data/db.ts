import Dexie, { type Table } from 'dexie';
import type { Content, Element, Tag, Workspace } from '../types';
import { replaceContent } from '../model/workspace';

export class TegotecaDB extends Dexie {
  tags!: Table<Tag, string>;
  elements!: Table<Element, string>;

  constructor(name = 'tegoteca-prototype') {
    super(name);
    this.version(1).stores({
      tags: 'id',
      elements: 'id, modifiedAt',
    });
  }
}

export async function loadWorkspace(db: TegotecaDB): Promise<Workspace> {
  return db.transaction('r', db.tags, db.elements, async () => ({
    tags: await db.tags.toArray(),
    elements: await db.elements.toArray(),
  }));
}

export async function replaceWorkspace(db: TegotecaDB, workspace: Workspace): Promise<void> {
  await db.transaction('rw', db.tags, db.elements, async () => {
    await db.tags.clear();
    await db.elements.clear();
    await db.tags.bulkPut(workspace.tags);
    await db.elements.bulkPut(workspace.elements);
  });
}

export async function putElement(db: TegotecaDB, element: Element): Promise<void> {
  await db.elements.put(element);
}

export async function replaceElementContent(
  db: TegotecaDB,
  element: Element,
  content: Content,
  now: number,
): Promise<Element> {
  const replacement = replaceContent(element, content, now);
  await db.transaction('rw', db.elements, async () => {
    await db.elements.delete(element.id);
    await db.elements.put(replacement);
  });
  return replacement;
}
