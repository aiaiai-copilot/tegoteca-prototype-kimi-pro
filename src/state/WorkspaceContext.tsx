import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  deleteElement(id: string): Promise<void>;
  addTag(name: string, description?: string): Promise<Tag>;
  renameTag(id: string, name: string): Promise<void>;
  deleteTag(id: string): Promise<void>;
  updateTagDescription(id: string, description: string): Promise<void>;
  loadDemo(): Promise<void>;
  addDemoMedia(): Promise<void>;
  resetWorkspace(): Promise<void>;
  generateDiagnostic(): Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children, databaseName }: { children: ReactNode; databaseName?: string }) {
  const db = useMemo(() => new TegotecaDB(databaseName), [databaseName]);
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
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
      db.close();
    };
  }, [db]);

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
    await replaceWorkspace(db, next);
    setWorkspace(next);
  }

  const value: WorkspaceContextValue = {
    workspace,
    status,
    error,
    createElement: (input) => perform(async () => {
      const now = Date.now();
      const created: Element = { ...input, id: crypto.randomUUID(), createdAt: now, modifiedAt: now };
      await putElement(db, created);
      setWorkspace((current) => ({ ...current, elements: [...current.elements, created] }));
      return created;
    }),
    saveMetadata: (id, patch) => perform(async () => {
      const original = workspace.elements.find((item) => item.id === id);
      if (!original) throw new Error('Элемент не найден.');
      const updated = updateTitleAndTags(original, patch, Date.now());
      await putElement(db, updated);
      setWorkspace((current) => ({
        ...current,
        elements: current.elements.map((item) => item.id === id ? updated : item),
      }));
      return updated;
    }),
    saveContent: (id, content) => perform(async () => {
      const original = workspace.elements.find((item) => item.id === id);
      if (!original) throw new Error('Элемент не найден.');
      const replacement = await replaceElementContent(db, original, content, Date.now());
      setWorkspace((current) => ({
        ...current,
        elements: current.elements.map((item) => item.id === id ? replacement : item),
      }));
      return replacement;
    }),
    deleteElement: (id) => perform(async () => {
      await db.elements.delete(id);
      setWorkspace((current) => ({ ...current, elements: current.elements.filter((item) => item.id !== id) }));
    }),
    addTag: (name, description = '') => perform(async () => {
      const canonical = canonicalTagName(name);
      if (!canonical) throw new Error('Название тега не может быть пустым.');
      const existing = workspace.tags.find((tag) => canonicalTagName(tag.name) === canonical);
      if (existing) return existing;
      const created: Tag = {
        id: crypto.randomUUID(),
        name: name.trim().replace(/\s+/gu, ' ').normalize('NFC'),
        description: description.trim(),
      };
      await db.tags.put(created);
      setWorkspace((current) => ({ ...current, tags: [...current.tags, created] }));
      return created;
    }),
    renameTag: (id, name) => perform(() => commitWorkspace(renameWorkspaceTag(workspace, id, name))),
    deleteTag: (id) => perform(() => commitWorkspace(removeTag(workspace, id))),
    updateTagDescription: (id, description) => perform(() => commitWorkspace(changeTagDescription(workspace, id, description))),
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
