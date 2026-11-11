import { useEffect, useMemo, useState } from 'react';
import type { Element, SortMode, Tag, ViewMode } from '../types';
import { sortElements } from '../model/elements';
import { nodeKey, sameNode } from '../model/tags';
import { FilePreview } from './FilePreview';

interface ElementListProps {
  elements: Element[];
  selectionCount: number;
  ownCount: number;
  current: string[];
  tags: Tag[];
  viewMode: ViewMode;
  sortMode: SortMode;
  setViewMode(mode: ViewMode): void;
  setSortMode(mode: SortMode): void;
  onCreate?(): void;
  onEdit?(element: Element): void;
}

const dateFormatter = new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' });

export function ElementList({
  elements,
  selectionCount,
  ownCount,
  current,
  tags,
  viewMode,
  sortMode,
  setViewMode,
  setSortMode,
  onCreate,
  onEdit,
}: ElementListProps) {
  const [visibleCount, setVisibleCount] = useState(100);
  const currentKey = nodeKey(current);
  useEffect(() => setVisibleCount(100), [currentKey, viewMode, sortMode, elements.length]);
  const sorted = useMemo(() => sortElements(elements, sortMode), [elements, sortMode]);
  const names = new Map(tags.map((tag) => [tag.id, tag.name]));

  return (
    <section className="elements-panel" aria-labelledby="elements-title">
      <div className="section-heading elements-heading">
        <div>
          <p className="eyebrow">Содержимое текущего узла</p>
          <h2 id="elements-title">Элементы</h2>
        </div>
        <div className="element-toolbar">
          <div className="segmented" aria-label="Режим просмотра">
            <button type="button" aria-pressed={viewMode === 'own'} onClick={() => setViewMode('own')}>
              Собственные <span className="count-badge">{ownCount}</span>
            </button>
            <button type="button" aria-pressed={viewMode === 'selection'} onClick={() => setViewMode('selection')}>
              Выборка <span className="count-badge">{selectionCount}</span>
            </button>
          </div>
          <div className="field field--inline">
            <label htmlFor="element-sort">Сортировка</label>
            <select id="element-sort" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="modified">Сначала изменённые</option>
              <option value="title">По названию</option>
            </select>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          {current.length === 0 && selectionCount === 0 ? (
            <>
              <h3>Рабочая область пуста.</h3>
              <p>Добавьте первую запись или загрузите демонстрационный набор в настройках.</p>
              <button type="button" className="button button--primary" onClick={onCreate} disabled={!onCreate}>Добавить первый элемент</button>
            </>
          ) : viewMode === 'own' && selectionCount > 0 ? (
            <>
              <h3>В этом узле нет собственных элементов.</h3>
              <p>Элементы есть в заполненных потомках — перейдите к ним или откройте всю выборку.</p>
              <button type="button" className="button button--secondary" onClick={() => setViewMode('selection')}>Показать выборку ({selectionCount})</button>
            </>
          ) : (
            <>
              <h3>С этими тегами пока нет элементов.</h3>
              <p>Можно изменить выбранные теги или добавить новый элемент в этот узел.</p>
              <button type="button" className="button button--primary" onClick={onCreate} disabled={!onCreate}>Добавить элемент</button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="element-list">
            {sorted.slice(0, visibleCount).map((element) => {
              const isOwn = viewMode === 'selection' && sameNode(element.tagIds, current);
              return (
                <article
                  className={`element-card${isOwn ? ' element-card--own' : ''}`}
                  data-element-id={element.id}
                  key={element.id}
                >
                  <div className="element-card__header">
                    <div>
                      {isOwn && <span className="own-badge">Собственный элемент</span>}
                      <h3>{element.title || 'Без названия'}</h3>
                    </div>
                    <button type="button" className="button button--quiet" onClick={() => onEdit?.(element)} disabled={!onEdit}>
                      Изменить
                    </button>
                  </div>
                  <div className="element-tags" aria-label="Теги элемента">
                    {element.tagIds === null ? <span className="tag tag--unmarked">Не размечен</span>
                      : element.tagIds.length === 0 ? <span className="tag">Пустая разметка · корень</span>
                        : [...element.tagIds]
                          .sort((a, b) => (names.get(a) ?? a).localeCompare(names.get(b) ?? b, 'ru'))
                          .map((id) => <span className="tag" key={id}>{names.get(id) ?? id}</span>)}
                  </div>
                  <div className="element-content">
                    {element.content.kind === 'text' && <p>{element.content.text}</p>}
                    {element.content.kind === 'empty' && <p className="muted">Пустое содержание — смысл задан тегами.</p>}
                    {element.content.kind === 'file' && <FilePreview content={element.content} title={element.title} />}
                  </div>
                  <footer className="element-card__footer">
                    <span>Изменён: {dateFormatter.format(element.modifiedAt)}</span>
                    <span className="element-id">{element.id}</span>
                  </footer>
                </article>
              );
            })}
          </div>
          {visibleCount < sorted.length && (
            <button type="button" className="button button--secondary button--full load-more" onClick={() => setVisibleCount((count) => count + 100)}>
              Показать ещё элементы · осталось {sorted.length - visibleCount}
            </button>
          )}
        </>
      )}
    </section>
  );
}
