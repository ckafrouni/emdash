import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTaskViewKind, useWorkspaceViewModel } from '@renderer/features/tasks/task-view-context';
import { useRightSidebarPanelRef } from '@renderer/lib/layout/workspace-layout';
import { cn } from '@renderer/utils/utils';
import { type SidebarTab } from '../types';
import { TaskSidebar } from './task-sidebar';

interface TabSpec {
  value: SidebarTab;
  label: string;
}

const TABS: readonly TabSpec[] = [
  { value: 'changes', label: 'Changes' },
  { value: 'files', label: 'Files' },
  { value: 'conversations', label: 'Agents' },
];

export const TaskRightSidebar = observer(function TaskRightSidebar() {
  const kind = useTaskViewKind();
  // The sidebar's panels (ChangesPanel, EditorFileTree, ...) call
  // useWorkspace / useWorkspaceViewModel which require a provisioned task.
  // Render an empty shell until the task is ready so we don't throw during
  // creation / provisioning / error states.
  if (kind !== 'ready') {
    return <div className="h-full bg-background" />;
  }
  return <ReadyTaskRightSidebar />;
});

const ReadyTaskRightSidebar = observer(function ReadyTaskRightSidebar() {
  const taskView = useWorkspaceViewModel();
  const activeTab = taskView.sidebarTab;
  const panelRef = useRightSidebarPanelRef();

  // Drive the workspace right-sidebar panel from MobX state. Cmd+. (and the
  // titlebar toggle) flip `isSidebarCollapsed`; this effect collapses or
  // expands the actual layout panel to match.
  useEffect(() => {
    const panel = panelRef?.current;
    if (!panel) return;
    if (taskView.isSidebarCollapsed) panel.collapse();
    else panel.expand();
  }, [panelRef, taskView.isSidebarCollapsed]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div
        role="tablist"
        className="h-header-row flex shrink-0 items-stretch border-b border-border"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                taskView.setSidebarTab(tab.value);
                if (taskView.isSidebarCollapsed) taskView.setSidebarCollapsed(false);
              }}
              className={cn(
                'flex flex-1 items-center justify-center text-sm transition-colors',
                isActive
                  ? 'bg-background text-foreground'
                  : 'bg-background-2 text-foreground-muted hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <TaskSidebar />
      </div>
    </div>
  );
});
