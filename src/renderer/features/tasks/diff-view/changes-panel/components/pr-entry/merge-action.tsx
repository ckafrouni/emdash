import {
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  HelpCircle,
  Loader2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useWorkspaceViewModel } from '@renderer/features/tasks/task-view-context';
import { toast } from '@renderer/lib/hooks/use-toast';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import { SplitButton, type SplitButtonAction } from '@renderer/lib/ui/split-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';
import type { PullRequest } from '@shared/pull-requests';

type MergeMode = 'merge' | 'squash' | 'rebase';
type MergeSeverity = 'success' | 'warning' | 'error' | 'neutral';
type MergeUiState = {
  kind: 'ready' | 'draft' | 'conflicts' | 'behind' | 'blocked' | 'unstable' | 'unknown';
  severity: MergeSeverity;
  title: string;
  detail?: string;
  canMerge: boolean;
};

const mergeLabels: Record<MergeMode, string> = {
  merge: 'Merge pull request',
  squash: 'Squash and merge',
  rebase: 'Rebase and merge',
};

const mergeDescriptions: Record<MergeMode, string> = {
  merge: 'All commits from this branch will be added to the base branch via a merge commit.',
  squash: 'All commits from this branch will be combined into one commit in the base branch.',
  rebase: 'All commits from this branch will be rebased and added to the base branch.',
};

const severityConfig: Record<MergeSeverity, { icon: LucideIcon; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: 'text-foreground-success' },
  warning: { icon: AlertTriangle, iconClass: 'text-foreground-warning' },
  error: { icon: XCircle, iconClass: 'text-foreground-destructive' },
  neutral: { icon: HelpCircle, iconClass: 'text-foreground-passive' },
};

function computeMergeUiState(pr: PullRequest): MergeUiState {
  if (pr.status !== 'open') {
    return {
      kind: 'unknown',
      severity: 'neutral',
      title: 'Merge status unknown',
      detail: 'Refresh PR status and try again.',
      canMerge: false,
    };
  }
  if (pr.isDraft) {
    return {
      kind: 'draft',
      severity: 'neutral',
      title: 'Draft pull request',
      detail: 'Mark ready for review to enable merging.',
      canMerge: false,
    };
  }
  switch (pr.mergeStateStatus) {
    case 'CLEAN':
      return {
        kind: 'ready',
        severity: 'success',
        title: 'Ready to merge',
        detail: 'No conflicts or required reviews.',
        canMerge: true,
      };
    case 'DIRTY':
      return {
        kind: 'conflicts',
        severity: 'error',
        title: 'Merge conflicts',
        detail: 'Resolve conflicts before merging.',
        canMerge: false,
      };
    case 'BEHIND':
      return {
        kind: 'behind',
        severity: 'warning',
        title: 'Branch is out-of-date',
        detail: 'Update branch before merging.',
        canMerge: false,
      };
    case 'BLOCKED':
      return {
        kind: 'blocked',
        severity: 'error',
        title: 'Merging is blocked',
        detail: 'Required reviews or branch protections not satisfied.',
        canMerge: false,
      };
    case 'HAS_HOOKS':
      return {
        kind: 'blocked',
        severity: 'error',
        title: 'Merging is blocked',
        detail: 'Required checks are not satisfied.',
        canMerge: false,
      };
    case 'UNSTABLE':
      return {
        kind: 'unstable',
        severity: 'warning',
        title: 'Checks not passing',
        detail: 'Review failing checks before merging.',
        canMerge: false,
      };
    default:
      return {
        kind: 'unknown',
        severity: 'neutral',
        title: 'Merge status unknown',
        detail: 'Refresh to try again.',
        canMerge: false,
      };
  }
}

/**
 * Compact merge control for the PR section header — status icon + split-button.
 * For draft PRs, swaps in a "Mark ready" action. The full status detail moves
 * to a tooltip on the status icon.
 */
export const PrMergeAction = observer(function PrMergeAction({ pr }: { pr: PullRequest }) {
  const taskView = useWorkspaceViewModel();
  const prStore = taskView.prStore!;
  const showConfirm = useShowModal('confirmActionModal');
  const [isMerging, setIsMerging] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);

  const uiState = computeMergeUiState(pr);
  const { icon: StatusIcon, iconClass } = severityConfig[uiState.severity];
  const isDraft = uiState.kind === 'draft';

  const doMerge = async (strategy: MergeMode) => {
    setIsMerging(true);
    try {
      await prStore.mergePr(pr.url, { strategy, commitHeadOid: pr.headRefOid });
    } finally {
      setIsMerging(false);
    }
  };

  const handleMergeClick = (strategy: MergeMode) => {
    if (uiState.canMerge) {
      void doMerge(strategy);
    } else {
      showConfirm({
        title: 'Merge anyway?',
        description: (uiState.detail ?? uiState.title) + ' Are you sure you want to proceed?',
        confirmLabel: 'Merge anyway',
        variant: 'destructive',
        onSuccess: () => void doMerge(strategy),
      });
    }
  };

  const mergeActions: SplitButtonAction[] = (['merge', 'squash', 'rebase'] as const).map(
    (strategy) => ({
      value: strategy,
      label: mergeLabels[strategy],
      description: mergeDescriptions[strategy],
      action: () => handleMergeClick(strategy),
    })
  );

  const onMarkReady = () => {
    setIsMarkingReady(true);
    prStore
      .markReadyForReview(pr.url)
      .catch(() => {
        toast({
          title: 'Failed to mark pull request ready',
          description: 'Refresh PR status and try again.',
          variant: 'destructive',
        });
      })
      .finally(() => setIsMarkingReady(false));
  };

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger>
          <span className="flex items-center" aria-label={uiState.title}>
            <StatusIcon className={cn('size-4', iconClass)} />
          </span>
        </TooltipTrigger>
        <TooltipContent>{uiState.detail ?? uiState.title}</TooltipContent>
      </Tooltip>
      {isDraft ? (
        <Button variant="outline" size="xs" onClick={onMarkReady} disabled={isMarkingReady}>
          {isMarkingReady && <Loader2 className="size-3 animate-spin" />}
          Mark ready
        </Button>
      ) : (
        <SplitButton
          size="xs"
          variant="outline"
          loading={isMerging}
          loadingLabel="Merging..."
          icon={<GitMerge className="size-3" />}
          actions={mergeActions}
          disabled={!uiState.canMerge && !isMerging}
        />
      )}
    </div>
  );
});
