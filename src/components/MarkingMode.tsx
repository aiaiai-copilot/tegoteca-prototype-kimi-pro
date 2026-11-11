import { useState } from 'react';
import type { Element } from '../types';
import { useWorkspace } from '../state/WorkspaceContext';
import { Modal } from './Modal';
import { TagDraftInput } from './TagDraftInput';
import { FilePreview } from './FilePreview';

export function MarkingMode({ onClose }: { onClose(): void }) {
  const { workspace } = useWorkspace();
  const unmarked = workspace.elements.filter((element) => element.tagIds === null).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const [initialCount] = useState(unmarked.length);
  const completed = Math.max(0, initialCount - unmarked.length);

  return (
    <Modal title="Режим разметки" onClose={onClose} wide>
      <div className="marking-progress">
        <div><strong>Осталось: {unmarked.length}</strong><span>Размечено в этом сеансе: {completed}</span></div>
        <progress max={Math.max(initialCount, 1)} value={completed} aria-label="Прогресс разметки" />
      </div>
      {unmarked.length === 0 ? (
        <div className="empty-state"><h3>Все элементы размечены.</h3><p>Новые неразмеченные записи появятся здесь после быстрого сохранения.</p></div>
      ) : <MarkingForm key={unmarked[0].id} element={unmarked[0]} />}
      <div className="dialog-actions marking-actions"><button type="button" className="button button--quiet" onClick={onClose}>Вернуться к элементам</button></div>
    </Modal>
  );
}

function MarkingForm({ element }: { element: Element }) {
  const { workspace, saveMetadata } = useWorkspace();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(tags: string[]) {
    setBusy(true);
    setError('');
    try {
      await saveMetadata(element.id, { tagIds: tags });
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
      <TagDraftInput tags={workspace.tags} value={tagIds} onChange={setTagIds} />
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="dialog-actions">
        <button type="button" className="button button--primary" disabled={busy || tagIds.length === 0} onClick={() => void save(tagIds)}>Сохранить разметку</button>
        <button type="button" className="button button--secondary" disabled={busy} onClick={() => void save([])}>Сохранить пустую разметку</button>
      </div>
    </article>
  );
}
