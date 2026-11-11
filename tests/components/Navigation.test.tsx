import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { TegotecaDB, replaceWorkspace } from '../../src/data/db';
import { makeDemoWorkspace } from '../../src/data/demo';
import type { Workspace } from '../../src/types';

const names: string[] = [];

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(async () => {
  cleanup();
  for (const name of names.splice(0)) {
    const db = new TegotecaDB(name);
    await db.delete();
  }
});

async function renderApp(workspace: Workspace = makeDemoWorkspace()) {
  const databaseName = `tegoteca-ui-${crypto.randomUUID()}`;
  names.push(databaseName);
  const db = new TegotecaDB(databaseName);
  await replaceWorkspace(db, workspace);
  db.close();
  render(<App databaseName={databaseName} />);
  await screen.findByRole('heading', { name: 'Корень', level: 1 });
}

async function selectTag(name: string) {
  const input = screen.getByRole('textbox', { name: 'Добавить тег к узлу' });
  fireEvent.change(input, { target: { value: name } });
  const suggestion = await screen.findByRole('option', { name: new RegExp(`^${name}`) });
  fireEvent.click(suggestion);
}

describe('основной экран', () => {
  it('в корне различает собственные, девять элементов выборки и неразмеченный E9', async () => {
    await renderApp();
    expect(screen.getByText('Общая запись')).toBeInTheDocument();
    expect(screen.queryByText('Подготовить ремонт')).not.toBeInTheDocument();
    expect(screen.queryByText('Запись для последующей разметки')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Выборка/ }));

    expect(screen.getByText('Подготовить ремонт')).toBeInTheDocument();
    expect(screen.getByText('Полить сад')).toBeInTheDocument();
    expect(screen.getByText('Заметка о кухне')).toBeInTheDocument();
    expect(screen.queryByText('Запись для последующей разметки')).not.toBeInTheDocument();
    expect(screen.getByText('Общая запись').closest('article')).toHaveClass('element-card--own');
    expect(document.querySelectorAll('article[data-element-id]')).toHaveLength(9);
  });

  it('сохраняет режим и сортировку при переходах, истории и показывает пустой собственный узел', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: /\+ ремонт/ }));
    expect(await screen.findByText('Подготовить ремонт')).toBeInTheDocument();
    expect(screen.queryByText('План электрики при ремонте кухни')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Выборка/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Сортировка' }), { target: { value: 'title' } });
    expect(screen.getByText('План электрики при ремонте кухни')).toBeInTheDocument();
    expect([...document.querySelectorAll('article[data-element-id]')].map((item) => item.getAttribute('data-element-id'))).toEqual(['E5', 'E3', 'E1', 'E4']);

    await selectTag('кухня');
    await screen.findByRole('heading', { name: 'Узел: ремонт · кухня', level: 1 });
    expect(screen.getByRole('button', { name: /^Выборка/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('title');

    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    await screen.findByRole('heading', { name: 'Узел: ремонт', level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Вперёд' }));
    await screen.findByRole('heading', { name: 'Узел: ремонт · кухня', level: 1 });
    fireEvent.click(screen.getByRole('button', { name: /^Собственные/ }));
    expect(screen.getByText('В этом узле нет собственных элементов.')).toBeInTheDocument();
  });

  it('переходит в незаполненный узел мечта через все теги и возвращается в корень', async () => {
    await renderApp();
    fireEvent.change(screen.getByRole('combobox', { name: 'Источник предложений' }), { target: { value: 'all' } });
    await selectTag('мечта');

    await screen.findByRole('heading', { name: 'Узел: мечта', level: 1 });
    expect(screen.getByText('С этими тегами пока нет элементов.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'В корень' }));
    await screen.findByRole('heading', { name: 'Корень', level: 1 });
    expect(screen.getByText('Общая запись')).toBeInTheDocument();
  });

  it('показывает первый запуск пустой рабочей области', async () => {
    await renderApp({ tags: [], elements: [] });
    expect(screen.getByText(/Рабочая область пуста/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить первый элемент' })).toBeInTheDocument();
  });

  it('удерживает длинный набор тегов и отличает E7 от E8', async () => {
    await renderApp();
    fireEvent.change(screen.getByRole('combobox', { name: 'Источник предложений' }), { target: { value: 'all' } });
    for (const name of ['день_рождения', 'май', '5', 'игорь', 'артемьев']) {
      await selectTag(name);
    }

    await screen.findByText('Игорь');
    expect(screen.queryByText('Анна')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Убрать тег / })).toHaveLength(5);
    expect(screen.getByText('Пустое содержание — смысл задан тегами.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'В корень' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('день_рождения'));
  });
});
