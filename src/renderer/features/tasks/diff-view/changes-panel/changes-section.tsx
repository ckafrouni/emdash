import { ChevronDown, Minus, Plus, Undo2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import {
  useTaskViewContext,
  useWorkspace,
  useWorkspaceId,
  useWorkspaceViewModel,
} from '@renderer/features/tasks/task-view-context';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/lib/ui/dropdown-menu';
import { EmptyState } from '@renderer/lib/ui/empty-state';
import { commitRef, HEAD_REF, type Commit, type GitChange } from '@shared/git';
import type { ActiveFile } from '@shared/view-state';
import { ActionCard } from './components/action-card';
import { ChangesListOrTree } from './components/changes-list-or-tree';
import { ChangesViewModeToggle } from './components/changes-view-mode-toggle';
import { CommitCard } from './components/commit-card';
import { SectionHeader } from './components/section-header';
import { useBranchCommits } from './hooks/use-branch-commits';
import { useBranchFiles } from './hooks/use-branch-files';
import { useChangesViewMode } from './hooks/use-changes-view-mode';
import { useCommitFiles } from './hooks/use-commit-files';
import { usePrefetchDiffModels } from './hooks/use-prefetch-diff-models';

/** Unified row spanning the file's staged + unstaged halves. */
interface CombinedChange extends GitChange {
  hasStaged: boolean;
  hasUnstaged: boolean;
}

type ChangesSource =
  | { kind: 'commits' }
  | { kind: 'uncommitted' }
  | { kind: 'commit'; hash: string };

function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

function commitLabel(commit: Commit): string {
  return commit.subject || `(no message) ${shortHash(commit.hash)}`;
}

export const ChangesSection = observer(function ChangesSection() {
  const { projectId } = useTaskViewContext();
  const workspaceId = useWorkspaceId();
  const taskView = useWorkspaceViewModel();
  const workspace = useWorkspace();
  const git = workspace.git;
  const diffView = taskView.diffView;
  const changesView = diffView?.changesView;

  const [source, setSource] = useState<ChangesSource>({ kind: 'commits' });

  const baseRef = workspace.repository.baseRef;
  const branchCommitsQuery = useBranchCommits(projectId, workspaceId, baseRef);
  const branchCommits = branchCommitsQuery.data ?? [];
  const branchFilesQuery = useBranchFiles(projectId, workspaceId, baseRef);
  const commitHash = source.kind === 'commit' ? source.hash : '';
  const commitFilesQuery = useCommitFiles(
    projectId,
    workspaceId,
    commitHash,
    source.kind === 'commit'
  );

  // Uncommitted (staged + unstaged) — current ChangesSection behavior, kept
  // as the data source for the "Uncommitted" option and as the working-tree
  // shadow that drives staging UI.
  const combinedChanges = useMemo<CombinedChange[]>(() => {
    const m = new Map<string, { staged?: GitChange; unstaged?: GitChange }>();
    for (const c of git.stagedFileChanges) m.set(c.path, { ...m.get(c.path), staged: c });
    for (const c of git.unstagedFileChanges) m.set(c.path, { ...m.get(c.path), unstaged: c });
    const out: CombinedChange[] = [];
    for (const { staged, unstaged } of m.values()) {
      const base = unstaged ?? staged!;
      out.push({
        path: base.path,
        status: base.status,
        additions: (staged?.additions ?? 0) + (unstaged?.additions ?? 0),
        deletions: (staged?.deletions ?? 0) + (unstaged?.deletions ?? 0),
        hasStaged: Boolean(staged),
        hasUnstaged: Boolean(unstaged),
      });
    }
    return out;
  }, [git.stagedFileChanges, git.unstagedFileChanges]);

  // The visible file list per source.
  const displayChanges: GitChange[] = useMemo(() => {
    if (source.kind === 'uncommitted') return combinedChanges;
    if (source.kind === 'commit') return commitFilesQuery.data ?? [];
    return branchFilesQuery.data ?? [];
  }, [source, combinedChanges, branchFilesQuery.data, commitFilesQuery.data]);

  const hasChanges = displayChanges.length > 0;
  const isUncommittedMode = source.kind === 'uncommitted';

  const prefetchDisk = usePrefetchDiffModels(projectId, workspaceId, 'disk', HEAD_REF);
  const prefetchStaged = usePrefetchDiffModels(projectId, workspaceId, 'staged', HEAD_REF);
  const { mode: viewMode, setMode: setViewMode } = useChangesViewMode('unstaged');
  const showConfirmActionModal = useShowModal('confirmActionModal');

  if (!diffView || !changesView) return null;

  // Active path matches whichever diff group is open.
  const activeDescriptor = taskView.tabManager.activeDescriptor;
  const activePath =
    activeDescriptor?.kind === 'diff' &&
    (activeDescriptor.diffGroup === 'disk' ||
      activeDescriptor.diffGroup === 'staged' ||
      activeDescriptor.diffGroup === 'git')
      ? activeDescriptor.path
      : undefined;

  const meta = (path: string): CombinedChange | undefined =>
    combinedChanges.find((c) => c.path === path);

  // Selection is the union of unstaged + staged selections; toggling a row
  // toggles whichever halves the file has.
  const isSelected = (path: string): boolean => {
    if (!isUncommittedMode) return false;
    const m = meta(path);
    if (!m) return false;
    return (
      (m.hasUnstaged && changesView.unstagedSelection.has(path)) ||
      (m.hasStaged && changesView.stagedSelection.has(path))
    );
  };

  const toggleSelect = (path: string): void => {
    if (!isUncommittedMode) return;
    const m = meta(path);
    if (!m) return;
    const selected = isSelected(path);
    if (selected) {
      if (m.hasUnstaged) changesView.unstagedSelection.delete(path);
      if (m.hasStaged) changesView.stagedSelection.delete(path);
    } else {
      if (m.hasUnstaged) changesView.unstagedSelection.add(path);
      if (m.hasStaged) changesView.stagedSelection.add(path);
    }
  };

  const toggleAll = (): void => {
    if (!isUncommittedMode) return;
    const total = combinedChanges.length;
    const selectedCount = combinedChanges.filter((c) => isSelected(c.path)).length;
    if (selectedCount === total) {
      changesView.clearUnstagedSelection();
      changesView.clearStagedSelection();
    } else {
      for (const c of combinedChanges) {
        if (c.hasUnstaged) changesView.unstagedSelection.add(c.path);
        if (c.hasStaged) changesView.stagedSelection.add(c.path);
      }
    }
  };

  const selectionState: 'all' | 'none' | 'partial' = (() => {
    if (!isUncommittedMode) return 'none';
    const total = combinedChanges.length;
    const selected = combinedChanges.filter((c) => isSelected(c.path)).length;
    if (total === 0 || selected === 0) return 'none';
    if (selected === total) return 'all';
    return 'partial';
  })();

  // Open a diff with refs appropriate to the current source.
  const buildActiveFile = (change: GitChange): ActiveFile | undefined => {
    if (source.kind === 'uncommitted') {
      const m = meta(change.path);
      const isStaged = m ? !m.hasUnstaged && m.hasStaged : false;
      return {
        path: change.path,
        type: isStaged ? 'git' : 'disk',
        group: isStaged ? 'staged' : 'disk',
        originalRef: commitRef('HEAD'),
      };
    }
    if (source.kind === 'commit') {
      const commit = branchCommits.find((c) => c.hash === source.hash);
      const parentSha = commit?.parents[0] ?? null;
      return {
        path: change.path,
        type: 'git',
        group: 'git',
        originalRef: commitRef(parentSha ?? `${source.hash}^`),
        modifiedRef: commitRef(source.hash),
        commitOriginalSha: parentSha,
        commitModifiedSha: source.hash,
      };
    }
    // "commits" — merge-base diff base...HEAD, committed only. Uncommitted
    // edits live in the separate Uncommitted tab.
    if (!baseRef) return undefined;
    return {
      path: change.path,
      type: 'git',
      group: 'git',
      originalRef: commitRef(baseRef),
      modifiedRef: commitRef('HEAD'),
    };
  };

  const handleSelectChange = (change: GitChange) => {
    const active = buildActiveFile(change);
    if (active) taskView.tabManager.openDiffPreview(active, change.status);
  };
  const handleDoubleClickChange = (change: GitChange) => {
    const active = buildActiveFile(change);
    if (active) taskView.tabManager.openDiff(active, change.status);
  };

  const handlePrefetch = (change: GitChange) => {
    if (!isUncommittedMode) return;
    const m = meta(change.path);
    if (m?.hasUnstaged) prefetchDisk(change.path);
    else if (m?.hasStaged) prefetchStaged(change.path);
  };

  // Staging actions — only available in Uncommitted mode.
  const handleStageSelection = () => {
    const paths = [...changesView.unstagedSelection];
    if (paths.length === 0) return;
    void git.stageFiles(paths);
    changesView.clearUnstagedSelection();
  };

  const handleUnstageSelection = () => {
    const paths = [...changesView.stagedSelection];
    if (paths.length === 0) return;
    void git.unstageFiles(paths);
    changesView.clearStagedSelection();
  };

  const handleDiscardSelection = () => {
    const paths = [...changesView.unstagedSelection];
    if (paths.length === 0) return;
    showConfirmActionModal({
      title: 'Discard Files Changes',
      variant: 'destructive',
      description:
        'Are you sure you want to discard the changes to the selected files? This can not be undone.',
      onSuccess: () => {
        void (async () => {
          await git.discardFiles(paths);
          changesView.clearUnstagedSelection();
        })();
      },
    });
  };

  const handleStageAll = () => void git.stageAllFiles();
  const handleUnstageAll = () => void git.unstageAllFiles();
  const handleDiscardAll = () => {
    showConfirmActionModal({
      title: 'Discard All Changes',
      variant: 'destructive',
      description: 'Are you sure you want to discard all changes? This can not be undone.',
      onSuccess: () => void git.discardAllFiles(),
    });
  };

  const hasUnstagedSelected = changesView.unstagedSelection.size > 0;
  const hasStagedSelected = changesView.stagedSelection.size > 0;
  const hasUnstagedAny = git.unstagedFileChanges.length > 0;
  const hasStagedAny = git.stagedFileChanges.length > 0;
  const selectedCount = combinedChanges.filter((c) => isSelected(c.path)).length;

  const commitsLabel = source.kind === 'commit' ? shortHash(source.hash) : 'Commits';
  const commitsActive = !isUncommittedMode;

  const labelSlot = (
    <div className="flex items-center gap-0.5">
      <Button
        size="xs"
        variant={isUncommittedMode ? 'secondary' : 'ghost'}
        onClick={() => setSource({ kind: 'uncommitted' })}
      >
        Uncommitted
      </Button>
      <div className="flex items-center">
        <Button
          size="xs"
          variant={commitsActive ? 'secondary' : 'ghost'}
          onClick={() => setSource({ kind: 'commits' })}
          className="rounded-r-none pr-1"
        >
          <span className="truncate">{commitsLabel}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="xs"
                variant={commitsActive ? 'secondary' : 'ghost'}
                aria-label="Pick commit"
                className="rounded-l-none px-1"
              >
                <ChevronDown className="size-3" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuItem onClick={() => setSource({ kind: 'commits' })}>
              All commits
            </DropdownMenuItem>
            {branchCommits.map((c) => (
              <DropdownMenuItem
                key={c.hash}
                onClick={() => setSource({ kind: 'commit', hash: c.hash })}
              >
                <span className="truncate">{commitLabel(c)}</span>
                <span className="ml-auto shrink-0 pl-2 font-mono text-xs text-foreground-muted">
                  {shortHash(c.hash)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const emptyStateForMode = () => {
    if (source.kind === 'uncommitted') {
      return <EmptyState label="Working tree clean" description="No uncommitted file changes." />;
    }
    if (source.kind === 'commit') {
      if (commitFilesQuery.isLoading) {
        return <EmptyState label="Loading..." description="Fetching files for this commit." />;
      }
      return <EmptyState label="No files" description="This commit changed no files." />;
    }
    if (branchCommitsQuery.isLoading || branchFilesQuery.isLoading) {
      return <EmptyState label="Loading..." description="Fetching files for this branch." />;
    }
    return <EmptyState label="No branch changes" description="This branch matches its base." />;
  };

  return (
    <>
      <SectionHeader
        label="Changes"
        count={displayChanges.length}
        labelSlot={labelSlot}
        selectionState={isUncommittedMode ? selectionState : undefined}
        onToggleAll={isUncommittedMode ? toggleAll : undefined}
        actions={<ChangesViewModeToggle value={viewMode} onChange={setViewMode} label="Changes" />}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!hasChanges && emptyStateForMode()}
        {hasChanges && isUncommittedMode && (
          <ActionCard
            selectedCount={selectedCount}
            selectionActions={
              <>
                {hasUnstagedSelected && (
                  <Button
                    variant="link"
                    size="xs"
                    onClick={handleDiscardSelection}
                    title="Discard selected files"
                    className="text-foreground-destructive"
                  >
                    <Undo2 className="size-3" />
                    Discard
                  </Button>
                )}
                {hasStagedSelected && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleUnstageSelection}
                    title="Unstage selected files"
                  >
                    <Minus className="size-3" />
                    Unstage
                  </Button>
                )}
                {hasUnstagedSelected && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleStageSelection}
                    title="Stage selected files"
                  >
                    <Plus className="size-3" />
                    Stage
                  </Button>
                )}
              </>
            }
            generalActions={
              <>
                {hasUnstagedAny && (
                  <Button
                    variant="link"
                    size="xs"
                    onClick={handleDiscardAll}
                    title="Discard all changes"
                    className="text-foreground-destructive"
                  >
                    <Undo2 className="size-3" />
                    Discard all
                  </Button>
                )}
                {hasStagedAny && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleUnstageAll}
                    title="Unstage all files"
                  >
                    <Minus className="size-3" />
                    Unstage all
                  </Button>
                )}
                {hasUnstagedAny && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleStageAll}
                    title="Stage all changes"
                  >
                    <Plus className="size-3" />
                    Stage all
                  </Button>
                )}
              </>
            }
          />
        )}
        <div className="min-h-0 flex-1 px-1">
          <ChangesListOrTree
            viewMode={viewMode}
            changes={displayChanges}
            isSelected={isUncommittedMode ? isSelected : undefined}
            onToggleSelect={isUncommittedMode ? toggleSelect : undefined}
            activePath={activePath}
            onSelectChange={handleSelectChange}
            onDoubleClickChange={handleDoubleClickChange}
            onPrefetch={handlePrefetch}
          />
        </div>
        {hasChanges && isUncommittedMode && <CommitCard autoStage={!hasStagedAny} />}
      </div>
    </>
  );
});
