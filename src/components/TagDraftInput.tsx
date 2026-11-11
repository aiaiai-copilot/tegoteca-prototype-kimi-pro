import { useEffect, useId, useState } from 'react';
import type { Tag } from '../types';
import { canonicalTagName } from '../model/tags';
import { useWorkspace } from '../state/WorkspaceContext';

interface TagDraftInputProps {
  tags: Tag[];
  value: string[];
  onChange(tagIds: string[]): void;
  disabled?: boolean;
  unmarked?: boolean;
  onBusyChange?(busy: boolean): void;
}

export function TagDraftInput({ tags, value, onChange, disabled = false, unmarked = false, onBusyChange }: TagDraftInputProps) {
  const { addTag } = useWorkspace();
  const idPrefix = useId();
  const [query, setQuery] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);
  const canonicalQuery = canonicalTagName(query);
  const selected = value.map((id) => tags.find((tag) => tag.id === id)).filter((tag): tag is Tag => Boolean(tag));
  const suggestions = canonicalQuery
    ? tags.filter((tag) => !value.includes(tag.id) && canonicalTagName(tag.name).includes(canonicalQuery))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    : [];

  async function add() {
    if (!canonicalQuery || disabled || busy) return;
    setBusy(true);
    setError('');
    try {
      const existing = tags.find((tag) => canonicalTagName(tag.name) === canonicalQuery);
      const tag = existing ?? await addTag(query, description);
      if (!value.includes(tag.id)) onChange([...value, tag.id]);
      setQuery('');
      setDescription('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tag-draft">
      <div className="selected-tags" aria-label="Разметка элемента">
        {selected.length === 0 ? <span className="muted">{unmarked ? 'Разметка не задана' : 'Пустой набор (корень)'}</span> : selected.map((tag) => (
          <button key={tag.id} type="button" className="tag tag--selected" aria-label={`Убрать тег ${tag.name}`} disabled={disabled || busy} onClick={() => onChange(value.filter((id) => id !== tag.id))}>
            {tag.name} <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
      <div className="tag-draft__controls">
        <div className="field">
          <label htmlFor={`${idPrefix}-element-tag-input`}>Добавить тег к разметке</label>
          <input id={`${idPrefix}-element-tag-input`} autoComplete="off" value={query} disabled={disabled || busy} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void add();
            }
          }} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-new-tag-description`}>Описание нового тега (необязательно)</label>
          <input id={`${idPrefix}-new-tag-description`} value={description} disabled={disabled || busy} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <button type="button" className="button button--secondary" disabled={disabled || busy || !canonicalQuery} onClick={() => void add()}>Добавить тег</button>
      </div>
      {canonicalQuery && suggestions.length > 0 && (
        <ul className="suggestions suggestions--static" role="listbox" aria-label="Существующие теги">
          {suggestions.map((tag) => <li key={tag.id}><button type="button" role="option" aria-selected="false" disabled={disabled || busy} onClick={() => {
            onChange([...value, tag.id]);
            setQuery('');
          }}><span>{tag.name}</span>{tag.description && <small>{tag.description}</small>}</button></li>)}
        </ul>
      )}
      {error && <p role="alert" className="form-error">{error}</p>}
    </div>
  );
}
