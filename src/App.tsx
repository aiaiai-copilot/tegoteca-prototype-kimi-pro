import { WorkspaceProvider, useWorkspace } from './state/WorkspaceContext';
import { useNavigation } from './state/useNavigation';
import { AppShell } from './components/AppShell';

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
  return (
    <>
      {error && <div className="global-error" role="alert">{error}</div>}
      <AppShell workspace={workspace} navigation={navigation} />
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
