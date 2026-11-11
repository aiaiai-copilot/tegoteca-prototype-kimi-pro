import { test, expect } from '@playwright/test';
import { loadDemo, openEditorFor, openEmptyWorkspace, screenshot, selectNodeTag } from './helpers';

test('корень, выборка, соседние переходы и пустой узел', async ({ page }) => {
  await loadDemo(page);
  await expect(page.locator('article[data-element-id]')).toHaveCount(1);
  await expect(page.getByText('Общая запись')).toBeVisible();
  await expect(page.getByText('Запись для последующей разметки')).toHaveCount(0);
  await screenshot(page, 'root');

  await page.getByRole('button', { name: /^Выборка/ }).click();
  await expect(page.locator('article[data-element-id]')).toHaveCount(9);
  await expect(page.locator('article[data-element-id="E0"]')).toHaveClass(/element-card--own/);
  await expect(page.getByText('Запись для последующей разметки')).toHaveCount(0);
  await screenshot(page, 'selection');

  await page.getByRole('button', { name: /\+ ремонт/ }).click();
  await expect(page.getByRole('heading', { name: 'Узел: ремонт', level: 1 })).toBeVisible();
  await expect(page.locator('article[data-element-id]')).toHaveCount(4);
  await selectNodeTag(page, 'кухня');
  await expect(page.getByRole('heading', { name: 'Узел: ремонт · кухня', level: 1 })).toBeVisible();
  await expect(page.locator('article[data-element-id]')).toHaveCount(3);
  await page.getByRole('button', { name: /^Собственные/ }).click();
  await expect(page.getByText('В этом узле нет собственных элементов.')).toBeVisible();

  await page.getByRole('button', { name: 'В корень', exact: true }).click();
  await selectNodeTag(page, 'мечта', 'all');
  await expect(page.getByRole('heading', { name: 'Узел: мечта', level: 1 })).toBeVisible();
  await expect(page.getByText('С этими тегами пока нет элементов.')).toBeVisible();
  await screenshot(page, 'unfilled-node');
});

test('история, режим и сортировка сохраняются при переходах', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('button', { name: /\+ ремонт/ }).click();
  await page.getByRole('button', { name: /^Выборка/ }).click();
  await page.getByRole('combobox', { name: 'Сортировка' }).selectOption('title');
  await expect(page.locator('article[data-element-id]')).toHaveCount(4);
  expect(await page.locator('article[data-element-id]').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-element-id')))).toEqual(['E5', 'E3', 'E1', 'E4']);

  await selectNodeTag(page, 'кухня');
  await expect(page.getByRole('heading', { name: 'Узел: ремонт · кухня', level: 1 })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('title');
  await expect(page.getByRole('button', { name: /^Выборка/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByRole('heading', { name: 'Узел: ремонт', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Вперёд' }).click();
  await expect(page.getByRole('heading', { name: 'Узел: ремонт · кухня', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).click();
  await page.getByRole('button', { name: 'В корень', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Вперёд' })).toBeDisabled();
});

test('создание меняет соседство, удаление восстанавливает его', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('button', { name: /\+ ремонт/ }).click();
  await selectNodeTag(page, 'кухня');
  await page.getByRole('button', { name: '+ Новый элемент' }).click();
  const editor = page.getByRole('dialog', { name: 'Новый элемент' });
  await editor.getByRole('textbox', { name: 'Название' }).fill('Новый собственный');
  await editor.getByRole('textbox', { name: 'Текст элемента' }).fill('Запись промежуточного узла');
  await editor.getByRole('button', { name: 'Сохранить элемент' }).click();
  await expect(page.getByText('Новый собственный')).toBeVisible();
  await expect(page.locator('article[data-element-id]')).toHaveCount(1);
  await page.getByRole('button', { name: /^Выборка/ }).click();
  await expect(page.locator('article[data-element-id]')).toHaveCount(4);

  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByRole('button', { name: /^\+ кухня · Выборка: 4 · Собственных: 1$/ })).toBeVisible();
  await page.getByRole('button', { name: /^\+ кухня · Выборка: 4/ }).click();
  const editorAgain = await openEditorFor(page, 'Новый собственный');
  await editorAgain.getByRole('button', { name: 'Удалить элемент' }).click();
  await editorAgain.getByRole('button', { name: 'Подтвердить удаление элемента' }).click();
  await expect(page.getByText('В этом узле нет собственных элементов.')).toHaveCount(0);
  await expect(page.getByText('Новый собственный')).toHaveCount(0);
  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByRole('button', { name: /^\+ кухня · Выборка:/ })).toHaveCount(0);
});

test('разметка E9 пустым набором и возврат к оставшимся', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('button', { name: 'Разметка 1' }).click();
  const marking = page.getByRole('dialog', { name: 'Режим разметки' });
  await expect(marking.getByText('Набросок')).toBeVisible();
  await marking.getByRole('button', { name: 'Сохранить пустую разметку' }).click();
  await expect(marking.getByText('Осталось: 0')).toBeVisible();
  await marking.getByRole('button', { name: 'Вернуться к элементам' }).click();
  await expect(page.locator('article[data-element-id="E9"]')).toBeVisible();
  await page.getByRole('button', { name: /^Выборка/ }).click();
  await expect(page.locator('article[data-element-id]')).toHaveCount(10);
});

test('неразмеченный элемент редактируется и удаляется из очереди с сохранением после reload', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('button', { name: 'Разметка 1' }).click();
  const marking = page.getByRole('dialog', { name: 'Режим разметки' });
  await screenshot(page, 'marking-actions');
  await marking.getByRole('button', { name: 'Изменить элемент' }).click();
  const editor = page.getByRole('dialog', { name: 'Изменение элемента' });
  await expect(editor.getByRole('checkbox', { name: 'Оставить без разметки' })).toBeChecked();
  await expect(editor.getByText('Разметка не задана')).toBeVisible();
  await editor.getByRole('textbox', { name: 'Название' }).fill('Исправленный набросок');
  await editor.getByRole('textbox', { name: 'Текст элемента' }).fill('Исправленное содержание');
  await screenshot(page, 'marking-editor');
  await editor.getByRole('button', { name: 'Сохранить элемент' }).click();
  await editor.getByRole('button', { name: 'Подтвердить сохранение' }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Элемент сохранён' })).toHaveCount(0);
  await expect(marking.getByText('Осталось: 1')).toBeVisible();
  await expect(marking.getByRole('progressbar')).toHaveAttribute('value', '0');

  await page.reload();
  await page.getByRole('button', { name: 'Разметка 1' }).click();
  await expect(marking.getByText('Исправленный набросок')).toBeVisible();
  await expect(marking.getByText('Исправленное содержание')).toBeVisible();
  await marking.getByRole('button', { name: 'Удалить элемент' }).click();
  await marking.getByRole('button', { name: 'Подтвердить удаление элемента' }).click();
  await expect(marking.getByText('Все элементы размечены.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Разметка', exact: true })).toBeVisible();
});

test('глоссарий переименовывает, отклоняет дубликат и удаляет тег с подтверждением', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('button', { name: 'Глоссарий' }).click();
  const glossary = page.getByRole('dialog', { name: 'Глоссарий' });
  const kitchen = glossary.locator('[data-tag-id="tag-kitchen"]');
  await kitchen.getByRole('textbox', { name: 'Название тега' }).fill('сад');
  await kitchen.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(glossary.getByRole('alert')).toContainText('Тег с таким названием уже существует.');
  await kitchen.getByRole('textbox', { name: 'Название тега' }).fill('кухонная зона');
  await kitchen.getByRole('textbox', { name: 'Описание тега' }).fill('Место для готовки');
  await kitchen.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(kitchen.getByRole('textbox', { name: 'Название тега' })).toHaveValue('кухонная зона');
  await expect(page.getByRole('button', { name: /^\+ кухонная зона/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Глоссарий' }).click();
  await expect(kitchen.getByRole('textbox', { name: 'Название тега' })).toHaveValue('кухонная зона');
  await expect(kitchen.getByRole('textbox', { name: 'Описание тега' })).toHaveValue('Место для готовки');

  const repair = glossary.locator('[data-tag-id="tag-repair"]');
  await repair.getByRole('button', { name: 'Удалить тег' }).click();
  await expect(glossary.getByText(/Затронуто элементов: 4/)).toBeVisible();
  await repair.getByRole('button', { name: 'Отмена' }).click();
  await repair.getByRole('button', { name: 'Удалить тег' }).click();
  await repair.getByRole('button', { name: 'Подтвердить удаление' }).click();
  await expect(glossary.locator('[data-tag-id="tag-repair"]')).toHaveCount(0);
  await screenshot(page, 'glossary');
  await glossary.getByRole('button', { name: 'Закрыть глоссарий' }).click();
  await expect(page.locator('article[data-element-id="E1"]')).toBeVisible();
  await expect(page.locator('article[data-element-id="E1"]')).toContainText('Пустая разметка · корень');
});

test('пустая область, первый тег и первый неразмеченный элемент', async ({ page }) => {
  await openEmptyWorkspace(page);
  await page.getByRole('button', { name: 'Добавить первый элемент' }).click();
  const editor = page.getByRole('dialog', { name: 'Новый элемент' });
  await editor.getByRole('textbox', { name: 'Название' }).fill('Первая запись');
  await editor.getByRole('textbox', { name: 'Текст элемента' }).fill('Первый текст');
  await editor.getByRole('textbox', { name: 'Добавить тег к разметке' }).fill('первый тег');
  await editor.getByRole('button', { name: 'Добавить тег' }).click();
  await expect(editor.getByRole('button', { name: 'Убрать тег первый тег' })).toBeVisible();
  await editor.getByRole('button', { name: 'Сохранить элемент' }).click();
  await page.getByRole('button', { name: 'Перейти к узлу элемента' }).click();
  await expect(page.getByText('Первая запись')).toBeVisible();

  await page.getByRole('button', { name: '+ Новый элемент' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Название' }).fill('Первый набросок');
  await page.getByRole('dialog').getByRole('button', { name: 'Быстро сохранить без разметки' }).click();
  await expect(page.getByRole('button', { name: 'Разметка 1' })).toBeVisible();
});

test('перезапуск восстанавливает узел, режим, сортировку и изменённые данные', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('button', { name: /\+ ремонт/ }).click();
  await page.getByRole('button', { name: /^Выборка/ }).click();
  await page.getByRole('combobox', { name: 'Сортировка' }).selectOption('title');
  const editor = await openEditorFor(page, 'Ремонт');
  await editor.getByRole('textbox', { name: 'Название' }).fill('Ремонт обновлённый');
  await editor.getByRole('button', { name: 'Сохранить элемент' }).click();
  await expect(page.getByText('Ремонт обновлённый')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Узел: ремонт', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Выборка/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('title');
  await expect(page.getByText('Ремонт обновлённый')).toBeVisible();
});

test('длинный набор тегов и редактор доступны без потери состояния', async ({ page }) => {
  await loadDemo(page);
  for (const tag of ['день_рождения', 'май', '5', 'игорь', 'артемьев']) await selectNodeTag(page, tag, 'all');
  await expect(page.getByRole('heading', { name: 'Игорь', exact: true })).toBeVisible();
  await expect(page.getByText('Анна')).toHaveCount(0);
  await screenshot(page, 'long-tags');
  const editor = await openEditorFor(page, 'Игорь');
  await expect(editor.getByRole('button', { name: 'Убрать тег день_рождения' })).toBeVisible();
  await expect(editor.getByText('Пустое содержание — смысл элемента задают его теги.')).toBeVisible();
  await screenshot(page, 'editor');
});
