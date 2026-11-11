import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { TegotecaDB, replaceWorkspace } from '../../src/data/db';
import { makeDemoWorkspace, demoTagIds } from '../../src/data/demo';
import type { Workspace } from '../../src/types';

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

async function renderApp(workspace: Workspace = makeDemoWorkspace()) {
  activeDatabase = `tegoteca-editing-${crypto.randomUUID()}`;
  names.push(activeDatabase);
  const db = new TegotecaDB(activeDatabase);
  await replaceWorkspace(db, workspace);
  db.close();
  render(<App databaseName={activeDatabase} />);
  await screen.findByRole('heading', { name: 'Корень', level: 1 });
}

async function storedElements() {
  const db = new TegotecaDB(activeDatabase);
  const elements = await db.elements.toArray();
  db.close();
  return elements;
}

function editCard(title: string) {
  const card = screen.getByText(title).closest('article');
  if (!card) throw new Error(`Карточка ${title} не найдена`);
  fireEvent.click(within(card).getByRole('button', { name: 'Изменить' }));
  return screen.getByRole('dialog');
}

describe('создание и редактирование', () => {
  it('предлагает теги текущего узла, создаёт тег без описания и не меняет узел после сохранения', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: /\+ ремонт/ }));
    await screen.findByRole('heading', { name: 'Узел: ремонт', level: 1 });
    fireEvent.click(screen.getByRole('button', { name: '+ Новый элемент' }));
    const dialog = screen.getByRole('dialog', { name: 'Новый элемент' });

    expect(within(dialog).getByRole('button', { name: 'Убрать тег ремонт' })).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Название' }), { target: { value: 'Новая заметка' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Текст элемента' }), { target: { value: 'Содержание заметки' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Добавить тег к разметке' }), { target: { value: 'черновик' } });
    expect(within(dialog).getByRole('textbox', { name: 'Описание нового тега (необязательно)' })).toHaveValue('');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Добавить тег' }));
    expect(await within(dialog).findByRole('button', { name: 'Убрать тег черновик' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить элемент' }));

    expect(await screen.findByRole('button', { name: 'Перейти к узлу элемента' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Узел: ремонт', level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Остаться здесь' }));
    fireEvent.click(screen.getByRole('button', { name: /^Выборка/ }));
    expect(await screen.findByText('Новая заметка')).toBeInTheDocument();
    const created = (await storedElements()).find((element) => element.title === 'Новая заметка');
    expect(created?.tagIds).toHaveLength(2);
    expect(created?.tagIds).toContain(demoTagIds.repair);
  });

  it('быстро сохраняет неразмеченный элемент и показывает его в отдельном режиме', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: '+ Новый элемент' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Название' }), { target: { value: 'Быстрый набросок' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Быстро сохранить без разметки' }));

    expect(await screen.findByRole('button', { name: 'Разметка 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Корень', level: 1 })).toBeInTheDocument();
    expect((await storedElements()).find((element) => element.title === 'Быстрый набросок')?.tagIds).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Разметка 2' }));
    expect(await screen.findByRole('dialog', { name: 'Режим разметки' })).toHaveTextContent('Набросок');
  });

  it('показывает исходную разметку и сохраняет id при изменении названия и тегов', async () => {
    await renderApp();
    const dialog = editCard('Общее');
    expect(within(dialog).getByRole('textbox', { name: 'Текст элемента' })).toHaveValue('Общая запись');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Добавить тег к разметке' }), { target: { value: 'ремонт' } });
    fireEvent.click(within(dialog).getByRole('option', { name: /^ремонт/ }));
    expect(within(dialog).getByText(/Исходная разметка:/)).toHaveTextContent('Пустой набор (корень)');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Название' }), { target: { value: 'Общее обновлённое' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить элемент' }));

    const goToElement = await screen.findByRole('button', { name: 'Перейти к узлу элемента' });
    expect(goToElement).toBeInTheDocument();
    fireEvent.click(goToElement);
    const card = (await screen.findByText('Общее обновлённое')).closest('article');
    expect(card).toHaveAttribute('data-element-id', 'E0');
    expect(card).toHaveTextContent('ремонт');
  });

  it('напоминает о соответствии тегам при новом содержании и позволяет отключить напоминание', async () => {
    await renderApp();
    let dialog = editCard('Общее');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Текст элемента' }), { target: { value: 'Новое содержание' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить элемент' }));
    expect(within(dialog).getByText(/Проверьте, что содержание соответствует тегам/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Подтвердить сохранение' }));

    await waitFor(() => expect(document.querySelector('article[data-element-id="E0"]')).not.toBeInTheDocument());
    const firstReplacement = screen.getByText('Общее').closest('article')?.getAttribute('data-element-id');
    expect(firstReplacement).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Напоминать о соответствии содержания тегам' }));
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть настройки' }));
    dialog = editCard('Общее');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Текст элемента' }), { target: { value: 'Ещё одно содержание' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить элемент' }));
    await waitFor(() => expect(document.querySelector(`article[data-element-id="${firstReplacement}"]`)).not.toBeInTheDocument());
    expect(screen.queryByText(/Проверьте, что содержание соответствует тегам/)).not.toBeInTheDocument();
  });

  it('переименовывает тег, отклоняет дубликат и показывает затронутые элементы перед удалением', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Глоссарий' }));
    const glossary = screen.getByRole('dialog', { name: 'Глоссарий' });
    const kitchen = glossary.querySelector('[data-tag-id="tag-kitchen"]') as HTMLElement;
    fireEvent.change(within(kitchen).getByRole('textbox', { name: 'Название тега' }), { target: { value: 'сад' } });
    fireEvent.click(within(kitchen).getByRole('button', { name: 'Сохранить изменения' }));
    expect(await within(glossary).findByRole('alert')).toHaveTextContent('Тег с таким названием уже существует.');
    fireEvent.change(within(kitchen).getByRole('textbox', { name: 'Название тега' }), { target: { value: 'кухонная зона' } });
    fireEvent.click(within(kitchen).getByRole('button', { name: 'Сохранить изменения' }));
    await waitFor(() => expect(within(kitchen).getByRole('textbox', { name: 'Название тега' })).toHaveValue('кухонная зона'));

    const repair = glossary.querySelector('[data-tag-id="tag-repair"]') as HTMLElement;
    fireEvent.click(within(repair).getByRole('button', { name: 'Удалить тег' }));
    expect(within(glossary).getByText(/Затронуто элементов: 4/)).toBeInTheDocument();
    expect(within(glossary).getByText('Срочно согласовать бюджет ремонта кухни')).toBeInTheDocument();
    fireEvent.click(within(glossary).getByRole('button', { name: 'Отмена' }));
    expect((await storedElements()).find((element) => element.id === 'E1')?.tagIds).toContain(demoTagIds.repair);
    fireEvent.click(within(repair).getByRole('button', { name: 'Удалить тег' }));
    fireEvent.click(within(glossary).getByRole('button', { name: 'Подтвердить удаление' }));
    await waitFor(() => expect(glossary.querySelector('[data-tag-id="tag-repair"]')).not.toBeInTheDocument());
    fireEvent.click(within(glossary).getByRole('button', { name: 'Закрыть глоссарий' }));
    expect(await screen.findByText('Подготовить ремонт')).toBeInTheDocument();
    expect((await storedElements()).find((element) => element.id === 'E1')?.tagIds).toEqual([]);
  });

  it('управляет показом own counts и подтверждает очистку и восстановление demo', async () => {
    await renderApp();
    expect(screen.getByRole('button', { name: /\+ ремонт .*Собственных: 1/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Показывать число собственных элементов' }));
    fireEvent.click(screen.getByRole('button', { name: 'Очистить рабочую область' }));
    expect(screen.getByText(/Все элементы и теги будут удалены/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить очистку' }));
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть настройки' }));
    expect(await screen.findByText(/Рабочая область пуста/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить демонстрационные данные' }));
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить загрузку' }));
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть настройки' }));
    expect(await screen.findByText('Общая запись')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ ремонт/ })).not.toHaveAccessibleName(/Собственных:/);
  });
});
