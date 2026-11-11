import { expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function openEmptyWorkspace(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Корень', level: 1 })).toBeVisible();
  await expect(page.getByText('Рабочая область пуста.')).toBeVisible();
}

export async function loadDemo(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Корень', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Загрузить демонстрационные данные' }).click();
  await page.getByRole('button', { name: 'Подтвердить загрузку' }).click();
  await page.getByRole('button', { name: 'Закрыть настройки' }).click();
  await expect(page.getByText('Общая запись')).toBeVisible();
}

export async function selectNodeTag(page: Page, name: string, source: 'selection' | 'all' = 'selection') {
  await page.getByRole('combobox', { name: 'Источник предложений' }).selectOption(source);
  const input = page.getByRole('textbox', { name: 'Добавить тег к узлу' });
  await input.fill(name);
  await page.getByRole('option', { name: new RegExp(`^${name}`) }).click();
}

export async function openEditorFor(page: Page, title: string) {
  const card = page.locator('article[data-element-id]').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await card.getByRole('button', { name: 'Изменить' }).click();
  return page.getByRole('dialog', { name: 'Изменение элемента' });
}

export async function screenshot(page: Page, name: string) {
  const directory = path.resolve('artifacts/screenshots');
  await mkdir(directory, { recursive: true });
  await page.addStyleTag({ content: '.element-card { content-visibility: visible !important; }' });
  await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true });
}
