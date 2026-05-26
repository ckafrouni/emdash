import { ExternalLink } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useWorkspaceViewModel } from '@renderer/features/tasks/task-view-context';
import { PrMergeLine } from '@renderer/lib/components/pr-merge-line';
import { PrNumberBadge } from '@renderer/lib/components/pr-number-badge';
import { StatusIcon } from '@renderer/lib/components/pr-status-icon';
import { rpc } from '@renderer/lib/ipc';
import { cn } from '@renderer/utils/utils';
import { getPrNumber, type PullRequest } from '@shared/pull-requests';
import { PrChecksList } from './checks-list';

export const PullRequestEntry = observer(function PullRequestEntry({ pr }: { pr: PullRequest }) {
  const taskView = useWorkspaceViewModel();
  const diffView = taskView.diffView;
  if (!diffView) return null;

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col border-t border-border')}>
      <div className="flex w-full flex-col gap-2 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            className="group relative flex min-w-0 items-center gap-2"
            onClick={() => rpc.app.openExternal(pr.url)}
          >
            <StatusIcon className="size-4" pr={pr} />
            <span className="min-w-0 flex-1 truncate text-sm font-normal">{pr.title}</span>
            <PrNumberBadge number={getPrNumber(pr) ?? 0} />
            <span className="absolute right-0 flex items-center bg-linear-to-r from-transparent to-background pr-0.5 pl-4 opacity-0 transition-opacity group-hover:opacity-100">
              <ExternalLink className="size-3.5 text-foreground-muted" />
            </span>
          </button>
        </div>
        <PrMergeLine pr={pr} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-2.5">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PrChecksList pr={pr} />
        </div>
      </div>
    </div>
  );
});
