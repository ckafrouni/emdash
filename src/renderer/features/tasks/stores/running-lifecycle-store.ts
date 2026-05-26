import { observable, runInAction } from 'mobx';

/**
 * Workspaces whose 'run' lifecycle script is currently running. Updated from
 * LifecycleScriptStore.markRunning/markExited; read from the sidebar so we can
 * show which task has its server up across the whole app.
 */
const runningRunWorkspaces = observable.set<string>();

export function markRunScriptRunning(workspaceId: string): void {
  runInAction(() => runningRunWorkspaces.add(workspaceId));
}

export function markRunScriptExited(workspaceId: string): void {
  runInAction(() => runningRunWorkspaces.delete(workspaceId));
}

export function isRunScriptRunning(workspaceId: string): boolean {
  return runningRunWorkspaces.has(workspaceId);
}
