import { useState } from 'react';
import type { Tag } from '../types';
import { elementsUsingTag } from '../model/workspace';
import { useWorkspace } from '../state/WorkspaceContext';
import { Modal } from './Modal';

export function GlossaryPanel({ onClose }: { onClose(): void }) {
  const { workspace } = useWorkspace();
  const tags = [...workspace.tags].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return (
    <Modal title="Глоссарий" onClose={onClose} wide>
      <p className="muted">Переименование и описание применяются ко всей рабочей области. Удаление тега не удаляет элементы.</p>
      <div className="glossary-list">
        {tags.length === 0 ? <div className="empty-state"><h3>Глоссарий пуст.</h3><p>Первый тег можно создать при разметке элемента.</p></div>
          : tags.map((tag) => <GlossaryRow key={tag.id} tag={tag} />)}
      </div>
    </Modal>
  );
}

function GlossaryRow({ tag }: { tag: Tag }) {
  const { workspace, renameTag, updateTagDescription, deleteTag } = useWorkspace();
  const [name, setName] = useState(tag.name);
  const [description, setDescription] = useState(tag.description);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const affected = elementsUsingTag(workspace, tag.id);

  async function save() {
    setBusy(true);
    setError('');
    try {
      if (name !== tag.name) await renameTag(tag.id, name);
      if (description !== tag.description) await updateTagDescription(tag.id, description);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="glossary-row" data-tag-id={tag.id}>
      <div className="glossary-fields">
        <div className="field"><label htmlFor={`tag-name-${tag.id}`}>Название тега</label><input id={`tag-name-${tag.id}`} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="field"><label htmlFor={`tag-description-${tag.id}`}>Описание тега</label><input id={`tag-description-${tag.id}`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Необязательно" /></div>
      </div>
      <div className="glossary-actions">
        <span className="muted">Используется: {affected.length}</span>
        <button type="button" className="button button--secondary" disabled={busy} onClick={() => void save()}>Сохранить изменения</button>
        <button type="button" className="button button--danger-quiet" disabled={busy} onClick={() => { setConfirming(true); setError(''); }}>Удалить тег</button>
      </div>
      {error && <p role="alert" className="form-error">{error}</p>}
      {confirming && (
        <div className="confirmation-box confirmation-box--danger">
          <strong>Удалить тег «{tag.name}»?</strong>
          <p>Затронуто элементов: {affected.length}. Тег будет убран из их разметки, сами элементы сохранятся.</p>
          {affected.length > 0 && <ul className="affected-list">{affected.map((element) => <li key={element.id}><strong>{element.title || 'Без названия'}</strong>{element.content.kind === 'text' && <span>{element.content.text}</span>}</li>)}</ul>}
          <div className="dialog-actions"><button type="button" className="button button--danger" disabled={busy} onClick={() => {
            setBusy(true);
            void deleteTag(tag.id).then(() => setConfirming(false)).catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : String(cause));
              setBusy(false);
            });
          }}>Подтвердить удаление</button><button type="button" className="button button--quiet" disabled={busy} onClick={() => setConfirming(false)}>Отмена</button></div>
        </div>
      )}
    </article>
  );
}
