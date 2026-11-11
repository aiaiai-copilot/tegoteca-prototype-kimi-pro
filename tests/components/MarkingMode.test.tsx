import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { TegotecaDB, replaceWorkspace } from '../../src/data/db';
import { demoTagIds, makeDemoWorkspace } from '../../src/data/demo';

const names: string[] = [];
let activeDatabase = '';

beforeEach(() => window.localStorage.clear());
afterEach(async () => {
  cleanup();
  for (const name of names.splice(0)) {
    const db = new TegotecaDB(name);
    await db.delete();
  }
});

async function renderTwoUnmarked() {
  const workspace = makeDemoWorkspace();
  workspace.elements.push({
    id: 'E10',
    title: 'Второй набросок',
    content: { kind: 'text', text: 'Разметить позже' },
    tagIds: null,
    createdAt: 1_700_000_010_000,
    modifiedAt: 1_700_000_010_000,
  });
  activeDatabase = `tegoteca-marking-${crypto.randomUUID()}`;
  names.push(activeDatabase);
  const db = new TegotecaDB(activeDatabase);
  await replaceWorkspace(db, workspace);
  db.close();
  render(<App databaseName={activeDatabase} />);
  await screen.findByRole('heading', { name: 'Корень', level: 1 });
}

async function storedElement(id: string) {
  const db = new TegotecaDB(activeDatabase);
  const element = await db.elements.get(id);
  db.close();
  return element;
}

describe('отдельный режим разметки', () => {
  it('не меняет выборку черновиком, показывает прогресс и возвращается к оставшимся', async () => {
    await renderTwoUnmarked();
    expect(document.querySelectorAll('article[data-element-id]')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Разметка 2' }));
    const dialog = screen.getByRole('dialog', { name: 'Режим разметки' });
    expect(within(dialog).getByText('Набросок')).toBeInTheDocument();
    expect(within(dialog).getByRole('progressbar')).toHaveAttribute('max', '2');
    expect(within(dialog).getByText('Осталось: 2')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Добавить тег к разметке' }), { target: { value: 'ремонт' } });
    fireEvent.click(within(dialog).getByRole('option', { name: /^ремонт/ }));
    expect(document.querySelectorAll('article[data-element-id]')).toHaveLength(1);
    expect((await storedElement('E9'))?.tagIds).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить разметку' }));

    expect(await within(dialog).findByText('Второй набросок')).toBeInTheDocument();
    expect(within(dialog).getByText('Осталось: 1')).toBeInTheDocument();
    expect(within(dialog).getByRole('progressbar')).toHaveAttribute('value', '1');
    expect((await storedElement('E9'))?.tagIds).toEqual([demoTagIds.repair]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Вернуться к элементам' }));
    fireEvent.click(screen.getByRole('button', { name: 'Разметка 1' }));
    expect(await screen.findByText('Второй набросок')).toBeInTheDocument();
  });

  it('сохраняет заданную пустую разметку и делает элемент собственным корнем', async () => {
    await renderTwoUnmarked();
    fireEvent.click(screen.getByRole('button', { name: 'Разметка 2' }));
    const dialog = screen.getByRole('dialog', { name: 'Режим разметки' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить пустую разметку' }));

    await waitFor(() => expect(screen.getByText('Осталось: 1')).toBeInTheDocument());
    expect((await storedElement('E9'))?.tagIds).toEqual([]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Вернуться к элементам' }));
    expect(screen.getByText('Запись для последующей разметки')).toBeInTheDocument();
    expect(document.querySelector('article[data-element-id="E9"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Выборка/ }));
    expect(document.querySelectorAll('article[data-element-id]')).toHaveLength(10);
  });
});
