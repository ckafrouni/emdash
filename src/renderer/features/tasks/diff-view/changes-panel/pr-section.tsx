import { RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { getPrSyncStore } from '@renderer/features/projects/stores/project-selectors';
import { rpc } from '@renderer/lib/ipc';
import { Button } from '@renderer/lib/ui/button';
import { EmptyState } from '@renderer/lib/ui/empty-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';
import { useTaskViewContext, useWorkspace, useWorkspaceViewModel } from '../../task-view-context';
import { ChangesViewModeToggle } from './components/changes-view-mode-toggle';
import { PullRequestEntry } from './components/pr-entry/pr-entry';
import { SectionHeader } from './components/section-header';
import { useChangesViewMode } from './hooks/use-changes-view-mode';

export const PullRequestsSection = observer(function PullRequestsSection({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { projectId } = useTaskViewContext();
  const workspace = useWorkspace();
  const taskView = useWorkspaceViewModel();
  const prStore = taskView.prStore;
  const repositoryUrl = workspace.repository.pullRequestRepositoryUrl;
  const pullRequests = prStore?.pullRequests ?? [];
  const currentPr = prStore?.currentPr;

  const isRefreshing = repositoryUrl
    ? (getPrSyncStore(projectId)?.isSyncing(repositoryUrl) ?? false)
    : false;

  const { mode: viewMode, setMode: setViewMode } = useChangesViewMode('pr');

  return (
    <>
      <SectionHeader
        label="Pull Requests"
        count={pullRequests.length}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        actions={
          <>
            <ChangesViewModeToggle
              value={viewMode}
              onChange={setViewMode}
              label="Pull request files"
            />
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => void rpc.pullRequests.syncPullRequests(projectId)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn('size-3', isRefreshing && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh pull requests</TooltipContent>
            </Tooltip>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!repositoryUrl ? (
          <EmptyState
            label="Pull requests unavailable"
            description="Pull requests are currently available only for configured GitHub remotes."
          />
        ) : pullRequests.length === 0 ? (
          <EmptyState
            label="No pull requests"
            description="Push your branch and create a PR to start a review."
          />
        ) : null}
        {repositoryUrl && currentPr && <PullRequestEntry key={currentPr.url} pr={currentPr} />}
      </div>
    </>
  );
});
