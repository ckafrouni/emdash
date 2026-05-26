import { Plus, RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { getPrSyncStore } from '@renderer/features/projects/stores/project-selectors';
import { getRegisteredTaskData } from '@renderer/features/tasks/stores/task-selectors';
import { rpc } from '@renderer/lib/ipc';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import { EmptyState } from '@renderer/lib/ui/empty-state';
import { SplitButton, type SplitButtonAction } from '@renderer/lib/ui/split-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';
import {
  useTaskViewContext,
  useWorkspace,
  useWorkspaceId,
  useWorkspaceViewModel,
} from '../../task-view-context';
import { PrMergeAction } from './components/pr-entry/merge-action';
import { PullRequestEntry } from './components/pr-entry/pr-entry';
import { SectionHeader } from './components/section-header';

export const PullRequestsSection = observer(function PullRequestsSection({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { projectId, taskId } = useTaskViewContext();
  const workspaceId = useWorkspaceId();
  const workspace = useWorkspace();
  const taskView = useWorkspaceViewModel();
  const prStore = taskView.prStore;
  const repositoryUrl = workspace.repository.pullRequestRepositoryUrl;
  const pullRequests = prStore?.pullRequests ?? [];
  const currentPr = prStore?.currentPr;
  const openPr = currentPr?.status === 'open' ? currentPr : undefined;
  const showCreatePrModal = useShowModal('createPrModal');

  const isRefreshing = repositoryUrl
    ? (getPrSyncStore(projectId)?.isSyncing(repositoryUrl) ?? false)
    : false;

  const taskBranch = getRegisteredTaskData(projectId, taskId)?.taskBranch;
  const canCreatePr = Boolean(repositoryUrl) && Boolean(taskBranch);

  const createPr = (draft: boolean) => {
    if (!canCreatePr) return;
    showCreatePrModal({
      projectId,
      taskId,
      repositoryUrl: repositoryUrl ?? '',
      branchName: taskBranch ?? '',
      draft,
      workspaceId,
      onSuccess: () => {},
    });
  };

  const createPrActions: SplitButtonAction[] = [
    { value: 'create-pr', label: 'Create PR', action: () => createPr(false) },
    { value: 'create-draft-pr', label: 'Create draft PR', action: () => createPr(true) },
  ];

  return (
    <>
      <SectionHeader
        label="Pull Requests"
        count={pullRequests.length}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        actions={
          <>
            {openPr && <PrMergeAction pr={openPr} />}
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
            action={
              canCreatePr ? (
                <SplitButton
                  variant="outline"
                  size="xs"
                  actions={createPrActions}
                  icon={<Plus className="size-3" />}
                />
              ) : undefined
            }
          />
        ) : null}
        {repositoryUrl && currentPr && <PullRequestEntry key={currentPr.url} pr={currentPr} />}
      </div>
    </>
  );
});
