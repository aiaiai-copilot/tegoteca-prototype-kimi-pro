import { useState } from 'react';
import type { Content, Element, FileKind } from '../types';
import { sameNode } from '../model/tags';
import { useWorkspace } from '../state/WorkspaceContext';
import type { UserSettings } from '../state/useSettings';
import { Modal } from './Modal';
import { TagDraftInput } from './TagDraftInput';
import { FilePreview } from './FilePreview';

interface ElementEditorProps {
  element?: Element;
  current: string[];
  settings: UserSettings;
  onClose(): void;
  onSaved(element: Element): void;
}

type EditorContentKind = 'text' | 'empty' | 'file';

function fileKind(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return 'other';
}

export function ElementEditor({ element, current, settings, onClose, onSaved }: ElementEditorProps) {
  const { workspace, createElement, saveElement, deleteElement } = useWorkspace();
  const [title, setTitle] = useState(element?.title ?? '');
  const [tagIds, setTagIds] = useState<string[] | null>(element ? element.tagIds === null ? null : [...element.tagIds] : [...current]);
  const [contentKind, setContentKind] = useState<EditorContentKind>(element?.content.kind ?? 'text');
  const [text, setText] = useState(element?.content.kind === 'text' ? element.content.text : '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmingContent, setConfirmingContent] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const contentChanged = Boolean(element && (
    contentKind !== element.content.kind
    || (contentKind === 'text' && (element.content.kind !== 'text' || text !== element.content.text))
    || (contentKind === 'file' && file !== null)
  ));
  const originalTags = element?.tagIds;
  const tagsChanged = Boolean(element && !sameNode(originalTags ?? null, tagIds));
  const tagName = (id: string) => workspace.tags.find((tag) => tag.id === id)?.name ?? id;
  const originalMarkup = originalTags === null ? 'Не задана'
    : originalTags?.length ? originalTags.map(tagName).join(' · ')
      : 'Пустой набор (корень)';

  function makeContent(): Content {
    if (contentKind === 'empty') return { kind: 'empty' };
    if (contentKind === 'text') return { kind: 'text', text };
    if (file) return { kind: 'file', fileKind: fileKind(file), blob: file, name: file.name, mime: file.type || 'application/octet-stream' };
    if (element?.content.kind === 'file') return element.content;
    throw new Error('Выберите файл.');
  }

  async function performSave(forcedTags?: string[] | null) {
    setBusy(true);
    setError('');
    try {
      const input = { title, content: makeContent(), tagIds: forcedTags === undefined ? tagIds : forcedTags };
      const saved = element
        ? await saveElement(element.id, input, contentChanged)
        : await createElement(input);
      onSaved(saved);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!element) return;
    setBusy(true);
    try {
      await deleteElement(element.id);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  return (
    <Modal title={element ? 'Изменение элемента' : 'Новый элемент'} onClose={onClose} wide>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (element && contentChanged && settings.contentReminder) setConfirmingContent(true);
        else void performSave();
      }}>
        <div className="field">
          <label htmlFor="element-title">Название</label>
          <input id="element-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Можно оставить без названия" />
        </div>

        <fieldset className="editor-section">
          <legend>Разметка</legend>
          <label className="check-label">
            <input type="checkbox" checked={tagIds === null} onChange={(event) => setTagIds(event.target.checked ? null : [])} />
            Оставить без разметки
          </label>
          <TagDraftInput tags={workspace.tags} value={tagIds ?? []} onChange={setTagIds} disabled={tagIds === null} />
          {tagsChanged && <p className="original-markup">Исходная разметка: <strong>{originalMarkup}</strong></p>}
        </fieldset>

        <fieldset className="editor-section">
          <legend>Содержание</legend>
          <div className="content-kind" role="radiogroup" aria-label="Вид содержания">
            {(['text', 'empty', 'file'] as const).map((kind) => (
              <label key={kind}><input type="radio" name="content-kind" value={kind} checked={contentKind === kind} onChange={() => setContentKind(kind)} />{kind === 'text' ? 'Текст' : kind === 'empty' ? 'Пустое содержание' : 'Файл'}</label>
            ))}
          </div>
          {contentKind === 'text' && <div className="field"><label htmlFor="element-text">Текст элемента</label><textarea id="element-text" rows={7} value={text} onChange={(event) => setText(event.target.value)} /></div>}
          {contentKind === 'empty' && <p className="muted">Пустое содержание — смысл элемента задают его теги.</p>}
          {contentKind === 'file' && (
            <div className="file-editor">
              {!file && element?.content.kind === 'file' && <FilePreview content={element.content} title={title} />}
              {file && <p>Выбран файл: <strong>{file.name}</strong></p>}
              <div className="field"><label htmlFor="element-file">{element?.content.kind === 'file' ? 'Заменить файл' : 'Файл'}</label><input id="element-file" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div>
            </div>
          )}
        </fieldset>

        {error && <p className="form-error" role="alert">{error}</p>}
        {confirmingContent && (
          <div className="confirmation-box" role="alert">
            <strong>Содержание изменилось</strong>
            <p>Проверьте, что содержание соответствует тегам. Элемент получит новый идентификатор.</p>
            <div className="dialog-actions"><button type="button" className="button button--primary" onClick={() => void performSave()}>Подтвердить сохранение</button><button type="button" className="button button--quiet" onClick={() => setConfirmingContent(false)}>Вернуться</button></div>
          </div>
        )}
        {confirmingDelete && (
          <div className="confirmation-box confirmation-box--danger" role="alert">
            <strong>Удалить этот элемент?</strong><p>Действие нельзя отменить.</p>
            <div className="dialog-actions"><button type="button" className="button button--danger" onClick={() => void remove()}>Подтвердить удаление элемента</button><button type="button" className="button button--quiet" onClick={() => setConfirmingDelete(false)}>Отмена</button></div>
          </div>
        )}
        <div className="editor-actions">
          <button type="submit" className="button button--primary" disabled={busy}>Сохранить элемент</button>
          {!element && <button type="button" className="button button--secondary" disabled={busy} onClick={() => void performSave(null)}>Быстро сохранить без разметки</button>}
          {element && <button type="button" className="button button--danger-quiet" disabled={busy} onClick={() => setConfirmingDelete(true)}>Удалить элемент</button>}
          <button type="button" className="button button--quiet" disabled={busy} onClick={onClose}>Отмена</button>
        </div>
      </form>
    </Modal>
  );
}
