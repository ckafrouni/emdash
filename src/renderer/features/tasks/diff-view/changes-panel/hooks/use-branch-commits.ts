import { useQuery } from '@tanstack/react-query';
import { rpc } from '@renderer/lib/ipc';
import { commitRef, type Commit } from '@shared/git';

const PAGE_SIZE = 200;

export const branchCommitsQueryKey = (projectId: string, workspaceId: string, baseRef: string) =>
  [projectId, workspaceId, 'branch-commits', baseRef] as const;

/**
 * Lists commits between `baseRef..HEAD` for the local task branch. We pass
 * `baseRef` (e.g. `origin/main`) as a commit-shaped GitObjectRef — `commitRef`
 * just wraps the string and git accepts any valid ref name, not only SHAs.
 *
 * Independent of PRs; uses the workspace's configured base branch directly.
 */
export function useBranchCommits(projectId: string, workspaceId: string, baseRef: string) {
  return useQuery({
    queryKey: branchCommitsQueryKey(projectId, workspaceId, baseRef),
    queryFn: async (): Promise<Commit[]> => {
      if (!baseRef) return [];
      const result = await rpc.git.getLog(
        projectId,
        workspaceId,
        PAGE_SIZE,
        0,
        undefined,
        undefined,
        commitRef(baseRef),
        undefined
      );
      if (!result.success) throw new Error('Failed to load branch commits');
      return result.data.commits;
    },
    enabled: !!baseRef,
    staleTime: 60_000,
  });
}
