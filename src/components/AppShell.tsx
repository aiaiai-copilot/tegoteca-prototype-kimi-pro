import { useMemo } from 'react';
import type { Workspace } from '../types';
import type { NavigationState } from '../state/useNavigation';
import { getTransitions } from '../model/navigation';
import { ownElements, selectElements } from '../model/elements';
import { nodeKey } from '../model/tags';
import { TagSelector } from './TagSelector';
import { TransitionGroups } from './TransitionGroups';
import { ElementList } from './ElementList';

interface AppShellProps {
  workspace: Workspace;
  navigation: NavigationState;
  showOwnCounts?: boolean;
  onCreate?(): void;
  onEdit?(element: Workspace['elements'][number]): void;
  onOpenMarking?(): void;
  onOpenGlossary?(): void;
  onOpenSettings?(): void;
}

export function AppShell({
  workspace,
  navigation,
  showOwnCounts = true,
  onCreate,
  onEdit,
  onOpenMarking,
  onOpenGlossary,
  onOpenSettings,
}: AppShellProps) {
  const { current, viewMode, sortMode } = navigation;
  const currentKey = nodeKey(current);
  const tagNames = useMemo(() => new Map(workspace.tags.map((tag) => [tag.id, tag.name])), [workspace.tags]);
  const currentNames = current.map((id) => tagNames.get(id) ?? id);
  const selection = useMemo(() => selectElements(workspace, current), [workspace, currentKey]);
  const own = useMemo(() => ownElements(workspace, current), [workspace, currentKey]);
  const transitions = useMemo(() => getTransitions(workspace, current), [workspace, currentKey]);
  const unmarkedCount = workspace.elements.filter((element) => element.tagIds === null).length;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <button type="button" className="brand" onClick={navigation.goRoot} aria-label="Теготека — в корень">
            <span className="brand-mark" aria-hidden="true">Т</span>
            <span><strong>Теготека</strong><small>Смысл задают связи</small></span>
          </button>
          <nav className="primary-actions" aria-label="Действия с рабочей областью">
            <button type="button" className="button button--primary" onClick={onCreate} disabled={!onCreate}>+ Новый элемент</button>
            <button type="button" className="button button--quiet" onClick={onOpenMarking} disabled={!onOpenMarking}>
              Разметка {unmarkedCount > 0 && <span className="count-badge">{unmarkedCount}</span>}
            </button>
            <button type="button" className="button button--quiet" onClick={onOpenGlossary} disabled={!onOpenGlossary}>Глоссарий</button>
            <button type="button" className="icon-button" onClick={onOpenSettings} disabled={!onOpenSettings} aria-label="Настройки" title="Настройки">⚙</button>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <section className="node-panel" aria-labelledby="current-node-title">
          <div className="node-panel__top">
            <div>
              <p className="eyebrow">Текущее место в теговом графе</p>
              <h1 id="current-node-title">{currentNames.length ? `Узел: ${currentNames.join(' · ')}` : 'Корень'}</h1>
            </div>
            <div className="history-actions" aria-label="История переходов">
              <button type="button" className="button button--quiet" onClick={navigation.back} disabled={!navigation.canBack}><span aria-hidden="true">← </span>Назад</button>
              <button type="button" className="button button--quiet" onClick={navigation.forward} disabled={!navigation.canForward}>Вперёд<span aria-hidden="true"> →</span></button>
              <button type="button" className="button button--quiet" onClick={navigation.goRoot} disabled={current.length === 0}><span aria-hidden="true">⌂ </span>В корень</button>
            </div>
          </div>
          <TagSelector workspace={workspace} current={current} navigate={navigation.navigate} />
          <div className="node-summary" aria-live="polite">
            <span><strong>{selection.length}</strong> в выборке</span>
            <span><strong>{own.length}</strong> собственных</span>
            <span className="history-position">Переход {navigation.history.index + 1} из {navigation.history.entries.length}</span>
          </div>
        </section>

        <TransitionGroups
          transitions={transitions}
          tags={workspace.tags}
          current={current}
          showOwnCounts={showOwnCounts}
          navigate={navigation.navigate}
        />

        <ElementList
          elements={viewMode === 'own' ? own : selection}
          selectionCount={selection.length}
          ownCount={own.length}
          current={current}
          tags={workspace.tags}
          viewMode={viewMode}
          sortMode={sortMode}
          setViewMode={navigation.setViewMode}
          setSortMode={navigation.setSortMode}
          onCreate={onCreate}
          onEdit={onEdit}
        />
      </main>
      <footer className="app-footer">Данные хранятся только в этом браузере · IndexedDB · без сервера</footer>
    </div>
  );
}
