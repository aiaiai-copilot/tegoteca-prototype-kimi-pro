import { useState } from 'react';
import type { Element } from './types';
import { WorkspaceProvider, useWorkspace } from './state/WorkspaceContext';
import { useNavigation } from './state/useNavigation';
import { useSettings } from './state/useSettings';
import { sameNode } from './model/tags';
import { AppShell } from './components/AppShell';
import { ElementEditor } from './components/ElementEditor';
import { MarkingMode } from './components/MarkingMode';
import { GlossaryPanel } from './components/GlossaryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { Modal } from './components/Modal';

function WorkspaceScreen() {
  const { status, error } = useWorkspace();
  if (status === 'loading') {
    return <main className="status-screen"><span className="loader" aria-hidden="true" /><p>Загружаем рабочую область…</p></main>;
  }
  if (status === 'error') {
    return <main className="status-screen"><h1>Не удалось открыть рабочую область</h1><p role="alert">{error}</p><button className="button button--primary" onClick={() => window.location.reload()}>Повторить</button></main>;
  }
  return <ReadyWorkspace />;
}

function ReadyWorkspace() {
  const { workspace, error } = useWorkspace();
  const navigation = useNavigation(workspace.tags.map((tag) => tag.id));
  const [settings, updateSettings] = useSettings();
  const [editor, setEditor] = useState<{ element?: Element } | null>(null);
  const [markingOpen, setMarkingOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedElement, setSavedElement] = useState<Element | null>(null);

  function onSaved(element: Element) {
    if (element.tagIds !== null && !sameNode(navigation.current, element.tagIds)) setSavedElement(element);
  }

  return (
    <>
      {error && <div className="global-error" role="alert">{error}</div>}
      <AppShell
        workspace={workspace}
        navigation={navigation}
        showOwnCounts={settings.showOwnCounts}
        onCreate={() => setEditor({})}
        onEdit={(element) => setEditor({ element })}
        onOpenMarking={() => setMarkingOpen(true)}
        onOpenGlossary={() => setGlossaryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      {editor && <ElementEditor element={editor.element} current={navigation.current} settings={settings} onClose={() => setEditor(null)} onSaved={onSaved} />}
      {markingOpen && <MarkingMode onClose={() => setMarkingOpen(false)} />}
      {glossaryOpen && <GlossaryPanel onClose={() => setGlossaryOpen(false)} />}
      {settingsOpen && <SettingsPanel settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />}
      {savedElement && (
        <Modal title="Элемент сохранён" onClose={() => setSavedElement(null)}>
          <p>Текущий узел не изменился. Собственный узел сохранённого элемента отличается от него.</p>
          <div className="dialog-actions">
            <button type="button" className="button button--primary" onClick={() => {
              if (savedElement.tagIds) navigation.navigate(savedElement.tagIds);
              setSavedElement(null);
            }}>Перейти к узлу элемента</button>
            <button type="button" className="button button--quiet" onClick={() => setSavedElement(null)}>Остаться здесь</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function App({ databaseName }: { databaseName?: string }) {
  return (
    <WorkspaceProvider databaseName={databaseName}>
      <WorkspaceScreen />
    </WorkspaceProvider>
  );
}
