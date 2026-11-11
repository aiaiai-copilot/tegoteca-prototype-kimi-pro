# Tеготека Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать локальный браузерный прототип Теготеки, проходящий сценарии `prototype/CHECKS.md` и сохраняющий записи, теги и файлы между запусками.

**Architecture:** React-клиент без backend обращается к чистой теговой модели и Dexie/IndexedDB. Состояние рабочей области и навигационная история разделены; выборки и соседство вычисляются по заполненным узлам без материализации полного DAG. Модальные редакторы используют локальные черновики, а все операции данных проходят через один контекст репозитория.

**Tech Stack:** React 19, TypeScript, Vite, Dexie, Vitest, Testing Library, Playwright, CSS.

**Spec:** `prototype/TASK.md`, `prototype/CHECKS.md`, `PRODUCT_CONCEPT.md` (коммит `8dfed9e`), `prototype/DECISIONS.md`.

## Global Constraints

- Интерфейс и демонстрационные записи — на русском языке.
- Разметка `null` отлична от заданного пустого набора `[]`; неразмеченные элементы не входят ни в одну выборку.
- Содержание элемента одного вида либо пустое; сами файлы сохраняются в IndexedDB.
- Соседние заполненные узлы не имеют заполненных промежуточных узлов; приоритет — число добавляемых/удаляемых тегов.
- Изменение названия/разметки сохраняет элемент, изменение содержания заменяет его другим элементом.
- Данные и тесты только локальные; браузерные проверки используют `127.0.0.1`, без production API.
- Не изменять исходную продуктовую модель; противоречия выносить отдельно.

## Review Focus

- Пустая разметка и неразмеченность легко перепутать: Task 2 проверяет E0 и E9 отдельно, Task 7 — назначение E9 пустого набора в браузере.
- Соседство при нескольких путях DAG легко заменить ближайшим расстоянием: Task 3 проверяет исключение E5 и восстановление связей после добавления/удаления промежуточного узла.
- Blob нельзя заменить именем или временным URL: Task 4 проверяет бинарное сохранение, Task 7 — отображение после перезагрузки.
- Изменения данных не должны разрушать историю «вперёд»: Task 5 содержит unit-тест истории, Task 7 — браузерный сценарий.
- Длинные теги и большое число переходов могут скрыть основные действия: Task 7 проверяет длинный набор, а Task 8 — диагностические 10 000 элементов и отклик UI.

---

### Task 1: Каркас и типы рабочей области

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/types.ts`, `src/test/setup.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `Tag { id, name, description }`; `Element { id, title, content, tagIds: string[] | null, createdAt, modifiedAt }`; `Content = EmptyContent | TextContent | FileContent`; `Workspace { tags: Tag[], elements: Element[] }`; `ViewMode = 'own' | 'selection'`, `SortMode = 'modified' | 'title'`.

- [ ] **Step 1:** Создать smoke-тест, который проверяет различие типов `tagIds: null` и `tagIds: []`, и запустить `npm test` до реализации.
- [ ] **Step 2:** Настроить Vite/Vitest и типы; добавить команды `dev`, `build`, `test`, `test:e2e`, `diagnostic`.
- [ ] **Step 3:** Запустить `npm test` и `npm run build`; ожидаются PASS и успешная сборка.
- [ ] **Step 4:** Закоммитить каркас с attribution.

### Task 2: Выборки, собственные элементы и порядок

**Files:**
- Create: `src/model/tags.ts`, `src/model/elements.ts`, `src/model/workspace.ts`, `tests/model/elements.test.ts`, `tests/model/workspace.test.ts`, `tests/fixtures.ts`

**Interfaces:**
- Produces: `canonicalTagName(name)`, `nodeKey(tagIds)`, `sameNode(a,b)`, `isSubset(a,b)`; `selectElements(workspace, selected)`, `ownElements(workspace, selected)`, `sortElements(elements)`; `renameTag(workspace,id,newName)`, `deleteTag(workspace,id)`, `updateTitleAndTags(element,patch,now)`, `replaceContent(element,content,now)`.

- [ ] **Step 1:** Записать failing tests для E0–E9: корень own=E0, selection=E0–E8; `{ремонт}` own=E1, selection=E1/E3/E4/E5; `{мечта}` пуст; E7/E8 независимы; E9 исключён до разметки и включён после `[]`.
- [ ] **Step 2:** Добавить failing tests сортировки: modified desc; E6 без названия в конце; E5 перед E3 при одинаковом «План»; изменение title/tags обновляет время и сохраняет id, content меняет id.
- [ ] **Step 3:** Добавить failing tests канонических имён, rename с сохранением назначений, конфликта `кухня`→`сад`, delete `ремонт` с четырьмя затронутыми и превращением E1 в собственный элемент корня.
- [ ] **Step 4:** Реализовать чистые функции, используя сравнение наборов и сортировку из `DECISIONS.md`.
- [ ] **Step 5:** Запустить `npm test -- tests/model`; ожидается PASS.
- [ ] **Step 6:** Закоммитить модель элементов.

### Task 3: Соседство, переходы и автодополнение

**Files:**
- Create: `src/model/navigation.ts`, `tests/model/navigation.test.ts`

**Interfaces:**
- Produces: `Transition { direction: 'ancestor'|'descendant', tagIds, changedTagIds, distance, ownCount, selectionCount }`; `getTransitions(workspace,current): Transition[]`; `getAutocomplete(workspace,current,query,scope:'selection'|'all'): Tag[]`.

- [ ] **Step 1:** Написать failing test для `{ремонт,кухня}`: предки `{ремонт}`/`{кухня}`, но не корень; потомки E3/E4, но не E5; `+электрика` приоритетнее `+бюджет,срочно`; counts соответствуют выборкам.
- [ ] **Step 2:** Добавить failing tests пересчёта после создания own `{ремонт,кухня}` и восстановления после удаления; проверить переход в незаполненный `{мечта}` и отсутствие фантомных заполненных узлов.
- [ ] **Step 3:** Добавить failing test автодополнения: из текущей выборки предлагаются `электрика`, `бюджет`, `срочно`, но не `сад`, `мечта` и выбранные; scope `all` разрешает остальные доступные теги.
- [ ] **Step 4:** Реализовать минимальные надмножества и максимальные подмножества заполненных узлов, стабильную сортировку и фильтрацию автодополнения.
- [ ] **Step 5:** Запустить model tests; ожидается PASS.
- [ ] **Step 6:** Закоммитить навигационную модель.

### Task 4: IndexedDB, демонстрационный набор и операции

**Files:**
- Create: `src/data/db.ts`, `src/data/demo.ts`, `src/state/WorkspaceContext.tsx`, `src/model/diagnostic.ts`, `tests/data/workspace.test.ts`, `tests/model/diagnostic.test.ts`
- Create: `public/media/*`, `scripts/generate-media.mjs`

**Interfaces:**
- Produces: `WorkspaceProvider`, `useWorkspace()` с `createElement`, `saveMetadata`, `saveContent`, `deleteElement`, `addTag`, `renameTag`, `deleteTag`, `updateTagDescription`, `loadDemo`, `addDemoMedia`, `resetWorkspace`, `generateDiagnostic`.

- [ ] **Step 1:** Написать failing persistence tests на `fake-indexeddb`: загрузка пустой области, round-trip E0–E9, Blob сохраняется с исходными bytes/MIME, атомарная разметка, rename/delete и replacement identity.
- [ ] **Step 2:** Реализовать Dexie schema и репозиторий; состояние обновлять только после успешной транзакции, ошибки возвращать вызывающему UI.
- [ ] **Step 3:** Создать E0–E9 с возрастающим modifiedAt, описание `бюджет`, неиспользуемую `мечта`; реализовать отдельную загрузку четырёх медиа.
- [ ] **Step 4:** Добавить воспроизводимый генератор PNG/WAV/WebM/TXT и сгенерированные локальные файлы.
- [ ] **Step 5:** Реализовать deterministic PRNG и равномерный выбор размера разметки 1–6 без повторов; unit-test проверяет counts, диапазон и воспроизводимость.
- [ ] **Step 6:** Запустить `npm test`; ожидается PASS.
- [ ] **Step 7:** Закоммитить хранилище и данные.

### Task 5: Навигационный экран и история

**Files:**
- Create: `src/state/useNavigation.ts`, `src/components/AppShell.tsx`, `src/components/TagSelector.tsx`, `src/components/TransitionGroups.tsx`, `src/components/ElementList.tsx`, `src/components/FilePreview.tsx`, `src/App.tsx`, `src/styles.css`
- Test: `tests/state/useNavigation.test.ts`, `tests/components/Navigation.test.tsx`

**Interfaces:**
- Consumes: model/data APIs Tasks 2–4.
- Produces: экран текущего узла, `navigate(tagIds)`, `back()`, `forward()`, `goRoot()`, сохранение last node/mode/sort.

- [ ] **Step 1:** Написать failing history tests: push, back/forward без новых записей, новый переход обрезает continuation, изменение данных не меняет историю, удаление выбранного тега сокращает текущий и восстанавливаемый наборы.
- [ ] **Step 2:** Реализовать history hook и persistence последнего узла; первый запуск пустой области открывает корень.
- [ ] **Step 3:** Собрать доступный экран: выбранные теги, autocomplete с переключателем области предложений, root/back/forward, переходы с полными `+`/`−`, own/selection, сортировка, карточки и preview.
- [ ] **Step 4:** Написать component tests для пустых состояний, выделения own, сохранения mode/sort при переходе и длинных наборов; сначала убедиться в FAIL.
- [ ] **Step 5:** Реализовать визуальные состояния и CSS; запустить `npm test` и `npm run build`.
- [ ] **Step 6:** Закоммитить рабочий навигационный экран.

### Task 6: Создание, редактирование, разметка и глоссарий

**Files:**
- Create: `src/components/ElementEditor.tsx`, `src/components/TagDraftInput.tsx`, `src/components/MarkingMode.tsx`, `src/components/GlossaryPanel.tsx`, `src/components/SettingsPanel.tsx`, `src/components/Modal.tsx`
- Test: `tests/components/Editing.test.tsx`, `tests/components/MarkingMode.test.tsx`

**Interfaces:**
- Consumes: `useWorkspace`, navigation APIs.
- Produces: полный пользовательский CRUD, необязательные описания новых тегов, reminder setting, own-count setting, post-save переход, прогресс разметки.

- [ ] **Step 1:** Написать failing editor tests: предложение current tags, quick unmarked save, новый тег без описания, исходная разметка, видимое содержание, reminder и его отключение, сохранение без смены текущего узла.
- [ ] **Step 2:** Реализовать editor с text/empty/file, заменой файла и подтверждением удаления; content save использует replacement identity.
- [ ] **Step 3:** Написать failing marking tests: черновик не влияет на selection, сохранение `[]`, отдельный прогресс и возврат к оставшимся.
- [ ] **Step 4:** Реализовать MarkingMode и glossary rename/description/delete confirmation с количеством и списком затронутых.
- [ ] **Step 5:** Добавить настройки, загрузку demo/empty/media/diagnostic с подтверждениями; запустить все unit/component tests.
- [ ] **Step 6:** Закоммитить редакторы и управление рабочей областью.

### Task 7: Браузерные сценарии и визуальная отладка

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/prototype.spec.ts`, `tests/e2e/media.spec.ts`, `tests/e2e/helpers.ts`, `artifacts/screenshots/*`

**Interfaces:**
- Consumes: готовое приложение на `http://127.0.0.1:5173`.

- [ ] **Step 1:** Проверить `playwright.config.ts`: только localhost, отдельный browser context и чистая IndexedDB для каждого изменяющего сценария; записать это перед запуском.
- [ ] **Step 2:** Написать e2e для выборок/переходов/history/mode/sort, CRUD/разметки/glossary, empty workspace и persistence; каждый сценарий начинает с отдельной загрузки demo.
- [ ] **Step 3:** Написать media e2e: добавить/заменить PNG, WAV, WebM, TXT, проверить preview/controls/download и восстановление после reload; проверить last node.
- [ ] **Step 4:** Запустить Chromium Playwright, исправить ошибки по принципу repro→model/UI fix→targeted rerun→full suite.
- [ ] **Step 5:** Снять screenshots корня, незаполненного узла, выборки, редактора, глоссария и длинного набора; просмотреть их и исправить переполнение/неразличимость состояний.
- [ ] **Step 6:** Закоммитить e2e и исправления.

### Task 8: Диагностика 10 000 элементов

**Files:**
- Create: `scripts/diagnostic.ts`, `tests/e2e/diagnostic.spec.ts`, `prototype/PERFORMANCE.md`

**Interfaces:**
- Consumes: `generateDiagnosticWorkspace(count=10000,tagCount=100,seed=...)` из Task 4.
- Produces: измерения selection/transitions/autocomplete на корне, заполненных и незаполненных узлах.

- [ ] **Step 1:** Запустить generator unit-test и зафиксировать seed, counts, диапазон 1–6 и распределение для измерений.
- [ ] **Step 2:** Добавить Node-скрипт, который выводит среду, seed, распределение и timings каждой операции на нескольких узлах.
- [ ] **Step 3:** Через локальный UI загрузить diagnostic set, измерить отклик автодополнения и переходов, проверить интерактивность кнопок и отсутствие скрытых действий.
- [ ] **Step 4:** Записать фактические результаты и ограничения в `prototype/PERFORMANCE.md`, без выдуманного порогового критерия.

### Task 9: Запуск, отчёт и финальная проверка

**Files:**
- Modify: `README.md`, `HANDOFF.md`
- Create: `prototype/REPORT.md`

- [ ] **Step 1:** Дописать установку, запуск/остановку, Chromium, IndexedDB/localStorage, demo/media/empty/diagnostic, команды tests и ограничения браузерных форматов.
- [ ] **Step 2:** Зафиксировать выполненные проверки с фактическими командами, найденные и исправленные ошибки, невыполненные пункты и наблюдения по концепции.
- [ ] **Step 3:** С чистого состояния выполнить `npm ci`, unit tests, production build, e2e и diagnostic; убедиться, что git status содержит только предусмотренные файлы.
- [ ] **Step 4:** Закоммитить документацию и финальные исправления с attribution, проверить `git status --short`.
