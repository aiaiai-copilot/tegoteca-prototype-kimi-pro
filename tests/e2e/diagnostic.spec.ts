import { test, expect } from '@playwright/test';
import { performance } from 'node:perf_hooks';
import { selectNodeTag } from './helpers';

test('10 000 элементов: генерация, отклик UI, навигация и восстановление', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const measurements: Record<string, number> = {};

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Корень', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('button', { name: 'Создать диагностический набор' }).click();
  const generationStartedAt = performance.now();
  await page.getByRole('button', { name: 'Подтвердить генерацию' }).click();
  await expect(page.getByRole('status')).toContainText('Диагностический набор создан.', { timeout: 60_000 });
  measurements.generateAndPersistMs = performance.now() - generationStartedAt;
  await page.getByRole('button', { name: 'Закрыть настройки' }).click();

  await expect(page.locator('.node-summary')).toContainText('10000');
  await page.getByRole('button', { name: /^Выборка/ }).click();
  await expect(page.locator('article[data-element-id]')).toHaveCount(100);
  await expect(page.locator('.transition-button--descendant')).toHaveCount(6);
  const expandStartedAt = performance.now();
  await page.getByRole('button', { name: 'Показать ещё 6 из 94' }).click();
  await expect(page.locator('.transition-button--descendant')).toHaveCount(12);
  measurements.expandTransitionsMs = performance.now() - expandStartedAt;

  const autocompleteStartedAt = performance.now();
  await page.getByRole('textbox', { name: 'Добавить тег к узлу' }).fill('тег_0');
  await expect(page.getByRole('listbox', { name: 'Подходящие теги' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'тег_001', exact: true })).toBeVisible();
  measurements.autocompleteRootMs = performance.now() - autocompleteStartedAt;

  const filledNavigationStartedAt = performance.now();
  await page.getByRole('option', { name: 'тег_001', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Узел: тег_001', level: 1 })).toBeVisible();
  await expect(page.locator('.node-summary')).toContainText('360');
  measurements.navigateToFilledMs = performance.now() - filledNavigationStartedAt;

  await page.getByRole('button', { name: 'В корень', exact: true }).click();
  await selectNodeTag(page, 'тег_001', 'all');
  await selectNodeTag(page, 'тег_002', 'all');
  const unfilledNavigationStartedAt = performance.now();
  await selectNodeTag(page, 'тег_003', 'all');
  await expect(page.getByRole('heading', { name: 'Узел: тег_001 · тег_002 · тег_003', level: 1 })).toBeVisible();
  await expect(page.getByText('С этими тегами пока нет элементов.')).toBeVisible();
  measurements.navigateToUnfilledMs = performance.now() - unfilledNavigationStartedAt;

  for (const name of ['+ Новый элемент', 'Глоссарий', 'Настройки']) {
    const action = page.getByRole('button', { name, exact: true });
    await expect(action).toBeVisible();
    await expect(action).toBeEnabled();
    await expect(action).toBeInViewport();
  }

  const reloadStartedAt = performance.now();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Узел: тег_001 · тег_002 · тег_003', level: 1 })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.node-summary')).toContainText('0');
  await expect(page.getByText('С этими тегами пока нет элементов.')).toBeVisible();
  measurements.reloadDiagnosticWorkspaceMs = performance.now() - reloadStartedAt;

  const report = {
    browser: `Google Chrome ${browser.version()}`,
    target: 'http://127.0.0.1:5173; fresh Playwright context; IndexedDB/localStorage only',
    note: 'Elapsed time includes Playwright IPC, rendering and visibility assertions; no acceptance threshold is applied.',
    measurements,
  };
  console.log(`DIAGNOSTIC_UI ${JSON.stringify(report)}`);
  await test.info().attach('diagnostic-ui.json', {
    contentType: 'application/json',
    body: JSON.stringify(report, null, 2),
  });
});
