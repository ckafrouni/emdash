import { Loader2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import {
  getTaskStore,
  taskErrorMessage,
  taskViewKind,
} from '@renderer/features/tasks/stores/task-selectors';
import { useTaskViewContext } from '@renderer/features/tasks/task-view-context';
import { TaskMainColumn } from './view/task-main-column';
import { WorkspaceResolutionView } from './workspace-resolution-view';

export const TaskMainPanel = observer(function TaskMainPanel() {
  const { projectId, taskId } = useTaskViewContext();
  const taskStore = getTaskStore(projectId, taskId);
  const kind = taskViewKind(taskStore, projectId);

  if (kind === 'creating') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
        <p className="font-mono text-xs text-foreground-muted">Creating task</p>
      </div>
    );
  }

  if (kind === 'create-error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <p className="font-mono text-sm font-medium text-foreground-destructive">
            Error creating task
          </p>
          <p className="font-mono text-xs text-foreground-passive">{taskErrorMessage(taskStore)}</p>
        </div>
      </div>
    );
  }

  if (kind === 'project-mounting' || kind === 'provisioning') {
    const progressMessage = taskStore?.provisionProgressMessage ?? 'Setting up workspace…';
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
        <p className="font-mono text-xs text-foreground-muted">{progressMessage}</p>
      </div>
    );
  }

  if (kind === 'provision-error' || kind === 'project-error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <p className="font-mono text-sm font-medium text-foreground-destructive">
            Failed to set up workspace
          </p>
          <p className="font-mono text-xs text-foreground-muted">{taskErrorMessage(taskStore)}</p>
        </div>
      </div>
    );
  }

  if (kind === 'idle' || kind === 'teardown') {
    const progressMessage = taskStore?.provisionProgressMessage ?? 'Setting up workspace…';
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
        <p className="font-mono text-xs text-foreground-muted">{progressMessage}</p>
      </div>
    );
  }

  if (kind === 'teardown-error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <p className="font-mono text-sm font-medium text-foreground-destructive">
            Failed to tear down workspace
          </p>
          <p className="font-mono text-xs text-foreground-muted">{taskErrorMessage(taskStore)}</p>
        </div>
      </div>
    );
  }

  if (kind === 'missing') {
    return null;
  }

  if (kind === 'needs-resolution') {
    return <WorkspaceResolutionView />;
  }

  return <TaskMainColumn />;
});
