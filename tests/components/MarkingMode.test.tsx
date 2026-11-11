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

async function storedElements() {
  const db = new TegotecaDB(activeDatabase);
  const elements = await db.elements.toArray();
  db.close();
  return elements;
}

describe('отдельный режим разметки', () => {
  it('редактирует содержание без разметки, сохраняет очередь и создаёт новый id', async () => {
    await renderTwoUnmarked();
    fireEvent.click(screen.getByRole('button', { name: 'Разметка 2' }));
    const marking = screen.getByRole('dialog', { name: 'Режим разметки' });
    fireEvent.click(within(marking).getByRole('button', { name: 'Изменить элемент' }));
    const editor = screen.getByRole('dialog', { name: 'Изменение элемента' });
    expect(within(editor).getByRole('checkbox', { name: 'Оставить без разметки' })).toBeChecked();
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Название' }), { target: { value: 'Исправленный набросок' } });
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Текст элемента' }), { target: { value: 'Исправленное содержание' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Сохранить элемент' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'Подтвердить сохранение' }));

    await waitFor(async () => {
      const changed = (await storedElements()).find((element) => element.title === 'Исправленный набросок');
      expect(changed).toMatchObject({
        content: { kind: 'text', text: 'Исправленное содержание' },
        tagIds: null,
      });
      expect(changed?.id).not.toBe('E9');
    });
    expect(await storedElement('E9')).toBeUndefined();
    expect(screen.queryByRole('dialog', { name: 'Изменение элемента' })).not.toBeInTheDocument();
    expect(within(marking).getByText('Осталось: 2')).toBeInTheDocument();
    expect(within(marking).getByRole('progressbar')).toHaveAttribute('value', '0');
  });

  it('удаляет неразмеченный элемент после подтверждения без учёта его как размеченного', async () => {
    await renderTwoUnmarked();
    fireEvent.click(screen.getByRole('button', { name: 'Разметка 2' }));
    const marking = screen.getByRole('dialog', { name: 'Режим разметки' });
    fireEvent.click(within(marking).getByRole('button', { name: 'Удалить элемент' }));
    fireEvent.click(within(marking).getByRole('button', { name: 'Подтвердить удаление элемента' }));

    await waitFor(async () => expect(await storedElement('E9')).toBeUndefined());
    expect((await storedElement('E10'))?.tagIds).toBeNull();
    expect(within(marking).getByText('Осталось: 1')).toBeInTheDocument();
    expect(within(marking).getByRole('progressbar')).toHaveAttribute('value', '0');
  });

  it('учитывает разметку через полный редактор в прогрессе сеанса', async () => {
    await renderTwoUnmarked();
    fireEvent.click(screen.getByRole('button', { name: 'Разметка 2' }));
    const marking = screen.getByRole('dialog', { name: 'Режим разметки' });
    fireEvent.click(within(marking).getByRole('button', { name: 'Изменить элемент' }));
    const editor = screen.getByRole('dialog', { name: 'Изменение элемента' });
    fireEvent.click(within(editor).getByRole('checkbox', { name: 'Оставить без разметки' }));
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Добавить тег к разметке' }), { target: { value: 'ремонт' } });
    fireEvent.click(within(editor).getByRole('option', { name: /^ремонт/ }));
    fireEvent.click(within(editor).getByRole('button', { name: 'Сохранить элемент' }));

    expect(await within(marking).findByText('Второй набросок')).toBeInTheDocument();
    expect(within(marking).getByText('Осталось: 1')).toBeInTheDocument();
    expect(within(marking).getByRole('progressbar')).toHaveAttribute('value', '1');
    expect((await storedElement('E9'))?.tagIds).toEqual([demoTagIds.repair]);
    expect(screen.queryByRole('dialog', { name: 'Элемент сохранён' })).not.toBeInTheDocument();
  });

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
