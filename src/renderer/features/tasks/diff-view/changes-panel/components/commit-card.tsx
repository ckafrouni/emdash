import { CheckCircle, Loader2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { getRegisteredTaskData } from '@renderer/features/tasks/stores/task-selectors';
import {
  useTaskViewContext,
  useWorkspace,
  useWorkspaceId,
  useWorkspaceViewModel,
} from '@renderer/features/tasks/task-view-context';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { SplitButton, type SplitButtonAction } from '@renderer/lib/ui/split-button';
import { Textarea } from '@renderer/lib/ui/textarea';

type CommitPhase =
  | 'idle'
  | 'committing'
  | 'commit-only-done'
  | 'committed'
  | 'pushing'
  | 'pushed'
  | 'opening-pr';

interface CommitCardProps {
  autoStage?: boolean;
}

/**
 * Edge-to-edge commit composer — Zed-inspired. One textarea (subject + body
 * separated by a blank line, git's own format), a split-button below, no
 * surrounding card frame.
 */
export const CommitCard = observer(function CommitCard({ autoStage = false }: CommitCardProps) {
  const { projectId, taskId } = useTaskViewContext();
  const workspaceId = useWorkspaceId();
  const taskView = useWorkspaceViewModel();
  const workspace = useWorkspace();
  const git = workspace.git;
  const diffView = taskView.diffView;
  const changesView = diffView?.changesView ?? null;
  const hasPRs = changesView?.expandedSections.pullRequests ?? false;
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<CommitPhase>('idle');
  const isInFlight = phase !== 'idle';

  const showCreatePrModal = useShowModal('createPrModal');
  const repositoryUrl = workspace.repository.pullRequestRepositoryUrl;

  if (!diffView || !changesView) return null;

  const taskData = getRegisteredTaskData(projectId, taskId);
  const hasOpenPr = taskView.prStore?.pullRequests.some((p) => p.status === 'open') ?? false;
  const canCreatePr = Boolean(repositoryUrl) && Boolean(taskData?.taskBranch) && !hasOpenPr;

  const trimmedMessage = message.trim();

  const stageIfNeeded = async () => {
    if (!autoStage) return;
    changesView.suppressNextAutoExpand('staged');
    await git.stageAllFiles();
  };

  const resetExpandedAfterCommit = () => {
    if (autoStage) return;
    changesView.setExpanded({ unstaged: true, staged: false, pullRequests: hasPRs });
  };

  const doCommit = async () => {
    setPhase('committing');
    await stageIfNeeded();
    const result = await git.commit(trimmedMessage);
    if (!result.success) {
      setPhase('idle');
      return;
    }
    setMessage('');
    resetExpandedAfterCommit();
    setPhase('commit-only-done');
    setTimeout(() => setPhase('idle'), 3000);
  };

  const doCommitAndPush = async () => {
    setPhase('committing');
    await stageIfNeeded();
    const commitResult = await git.commit(trimmedMessage);
    if (!commitResult.success) {
      setPhase('idle');
      return;
    }
    setMessage('');
    resetExpandedAfterCommit();
    setPhase('committed');
    await new Promise((r) => setTimeout(r, 1000));
    setPhase('pushing');
    const pushResult = await git.push();
    if (!pushResult.success) {
      setPhase('idle');
      return;
    }
    setPhase('pushed');
    setTimeout(() => setPhase('idle'), 3000);
  };

  const doCommitAndCreatePr = async () => {
    setPhase('committing');
    await stageIfNeeded();
    const commitResult = await git.commit(trimmedMessage);
    if (!commitResult.success) {
      setPhase('idle');
      return;
    }
    setMessage('');
    resetExpandedAfterCommit();
    setPhase('opening-pr');
    await new Promise((r) => setTimeout(r, 500));
    setPhase('idle');
    showCreatePrModal({
      projectId,
      taskId,
      repositoryUrl: repositoryUrl ?? '',
      branchName: taskData?.taskBranch ?? '',
      draft: false,
      workspaceId,
      onSuccess: () => {},
    });
  };

  const actions: SplitButtonAction[] = [
    { value: 'commit', label: 'Commit', action: () => void doCommit() },
    { value: 'commit-push', label: 'Commit & Push', action: () => void doCommitAndPush() },
    ...(canCreatePr
      ? [
          {
            value: 'commit-pr',
            label: 'Commit & Create PR',
            action: () => void doCommitAndCreatePr(),
          },
        ]
      : []),
  ];

  const effectiveAction =
    diffView.effectiveCommitAction === 'commit-pr' && !canCreatePr
      ? 'commit-push'
      : diffView.effectiveCommitAction;

  // Cmd/Ctrl+Enter triggers the currently selected action.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    if (!(e.metaKey || e.ctrlKey)) return;
    if (!trimmedMessage || isInFlight) return;
    e.preventDefault();
    const action = actions.find((a) => a.value === effectiveAction) ?? actions[0];
    action?.action();
  };

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-t border-border bg-background-1 px-2 py-2">
      <Textarea
        placeholder="Commit message"
        rows={3}
        className="w-full resize-none bg-background"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isInFlight}
      />
      {phase === 'idle' && (
        <SplitButton
          actions={actions}
          size="sm"
          className="w-full"
          disabled={!trimmedMessage}
          defaultValue={effectiveAction}
          onValueChange={(value) =>
            diffView.setCommitAction(value as 'commit' | 'commit-push' | 'commit-pr')
          }
        />
      )}
      {phase === 'committing' && (
        <StatusRow icon={<Loader2 className="size-4 animate-spin" />} label="Committing…" />
      )}
      {phase === 'opening-pr' && (
        <StatusRow icon={<Loader2 className="size-4 animate-spin" />} label="Opening PR…" />
      )}
      {(phase === 'commit-only-done' || phase === 'committed') && (
        <StatusRow
          icon={<CheckCircle className="size-4 text-foreground-success" />}
          label="Committed"
        />
      )}
      {phase === 'pushing' && (
        <StatusRow icon={<Loader2 className="size-4 animate-spin" />} label="Pushing…" />
      )}
      {phase === 'pushed' && (
        <StatusRow
          icon={<CheckCircle className="size-4 text-foreground-success" />}
          label="Pushed"
        />
      )}
    </div>
  );
});

function StatusRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex w-full items-center justify-center gap-2 py-1 text-sm text-foreground-muted">
      {icon}
      <span>{label}</span>
    </div>
  );
}
