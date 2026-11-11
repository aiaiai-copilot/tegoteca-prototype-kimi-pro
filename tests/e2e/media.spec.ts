import { test, expect } from '@playwright/test';
import path from 'node:path';
import { loadDemo, openEditorFor, selectNodeTag } from './helpers';

test('локальные PNG, WAV, WebM и TXT воспроизводятся, скачиваются и переживают reload', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Добавить демонстрационные медиа' }).click();
  await expect(page.getByRole('status')).toContainText('Демонстрационные медиа добавлены.');
  await page.getByRole('button', { name: 'Закрыть настройки' }).click();
  await selectNodeTag(page, 'медиа', 'all');
  await page.getByRole('button', { name: /^Выборка/ }).click();
  await expect(page.locator('article[data-element-id]')).toHaveCount(4);

  const image = page.locator('article[data-element-id="demo-image"]');
  await expect(image.locator('img')).toBeVisible();
  await expect.poll(() => image.locator('img').evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('article[data-element-id="demo-audio"] audio[controls]')).toBeVisible();
  await expect(page.locator('article[data-element-id="demo-video"] video[controls]')).toBeVisible();
  await expect(page.locator('article[data-element-id="demo-file"]')).toContainText('demo-note.txt');
  await expect(page.getByRole('link', { name: 'Скачать файл' })).toHaveCount(4);
  await expect(image.getByRole('link', { name: 'Скачать файл' })).toHaveAttribute('download', 'demo-image.png');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Узел: медиа', level: 1 })).toBeVisible();
  await expect(page.locator('article[data-element-id]')).toHaveCount(4);
  await expect(page.locator('article[data-element-id="demo-image"] img')).toBeVisible();
  await expect(page.locator('article[data-element-id="demo-audio"] audio[controls]')).toBeVisible();
  await expect(page.locator('article[data-element-id="demo-video"] video[controls]')).toBeVisible();
  await expect(page.locator('article[data-element-id="demo-file"]')).toContainText('demo-note.txt');
});

test('замена TXT создаёт новый id и сохраняет новый файл после reload', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Добавить демонстрационные медиа' }).click();
  await expect(page.getByRole('status')).toContainText('Демонстрационные медиа добавлены.');
  await page.getByRole('button', { name: 'Закрыть настройки' }).click();
  await selectNodeTag(page, 'документ', 'all');
  await page.getByRole('button', { name: /^Выборка/ }).click();
  const editor = await openEditorFor(page, 'Пример другого файла');
  await editor.getByLabel('Заменить файл').setInputFiles({
    name: 'replacement-note.txt',
    mimeType: 'text/plain;charset=utf-8',
    buffer: Buffer.from('Заменённое локальное содержимое', 'utf-8'),
  });
  await editor.getByRole('button', { name: 'Сохранить элемент' }).click();
  await editor.getByRole('button', { name: 'Подтвердить сохранение' }).click();
  await expect(page.locator('article[data-element-id="demo-file"]')).toHaveCount(0);
  const replacement = page.locator('article[data-element-id]').filter({ has: page.getByRole('heading', { name: 'Пример другого файла' }) });
  await expect(replacement).toContainText('replacement-note.txt');
  const newId = await replacement.getAttribute('data-element-id');
  expect(newId).toBeTruthy();
  expect(newId).not.toBe('demo-file');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Узел: документ', level: 1 })).toBeVisible();
  await expect(page.locator(`article[data-element-id="${newId}"]`)).toContainText('replacement-note.txt');
  await expect(page.getByRole('link', { name: 'Скачать файл' })).toHaveAttribute('download', 'replacement-note.txt');
});

test('замена PNG сохраняет preview и новый идентификатор', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Добавить демонстрационные медиа' }).click();
  await expect(page.getByRole('status')).toContainText('Демонстрационные медиа добавлены.');
  await page.getByRole('button', { name: 'Закрыть настройки' }).click();
  await selectNodeTag(page, 'изображение', 'all');
  await page.getByRole('button', { name: /^Выборка/ }).click();
  const editor = await openEditorFor(page, 'Пример изображения');
  await expect(editor.locator('img')).toBeVisible();
  await editor.getByLabel('Заменить файл').setInputFiles(path.resolve('public/media/demo-image.png'));
  await editor.getByRole('button', { name: 'Сохранить элемент' }).click();
  await editor.getByRole('button', { name: 'Подтвердить сохранение' }).click();
  await expect(page.locator('article[data-element-id="demo-image"]')).toHaveCount(0);
  const replacement = page.locator('article[data-element-id]').filter({ has: page.getByRole('heading', { name: 'Пример изображения' }) });
  await expect(replacement.locator('img')).toBeVisible();
  await expect.poll(() => replacement.locator('img').evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  expect(await replacement.getAttribute('data-element-id')).not.toBe('demo-image');
});
