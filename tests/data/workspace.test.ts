import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, describe, expect, it } from 'vitest';
import {
  TegotecaDB,
  loadWorkspace,
  putElement,
  replaceElementContent,
  replaceWorkspace,
} from '../../src/data/db';
import { makeDemoWorkspace } from '../../src/data/demo';
import { element } from '../fixtures';
import type { Element } from '../../src/types';

const databases: TegotecaDB[] = [];

function database(): TegotecaDB {
  const db = new TegotecaDB(`tegoteca-test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map(async (db) => {
    db.close();
    await db.delete();
  }));
});

describe('локальное хранилище', () => {
  it('первый запуск возвращает пустую рабочую область', async () => {
    const db = database();

    expect(await loadWorkspace(db)).toEqual({ tags: [], elements: [] });
  });

  it('сохраняет E0–E9, глоссарий и различие null/пустого набора', async () => {
    const db = database();
    const demo = makeDemoWorkspace();
    await replaceWorkspace(db, demo);

    const restored = await loadWorkspace(db);
    expect(restored.elements.map((item) => item.id).sort()).toEqual(['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9']);
    expect(restored.tags.find((tag) => tag.name === 'бюджет')?.description).toBe('Планируемые расходы');
    expect(restored.tags.some((tag) => tag.name === 'мечта')).toBe(true);
    expect(element(restored, 'E0').tagIds).toEqual([]);
    expect(element(restored, 'E9').tagIds).toBeNull();
  });

  it('сохраняет сами bytes и MIME файла, а не только имя', async () => {
    const db = database();
    const source = element(makeDemoWorkspace(), 'E1');
    const fileElement: Element = {
      ...source,
      id: 'binary',
      content: {
        kind: 'file',
        fileKind: 'other',
        name: 'data.bin',
        mime: 'application/octet-stream',
        blob: new NodeBlob([new Uint8Array([0, 1, 2, 255])], { type: 'application/octet-stream' }) as unknown as Blob,
      },
    };
    await putElement(db, fileElement);

    const restored = (await loadWorkspace(db)).elements[0];
    expect(restored.content.kind).toBe('file');
    if (restored.content.kind !== 'file') throw new Error('Expected file');
    expect(restored.content.name).toBe('data.bin');
    expect(restored.content.mime).toBe('application/octet-stream');
    expect([...new Uint8Array(await restored.content.blob.arrayBuffer())]).toEqual([0, 1, 2, 255]);
  });

  it('замена содержания атомарно удаляет исходный id и сохраняет новый', async () => {
    const db = database();
    const demo = makeDemoWorkspace();
    await replaceWorkspace(db, demo);
    const original = element(demo, 'E3');

    const replaced = await replaceElementContent(db, original, { kind: 'text', text: 'Новое содержание' }, 2_000_000_000_000);
    const restored = await loadWorkspace(db);

    expect(replaced.id).not.toBe(original.id);
    expect(restored.elements.some((item) => item.id === original.id)).toBe(false);
    expect(restored.elements.some((item) => item.id === replaced.id)).toBe(true);
    expect(replaced.tagIds).toEqual(original.tagIds);
  });

  it('ошибка записи откатывает всю операцию и оставляет прежние данные', async () => {
    const db = database();
    const demo = makeDemoWorkspace();
    await replaceWorkspace(db, demo);
    const invalid = {
      ...element(demo, 'E1'),
      id: 'invalid',
      uncloneable: () => undefined,
    } as unknown as Element;

    await expect(replaceWorkspace(db, { tags: [], elements: [invalid] })).rejects.toThrow();

    const restored = await loadWorkspace(db);
    expect(restored.elements).toHaveLength(10);
    expect(restored.tags).toHaveLength(15);
    expect(element(restored, 'E1').title).toBe('Ремонт');
  });
});
