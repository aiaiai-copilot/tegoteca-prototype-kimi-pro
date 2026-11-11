import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { Content, Element, Tag, Workspace } from '../types';
import {
  TegotecaDB,
  loadWorkspace,
  putElement,
  replaceElementContent,
  replaceWorkspace,
} from '../data/db';
import { fetchDemoMedia, makeDemoWorkspace } from '../data/demo';
import { generateDiagnosticWorkspace } from '../model/diagnostic';
import { canonicalTagName } from '../model/tags';
import {
  deleteTag as removeTag,
  renameTag as renameWorkspaceTag,
  updateTagDescription as changeTagDescription,
  updateTitleAndTags,
} from '../model/workspace';

const emptyWorkspace: Workspace = { tags: [], elements: [] };

export interface CreateElementInput {
  title: string;
  content: Content;
  tagIds: string[] | null;
}

export interface WorkspaceContextValue {
  workspace: Workspace;
  status: 'loading' | 'ready' | 'error';
  error: string;
  createElement(input: CreateElementInput): Promise<Element>;
  saveMetadata(id: string, patch: { title?: string; tagIds?: string[] | null }): Promise<Element>;
  saveContent(id: string, content: Content): Promise<Element>;
  saveElement(id: string, input: CreateElementInput, contentChanged: boolean): Promise<Element>;
  deleteElement(id: string): Promise<void>;
  addTag(name: string, description?: string): Promise<Tag>;
  saveTag(id: string, patch: { name: string; description: string }): Promise<void>;
  deleteTag(id: string): Promise<void>;
  loadDemo(): Promise<void>;
  addDemoMedia(): Promise<void>;
  resetWorkspace(): Promise<void>;
  generateDiagnostic(): Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children, databaseName }: { children: ReactNode; databaseName?: string }) {
  const dbRef = useRef<TegotecaDB | null>(null);
  const getDb = () => {
    if (!dbRef.current) dbRef.current = new TegotecaDB(databaseName);
    return dbRef.current;
  };
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const db = new TegotecaDB(databaseName);
    dbRef.current = db;
    setStatus('loading');
    loadWorkspace(db)
      .then((loaded) => {
        if (!active) return;
        setWorkspace(loaded);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('error');
      });
    return () => {
      active = false;
      if (dbRef.current === db) dbRef.current = null;
      db.close();
    };
  }, [databaseName]);

  async function perform<T>(action: () => Promise<T>): Promise<T> {
    setError('');
    try {
      return await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  }

  async function commitWorkspace(next: Workspace): Promise<void> {
    await replaceWorkspace(getDb(), next);
    setWorkspace(next);
  }

  const value: WorkspaceContextValue = {
    workspace,
    status,
    error,
    createElement: (input) => perform(async () => {
      const now = Date.now();
      const created: Element = { ...input, id: crypto.randomUUID(), createdAt: now, modifiedAt: now };
      await putElement(getDb(), created);
      setWorkspace((current) => ({ ...current, elements: [...current.elements, created] }));
      return created;
    }),
    saveMetadata: (id, patch) => perform(async () => {
      const original = workspace.elements.find((item) => item.id === id);
      if (!original) throw new Error('Элемент не найден.');
      const updated = updateTitleAndTags(original, patch, Date.now());
      await putElement(getDb(), updated);
      setWorkspace((current) => ({
        ...current,
        elements: current.elements.map((item) => item.id === id ? updated : item),
      }));
      return updated;
    }),
    saveContent: (id, content) => perform(async () => {
      const original = workspace.elements.find((item) => item.id === id);
      if (!original) throw new Error('Элемент не найден.');
      const replacement = await replaceElementContent(getDb(), original, content, Date.now());
      setWorkspace((current) => ({
        ...current,
        elements: current.elements.map((item) => item.id === id ? replacement : item),
      }));
      return replacement;
    }),
    saveElement: (id, input, contentChanged) => perform(async () => {
      const original = workspace.elements.find((item) => item.id === id);
      if (!original) throw new Error('Элемент не найден.');
      let saved: Element;
      if (contentChanged) {
        saved = await replaceElementContent(getDb(), original, input.content, Date.now(), {
          title: input.title,
          tagIds: input.tagIds,
        });
      } else {
        saved = updateTitleAndTags(original, { title: input.title, tagIds: input.tagIds }, Date.now());
        await putElement(getDb(), saved);
      }
      setWorkspace((current) => ({
        ...current,
        elements: current.elements.map((item) => item.id === id ? saved : item),
      }));
      return saved;
    }),
    deleteElement: (id) => perform(async () => {
      await getDb().elements.delete(id);
      setWorkspace((current) => ({ ...current, elements: current.elements.filter((item) => item.id !== id) }));
    }),
    addTag: (name, description = '') => perform(async () => {
      const canonical = canonicalTagName(name);
      if (!canonical) throw new Error('Название тега не может быть пустым.');
      const db = getDb();
      const tag = await db.transaction('rw', db.tags, async () => {
        const existing = (await db.tags.toArray()).find((item) => canonicalTagName(item.name) === canonical);
        if (existing) return existing;
        const created: Tag = {
          id: crypto.randomUUID(),
          name: name.trim().replace(/\s+/gu, ' ').normalize('NFC'),
          description: description.trim(),
        };
        await db.tags.put(created);
        return created;
      });
      setWorkspace((current) => {
        if (current.tags.some((item) => canonicalTagName(item.name) === canonical)) return current;
        return { ...current, tags: [...current.tags, tag] };
      });
      return tag;
    }),
    saveTag: (id, patch) => perform(async () => {
      const db = getDb();
      const next = await db.transaction('rw', db.tags, db.elements, async () => {
        const current: Workspace = {
          tags: await db.tags.toArray(),
          elements: await db.elements.toArray(),
        };
        const renamed = renameWorkspaceTag(current, id, patch.name);
        const updated = changeTagDescription(renamed, id, patch.description);
        await replaceWorkspace(db, updated);
        return updated;
      });
      setWorkspace(next);
    }),
    deleteTag: (id) => perform(() => commitWorkspace(removeTag(workspace, id))),
    loadDemo: () => perform(() => commitWorkspace(makeDemoWorkspace())),
    addDemoMedia: () => perform(async () => {
      const media = await fetchDemoMedia();
      const nextTags = [...workspace.tags];
      const ensureTag = (name: string): string => {
        const existing = nextTags.find((tag) => canonicalTagName(tag.name) === canonicalTagName(name));
        if (existing) return existing.id;
        const created: Tag = { id: crypto.randomUUID(), name, description: '' };
        nextTags.push(created);
        return created.id;
      };
      const newElements = media.filter((item) => !workspace.elements.some((element) => element.id === item.id)).map((item) => {
        const now = Date.now();
        return {
          id: item.id,
          title: item.title,
          content: { kind: 'file' as const, fileKind: item.fileKind, blob: item.blob, name: item.name, mime: item.mime },
          tagIds: [ensureTag('медиа'), ensureTag(item.tagName)],
          createdAt: now,
          modifiedAt: now,
        };
      });
      const newTags = nextTags.filter((tag) => !workspace.tags.some((existing) => existing.id === tag.id));
      const db = getDb();
      await db.transaction('rw', db.tags, db.elements, async () => {
        await db.tags.bulkPut(newTags);
        await db.elements.bulkPut(newElements);
      });
      setWorkspace({ tags: nextTags, elements: [...workspace.elements, ...newElements] });
    }),
    resetWorkspace: () => perform(() => commitWorkspace(emptyWorkspace)),
    generateDiagnostic: () => perform(() => commitWorkspace(generateDiagnosticWorkspace())),
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace должен использоваться внутри WorkspaceProvider.');
  return context;
}
