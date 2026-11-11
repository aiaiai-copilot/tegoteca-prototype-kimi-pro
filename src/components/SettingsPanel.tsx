import { useState } from 'react';
import { useWorkspace } from '../state/WorkspaceContext';
import type { UserSettings } from '../state/useSettings';
import { Modal } from './Modal';

interface SettingsPanelProps {
  settings: UserSettings;
  onChange(patch: Partial<UserSettings>): void;
  onClose(): void;
}

type PendingAction = 'demo' | 'empty' | 'diagnostic' | null;

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const { loadDemo, addDemoMedia, resetWorkspace, generateDiagnostic } = useWorkspace();
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function run(action: Exclude<PendingAction, null>) {
    setBusy(true);
    setError('');
    try {
      if (action === 'demo') await loadDemo();
      if (action === 'empty') await resetWorkspace();
      if (action === 'diagnostic') await generateDiagnostic();
      setMessage(action === 'demo' ? 'Демонстрационный набор загружен.' : action === 'empty' ? 'Рабочая область очищена.' : 'Диагностический набор создан.');
      setPending(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Настройки" onClose={onClose}>
      <section className="settings-section" aria-labelledby="interface-settings">
        <h3 id="interface-settings">Интерфейс</h3>
        <label className="check-label"><input type="checkbox" checked={settings.contentReminder} onChange={(event) => onChange({ contentReminder: event.target.checked })} />Напоминать о соответствии содержания тегам</label>
        <label className="check-label"><input type="checkbox" checked={settings.showOwnCounts} onChange={(event) => onChange({ showOwnCounts: event.target.checked })} />Показывать число собственных элементов</label>
      </section>
      <section className="settings-section" aria-labelledby="workspace-settings">
        <h3 id="workspace-settings">Рабочая область</h3>
        <p className="muted">Все данные остаются в IndexedDB этого браузера.</p>
        <div className="settings-actions">
          <button type="button" className="button button--secondary" disabled={busy} onClick={() => setPending('demo')}>Загрузить демонстрационные данные</button>
          <button type="button" className="button button--quiet" disabled={busy} onClick={() => {
            setBusy(true);
            setError('');
            void addDemoMedia().then(() => setMessage('Демонстрационные медиа добавлены.')).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause))).finally(() => setBusy(false));
          }}>Добавить демонстрационные медиа</button>
          <button type="button" className="button button--quiet" disabled={busy} onClick={() => setPending('diagnostic')}>Создать диагностический набор</button>
          <button type="button" className="button button--danger-quiet" disabled={busy} onClick={() => setPending('empty')}>Очистить рабочую область</button>
        </div>
      </section>
      {message && <p className="form-success" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {pending && (
        <div className="confirmation-box confirmation-box--danger" role="alert">
          <strong>{pending === 'empty' ? 'Очистить рабочую область?' : pending === 'demo' ? 'Заменить данные демонстрационным набором?' : 'Заменить данные диагностическим набором?'}</strong>
          <p>{pending === 'empty' ? 'Все элементы и теги будут удалены из этой рабочей области.' : pending === 'demo' ? 'Текущие элементы и теги будут заменены на E0–E9.' : 'Текущие данные будут заменены на 10 000 элементов и 100 тегов.'}</p>
          <div className="dialog-actions">
            <button type="button" className="button button--danger" disabled={busy} onClick={() => void run(pending)}>{pending === 'empty' ? 'Подтвердить очистку' : pending === 'demo' ? 'Подтвердить загрузку' : 'Подтвердить генерацию'}</button>
            <button type="button" className="button button--quiet" disabled={busy} onClick={() => setPending(null)}>Отмена</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
