import { useState } from 'react';
import type { Element } from '../types';
import { useWorkspace } from '../state/WorkspaceContext';
import { Modal } from './Modal';
import { TagDraftInput } from './TagDraftInput';
import { FilePreview } from './FilePreview';

export function MarkingMode({ onClose, onEdit }: { onClose(): void; onEdit(element: Element, onMarked: () => void): void }) {
  const { workspace } = useWorkspace();
  const unmarked = workspace.elements.filter((element) => element.tagIds === null).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const [initialCount] = useState(unmarked.length);
  const [completed, setCompleted] = useState(0);

  return (
    <Modal title="Режим разметки" onClose={onClose} wide>
      <div className="marking-progress">
        <div><strong>Осталось: {unmarked.length}</strong><span>Размечено в этом сеансе: {completed}</span></div>
        <progress max={Math.max(initialCount, 1)} value={completed} aria-label="Прогресс разметки" />
      </div>
      {unmarked.length === 0 ? (
        <div className="empty-state"><h3>Все элементы размечены.</h3><p>Новые неразмеченные записи появятся здесь после быстрого сохранения.</p></div>
      ) : <MarkingForm key={unmarked[0].id} element={unmarked[0]} onEdit={(element) => onEdit(element, () => setCompleted((count) => count + 1))} onMarked={() => setCompleted((count) => count + 1)} />}
      <div className="dialog-actions marking-actions"><button type="button" className="button button--quiet" onClick={onClose}>Вернуться к элементам</button></div>
    </Modal>
  );
}

function MarkingForm({ element, onEdit, onMarked }: { element: Element; onEdit(element: Element): void; onMarked(): void }) {
  const { workspace, saveMetadata, deleteElement } = useWorkspace();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function save(tags: string[]) {
    if (busy || tagBusy) return;
    setBusy(true);
    setError('');
    try {
      await saveMetadata(element.id, { tagIds: tags });
      onMarked();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await deleteElement(element.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  return (
    <article className="marking-card">
      <p className="eyebrow">Неразмеченный элемент</p>
      <h3>{element.title || 'Без названия'}</h3>
      <div className="marking-content">
        {element.content.kind === 'text' && <p>{element.content.text}</p>}
        {element.content.kind === 'empty' && <p className="muted">Пустое содержание</p>}
        {element.content.kind === 'file' && <FilePreview content={element.content} title={element.title} />}
      </div>
      <TagDraftInput tags={workspace.tags} value={tagIds} onChange={setTagIds} disabled={busy || tagBusy} onBusyChange={setTagBusy} />
      {error && <p role="alert" className="form-error">{error}</p>}
      {confirmingDelete && (
        <div className="confirmation-box confirmation-box--danger" role="alert">
          <strong>Удалить этот элемент?</strong><p>Действие нельзя отменить.</p>
          <div className="dialog-actions">
            <button type="button" className="button button--danger" disabled={busy || tagBusy} onClick={() => void remove()}>Подтвердить удаление элемента</button>
            <button type="button" className="button button--quiet" disabled={busy || tagBusy} onClick={() => setConfirmingDelete(false)}>Отмена</button>
          </div>
        </div>
      )}
      <div className="dialog-actions">
        <button type="button" className="button button--primary" disabled={busy || tagBusy || tagIds.length === 0} onClick={() => void save(tagIds)}>Сохранить разметку</button>
        <button type="button" className="button button--secondary" disabled={busy || tagBusy} onClick={() => void save([])}>Сохранить пустую разметку</button>
        <button type="button" className="button button--secondary" disabled={busy || tagBusy} onClick={() => onEdit(element)}>Изменить элемент</button>
        <button type="button" className="button button--danger-quiet" disabled={busy || tagBusy} onClick={() => { setConfirmingDelete(true); setError(''); }}>Удалить элемент</button>
      </div>
    </article>
  );
}
