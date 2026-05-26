import { Minus, Plus, Undo2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import {
  useTaskViewContext,
  useWorkspace,
  useWorkspaceId,
  useWorkspaceViewModel,
} from '@renderer/features/tasks/task-view-context';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import { EmptyState } from '@renderer/lib/ui/empty-state';
import { commitRef, type GitChange, HEAD_REF } from '@shared/git';
import { ActionCard } from './components/action-card';
import { ChangesListOrTree } from './components/changes-list-or-tree';
import { ChangesViewModeToggle } from './components/changes-view-mode-toggle';
import { CommitCard } from './components/commit-card';
import { SectionHeader } from './components/section-header';
import { useChangesViewMode } from './hooks/use-changes-view-mode';
import { usePrefetchDiffModels } from './hooks/use-prefetch-diff-models';

/** Unified row spanning the file's staged + unstaged halves. */
interface CombinedChange extends GitChange {
  hasStaged: boolean;
  hasUnstaged: boolean;
}

export const ChangesSection = observer(function ChangesSection() {
  const { projectId } = useTaskViewContext();
  const workspaceId = useWorkspaceId();
  const taskView = useWorkspaceViewModel();
  const workspace = useWorkspace();
  const git = workspace.git;
  const diffView = taskView.diffView;
  const changesView = diffView?.changesView;

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

  const hasChanges = combinedChanges.length > 0;

  // Active path matches whichever diff group is open.
  const activeDescriptor = taskView.tabManager.activeDescriptor;
  const activePath =
    activeDescriptor?.kind === 'diff' &&
    (activeDescriptor.diffGroup === 'disk' || activeDescriptor.diffGroup === 'staged')
      ? activeDescriptor.path
      : undefined;

  const prefetchDisk = usePrefetchDiffModels(projectId, workspaceId, 'disk', HEAD_REF);
  const prefetchStaged = usePrefetchDiffModels(projectId, workspaceId, 'staged', HEAD_REF);
  const { mode: viewMode, setMode: setViewMode } = useChangesViewMode('unstaged');
  const showConfirmActionModal = useShowModal('confirmActionModal');

  if (!diffView || !changesView) return null;

  const meta = (path: string): CombinedChange | undefined =>
    combinedChanges.find((c) => c.path === path);

  // Selection is the union of unstaged + staged selections; toggling a row
  // toggles whichever halves the file has.
  const isSelected = (path: string): boolean => {
    const m = meta(path);
    if (!m) return false;
    return (
      (m.hasUnstaged && changesView.unstagedSelection.has(path)) ||
      (m.hasStaged && changesView.stagedSelection.has(path))
    );
  };

  const toggleSelect = (path: string): void => {
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
    const total = combinedChanges.length;
    const selected = combinedChanges.filter((c) => isSelected(c.path)).length;
    if (total === 0 || selected === 0) return 'none';
    if (selected === total) return 'all';
    return 'partial';
  })();

  // Prefer the unstaged half when present (working-tree diff is the more
  // common review target); fall back to the staged half otherwise.
  const handleSelectChange = (change: GitChange) => {
    const m = meta(change.path);
    const isStaged = m ? !m.hasUnstaged && m.hasStaged : false;
    taskView.tabManager.openDiffPreview(
      {
        path: change.path,
        type: isStaged ? 'git' : 'disk',
        group: isStaged ? 'staged' : 'disk',
        originalRef: commitRef('HEAD'),
      },
      change.status
    );
  };

  const handleDoubleClickChange = (change: GitChange) => {
    const m = meta(change.path);
    const isStaged = m ? !m.hasUnstaged && m.hasStaged : false;
    taskView.tabManager.openDiff(
      {
        path: change.path,
        type: isStaged ? 'git' : 'disk',
        group: isStaged ? 'staged' : 'disk',
        originalRef: commitRef('HEAD'),
      },
      change.status
    );
  };

  const handlePrefetch = (change: GitChange) => {
    const m = meta(change.path);
    if (m?.hasUnstaged) prefetchDisk(change.path);
    else if (m?.hasStaged) prefetchStaged(change.path);
  };

  // Action handlers
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

  return (
    <>
      <SectionHeader
        label="Changes"
        count={combinedChanges.length}
        selectionState={selectionState}
        onToggleAll={toggleAll}
        actions={<ChangesViewModeToggle value={viewMode} onChange={setViewMode} label="Changes" />}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!hasChanges && (
          <EmptyState label="Working tree clean" description="No uncommitted file changes." />
        )}
        {hasChanges && (
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
            changes={combinedChanges}
            isSelected={isSelected}
            onToggleSelect={toggleSelect}
            activePath={activePath}
            onSelectChange={handleSelectChange}
            onDoubleClickChange={handleDoubleClickChange}
            onPrefetch={handlePrefetch}
          />
        </div>
        {hasChanges && <CommitCard autoStage={!hasStagedAny} />}
      </div>
    </>
  );
});
