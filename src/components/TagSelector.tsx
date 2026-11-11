import { useMemo, useState } from 'react';
import type { Tag } from '../types';
import { getAutocomplete } from '../model/navigation';
import type { Workspace } from '../types';

interface TagSelectorProps {
  workspace: Workspace;
  current: string[];
  navigate(tagIds: readonly string[]): void;
}

export function TagSelector({ workspace, current, navigate }: TagSelectorProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'selection' | 'all'>('selection');
  const tagsById = useMemo(() => new Map(workspace.tags.map((tag) => [tag.id, tag])), [workspace.tags]);
  const selectedTags = current
    .map((id) => tagsById.get(id))
    .filter((tag): tag is Tag => Boolean(tag))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const suggestions = query.trim()
    ? getAutocomplete(workspace, current, query, scope)
    : [];

  return (
    <div className="tag-selector">
      <div className="selected-tags" aria-label="Выбранные теги">
        {selectedTags.length === 0 ? (
          <span className="muted">Теги не выбраны — вы находитесь в корне</span>
        ) : selectedTags.map((tag) => (
          <button
            className="tag tag--selected"
            key={tag.id}
            type="button"
            title={tag.description || `Убрать тег ${tag.name}`}
            aria-label={`Убрать тег ${tag.name}`}
            onClick={() => navigate(current.filter((id) => id !== tag.id))}
          >
            <span>{tag.name}</span><span aria-hidden="true">×</span>
            <span className="sr-only">Убрать тег {tag.name}</span>
          </button>
        ))}
      </div>
      <div className="tag-search">
        <div className="field tag-search__input">
          <label htmlFor="node-tag-input">Добавить тег к узлу</label>
          <input
            id="node-tag-input"
            type="text"
            autoComplete="off"
            placeholder="Начните вводить тег…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="tag-suggestion-scope">Источник предложений</label>
          <select id="tag-suggestion-scope" value={scope} onChange={(event) => setScope(event.target.value as 'selection' | 'all')}>
            <option value="selection">Из текущей выборки</option>
            <option value="all">Все теги глоссария</option>
          </select>
        </div>
      </div>
      {query.trim() && (
        suggestions.length > 0 ? (
          <ul className="suggestions" role="listbox" aria-label="Подходящие теги">
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => {
                    navigate([...current, tag.id]);
                    setQuery('');
                  }}
                >
                  <span>{tag.name}</span>
                  {tag.description && <small>{tag.description}</small>}
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="autocomplete-empty">В выбранном источнике подходящих тегов нет.</p>
      )}
    </div>
  );
}
