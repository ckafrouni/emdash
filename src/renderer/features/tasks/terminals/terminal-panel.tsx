import { Terminal } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  useTaskViewContext,
  useTerminals,
  useWorkspace,
  useWorkspaceId,
  useWorkspaceViewModel,
} from '@renderer/features/tasks/task-view-context';
import { useTabShortcuts } from '@renderer/lib/hooks/useTabShortcuts';
import { rpc } from '@renderer/lib/ipc';
import { Button } from '@renderer/lib/ui/button';
import { EmptyState } from '@renderer/lib/ui/empty-state';
import { BoundShortcut } from '@renderer/lib/ui/shortcut';
import { useIsActiveTask } from '../hooks/use-is-active-task';
import { resolveTerminalPanelActiveItem } from './terminal-panel-selection';
import { TerminalPtyContent } from './terminal-pty-content';
import { TerminalTopTabs } from './terminal-top-tabs';

export const TerminalsPanel = observer(function TerminalsPanel() {
  const { projectId, taskId } = useTaskViewContext();
  const workspaceId = useWorkspaceId();
  const taskView = useWorkspaceViewModel();
  const workspace = useWorkspace();
  const terminalMgr = useTerminals();
  const terminalTabView = taskView.terminalTabs;
  const lifecycleScriptsMgr = workspace.lifecycleScripts ?? null;
  const isActive = useIsActiveTask(taskId);
  const remoteConnectionId = workspace.sshConnectionId;
  const [isPanelFocused, setIsPanelFocused] = useState(false);

  const autoFocus =
    isActive && taskView.isTerminalDrawerOpen && taskView.focusedRegion === 'bottom';

  const terminalTabs = terminalTabView.tabs;
  const lifecycleScriptTabs = lifecycleScriptsMgr?.tabs ?? [];

  // Unified active item — spans both terminals and scripts sections.
  const activeItem = resolveTerminalPanelActiveItem({
    requestedActiveItem: taskView.terminalDrawerActiveItem,
    activeTerminalId: terminalTabView.activeTabId,
    terminalIds: terminalTabs.map((terminal) => terminal.data.id),
    scriptIds: lifecycleScriptTabs.map((script) => script.data.id),
  });

  const activeTerminalId = activeItem.kind === 'terminal' ? activeItem.id : undefined;
  const activeScriptId = activeItem.kind === 'script' ? activeItem.id : undefined;

  const activeSession =
    activeItem.kind === 'terminal'
      ? (terminalMgr.sessions.get(activeTerminalId ?? '') ?? null)
      : (lifecycleScriptTabs.find((s) => s.data.id === activeItem.id)?.session ?? null);

  const allSessionIds = [
    ...terminalTabs
      .map((t) => terminalMgr.sessions.get(t.data.id)?.sessionId)
      .filter((id): id is string => Boolean(id)),
    ...lifecycleScriptTabs.map((s) => s.session.sessionId),
  ];

  const handleHoverTerminal = (id: string) => {
    const session = terminalMgr.sessions.get(id);
    if (session?.status === 'disconnected') void session.connect();
  };

  const activeStore =
    activeItem.kind === 'terminal' ? terminalTabView : (lifecycleScriptsMgr ?? undefined);
  useTabShortcuts(activeStore, { focused: isPanelFocused });

  const handleCreate = async () => {
    await taskView.openNewTerminal();
  };

  const handleRunScript = (id: string) => {
    const script = lifecycleScriptsMgr?.tabs.find((s) => s.data.id === id);
    if (!script || script.isRunning) return;
    lifecycleScriptsMgr?.setActiveTab(id);
    taskView.setTerminalDrawerActiveItem({ kind: 'script', id });
    script.markRunning();
    void rpc.terminals
      .runLifecycleScript({
        projectId,
        workspaceId,
        type: script.data.type,
      })
      .catch(() => {
        script.markExited();
      });
  };

  const handleStopScript = (id: string) => {
    const script = lifecycleScriptsMgr?.tabs.find((s) => s.data.id === id);
    if (!script) return;
    // Ctrl+C interrupts the foreground process, but the shell stays alive so
    // ptyExit never fires — mark exited here so the UI reflects the intent.
    void rpc.pty.sendInput(script.session.sessionId, '\x03');
    script.markExited();
  };

  const emptyState = (
    <EmptyState
      icon={<Terminal className="text-muted-foreground h-5 w-5" />}
      label="No terminals yet"
      description="Add a terminal to run shell commands in this task's working directory."
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          className="flex items-center gap-2"
        >
          New terminal
          <BoundShortcut settingsKey="newTerminal" />
        </Button>
      }
    />
  );

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-background"
      onFocus={() => {
        setIsPanelFocused(true);
        taskView.setFocusedRegion('bottom');
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsPanelFocused(false);
        }
      }}
    >
      <TerminalTopTabs
        projectId={projectId}
        terminalTabView={terminalTabView}
        lifecycleScriptsMgr={lifecycleScriptsMgr}
        activeTerminalId={activeTerminalId}
        activeScriptId={activeScriptId}
        onSelectTerminal={(id) => {
          terminalTabView.setActiveTab(id);
          taskView.setTerminalDrawerActiveItem({ kind: 'terminal', id });
          if (!taskView.isTerminalDrawerOpen) taskView.setTerminalDrawerOpen(true);
        }}
        onRemoveTerminal={(id) => terminalTabView.removeTab(id)}
        onRenameTerminal={(id, name) => void terminalMgr?.renameTerminal(id, name)}
        onHoverTerminal={handleHoverTerminal}
        onSelectScript={(id) => {
          lifecycleScriptsMgr?.setActiveTab(id);
          taskView.setTerminalDrawerActiveItem({ kind: 'script', id });
          if (!taskView.isTerminalDrawerOpen) taskView.setTerminalDrawerOpen(true);
        }}
        onRunScript={handleRunScript}
        onStopScript={handleStopScript}
        onAddTerminal={() => void handleCreate()}
        isOpen={taskView.isTerminalDrawerOpen}
        onToggleOpen={() => taskView.setTerminalDrawerOpen(!taskView.isTerminalDrawerOpen)}
      />
      <div className="min-h-0 flex-1">
        <TerminalPtyContent
          className="h-full"
          activeSession={activeSession}
          allSessionIds={allSessionIds}
          paneId="terminal-drawer"
          autoFocus={autoFocus}
          emptyState={emptyState}
          remoteConnectionId={remoteConnectionId}
        />
      </div>
    </div>
  );
});
