import { useEffect, useState } from 'react';
import type { Transition } from '../model/navigation';
import { nodeKey } from '../model/tags';
import type { Tag } from '../types';

interface TransitionGroupsProps {
  transitions: Transition[];
  tags: Tag[];
  current: string[];
  showOwnCounts: boolean;
  navigate(tagIds: readonly string[]): void;
}

export function TransitionGroups({ transitions, tags, current, showOwnCounts, navigate }: TransitionGroupsProps) {
  const [descendantLimit, setDescendantLimit] = useState(6);
  const [showAllAncestors, setShowAllAncestors] = useState(false);
  const currentKey = nodeKey(current);
  useEffect(() => {
    setDescendantLimit(6);
    setShowAllAncestors(false);
  }, [currentKey]);

  const names = new Map(tags.map((tag) => [tag.id, tag.name]));
  const descendants = transitions.filter((item) => item.direction === 'descendant');
  const ancestors = transitions.filter((item) => item.direction === 'ancestor');

  function renderGroup(
    direction: 'ancestor' | 'descendant',
    items: Transition[],
    visible: Transition[],
  ) {
    const isDescendant = direction === 'descendant';
    return (
      <section className="transition-group" aria-labelledby={`transitions-${direction}`}>
        <div className="transition-group__heading">
          <h3 id={`transitions-${direction}`}>{isDescendant ? 'Сузить выборку' : 'Расширить выборку'}</h3>
          <span className="count-badge">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="muted">{isDescendant ? 'Нет заполненных потомков' : 'Нет заполненных предков'}</p>
        ) : (
          <>
            <div className="transition-list">
              {visible.map((transition) => (
                <button
                  type="button"
                  className={`transition-button transition-button--${direction}`}
                  key={nodeKey(transition.tagIds)}
                  aria-label={`${isDescendant ? '+' : '−'} ${transition.changedTagIds.map((id) => names.get(id) ?? id).join(' · ')} · Выборка: ${transition.selectionCount}${showOwnCounts ? ` · Собственных: ${transition.ownCount}` : ''}`}
                  onClick={() => navigate(transition.tagIds)}
                >
                  <span className="transition-button__main">
                    <span className="transition-sign">{isDescendant ? '+' : '−'}</span>
                    <span className="transition-tags">
                      {transition.changedTagIds.map((id) => <span className="tag" key={id}>{names.get(id) ?? id}</span>)}
                    </span>
                  </span>
                  <span className="transition-counts">
                    <span>Выборка: {transition.selectionCount}</span>
                    {showOwnCounts && <span>Собственных: {transition.ownCount}</span>}
                  </span>
                </button>
              ))}
            </div>
            {isDescendant && visible.length < items.length && (
              <button type="button" className="button button--quiet button--full" onClick={() => setDescendantLimit((limit) => limit + 6)}>
                Показать ещё {Math.min(6, items.length - visible.length)} из {items.length - visible.length}
              </button>
            )}
            {!isDescendant && !showAllAncestors && items.length > 4 && (
              <button type="button" className="button button--quiet button--full" onClick={() => setShowAllAncestors(true)}>
                Показать все {items.length}
              </button>
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <section className="transitions-panel" aria-labelledby="transitions-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Соседние заполненные узлы</p>
          <h2 id="transitions-title">Предлагаемые переходы</h2>
        </div>
        <p className="muted">Приоритет — меньше изменений тегов</p>
      </div>
      <div className="transition-groups">
        {renderGroup('descendant', descendants, descendants.slice(0, descendantLimit))}
        {renderGroup('ancestor', ancestors, showAllAncestors ? ancestors : ancestors.slice(0, 4))}
      </div>
    </section>
  );
}
