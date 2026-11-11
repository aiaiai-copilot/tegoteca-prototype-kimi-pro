import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { TegotecaDB } from '../../src/data/db';
import { WorkspaceProvider, useWorkspace } from '../../src/state/WorkspaceContext';

const names: string[] = [];

afterEach(async () => {
  for (const name of names.splice(0)) {
    const db = new TegotecaDB(name);
    await db.delete();
  }
});

function setup() {
  const databaseName = `tegoteca-context-${crypto.randomUUID()}`;
  names.push(databaseName);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WorkspaceProvider databaseName={databaseName}>{children}</WorkspaceProvider>
  );
  return renderHook(() => useWorkspace(), { wrapper });
}

describe('операции рабочей области', () => {
  it('загружает демонстрационный набор и добавляет тег без дубликатов по регистру', async () => {
    const { result, unmount } = setup();
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.loadDemo());
    expect(result.current.workspace.elements).toHaveLength(10);
    expect(result.current.workspace.tags).toHaveLength(15);

    let firstId = '';
    await act(async () => { firstId = (await result.current.addTag('  Новый тег ', 'Описание')).id; });
    await act(async () => {
      const duplicate = await result.current.addTag('НОВЫЙ ТЕГ');
      expect(duplicate.id).toBe(firstId);
    });
    expect(result.current.workspace.tags.filter((tag) => tag.id === firstId)).toHaveLength(1);
    expect(result.current.workspace.tags.find((tag) => tag.id === firstId)?.description).toBe('Описание');
    unmount();
  });

  it('дедуплицирует канонически одинаковые теги при параллельном создании', async () => {
    const { result, unmount } = setup();
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let ids: string[] = [];
    await act(async () => {
      ids = (await Promise.all([
        result.current.addTag('  Параллельный   тег '),
        result.current.addTag('ПАРАЛЛЕЛЬНЫЙ ТЕГ'),
      ])).map((tag) => tag.id);
    });
    expect(ids[0]).toBe(ids[1]);
    expect(result.current.workspace.tags).toHaveLength(1);
    const databaseName = names[names.length - 1];
    const db = new TegotecaDB(databaseName);
    expect(await db.tags.toArray()).toHaveLength(1);
    db.close();
    unmount();
  });

  it('сохраняет id при метаданных и заменяет запись при новом содержании', async () => {
    const { result, unmount } = setup();
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let id = '';
    await act(async () => {
      const created = await result.current.createElement({
        title: 'Черновик',
        content: { kind: 'text', text: 'Исходный текст' },
        tagIds: [],
      });
      id = created.id;
    });
    await act(() => result.current.saveMetadata(id, { title: 'Готовая запись', tagIds: [] }));
    expect(result.current.workspace.elements[0]).toMatchObject({ id, title: 'Готовая запись', tagIds: [] });

    let replacementId = '';
    await act(async () => {
      replacementId = (await result.current.saveContent(id, { kind: 'text', text: 'Изменённый текст' })).id;
    });
    expect(replacementId).not.toBe(id);
    expect(result.current.workspace.elements).toHaveLength(1);
    expect(result.current.workspace.elements[0].id).toBe(replacementId);

    await act(() => result.current.deleteElement(replacementId));
    expect(result.current.workspace.elements).toEqual([]);
    unmount();
  });
});
