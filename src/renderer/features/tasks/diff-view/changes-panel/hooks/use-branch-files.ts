import { useQuery } from '@tanstack/react-query';
import { rpc } from '@renderer/lib/ipc';
import { commitRef, type GitChange } from '@shared/git';

export const branchFilesQueryKey = (projectId: string, workspaceId: string, baseRef: string) =>
  [projectId, workspaceId, 'branch-files', baseRef] as const;

/**
 * Files differing between the branch base and the workspace's working tree
 * (`git diff <baseRef>`). Includes every commit on the branch on top of any
 * uncommitted edits — used as the "All" source in the changes view.
 *
 * Note: this is *not* a merge-base diff. `git diff <baseRef>` compares the
 * base's tree against the working directory, which is the union we want.
 */
export function useBranchFiles(projectId: string, workspaceId: string, baseRef: string) {
  return useQuery({
    queryKey: branchFilesQueryKey(projectId, workspaceId, baseRef),
    queryFn: async (): Promise<GitChange[]> => {
      if (!baseRef) return [];
      const result = await rpc.git.getChangedFiles(projectId, workspaceId, commitRef(baseRef));
      if (!result.success) throw new Error('Failed to load branch files');
      return result.data.changes;
    },
    enabled: !!baseRef,
    staleTime: 60_000,
  });
}
