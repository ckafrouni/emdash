import { useQuery } from '@tanstack/react-query';
import { rpc } from '@renderer/lib/ipc';
import { commitRef, mergeBaseRange, type GitChange } from '@shared/git';

export const branchFilesQueryKey = (projectId: string, workspaceId: string, baseRef: string) =>
  [projectId, workspaceId, 'branch-files', baseRef] as const;

/**
 * Files changed across the local task branch (`base...HEAD` merge-base diff).
 * Committed-only — uncommitted edits live in the separate Uncommitted source.
 */
export function useBranchFiles(projectId: string, workspaceId: string, baseRef: string) {
  return useQuery({
    queryKey: branchFilesQueryKey(projectId, workspaceId, baseRef),
    queryFn: async (): Promise<GitChange[]> => {
      if (!baseRef) return [];
      const result = await rpc.git.getChangedFiles(
        projectId,
        workspaceId,
        mergeBaseRange(commitRef(baseRef), commitRef('HEAD'))
      );
      if (!result.success) throw new Error('Failed to load branch files');
      return result.data.changes;
    },
    enabled: !!baseRef,
    staleTime: 60_000,
  });
}
