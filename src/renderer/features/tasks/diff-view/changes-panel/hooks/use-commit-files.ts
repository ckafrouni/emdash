import { useQuery } from '@tanstack/react-query';
import { rpc } from '@renderer/lib/ipc';
import type { GitChange } from '@shared/git';

export const commitFilesQueryKey = (projectId: string, workspaceId: string, commitHash: string) =>
  [projectId, workspaceId, 'commit-files', commitHash] as const;

/**
 * Files changed by a single commit (`git diff-tree --first-parent <hash>`).
 * Used when the user picks a specific commit in the changes source dropdown.
 */
export function useCommitFiles(
  projectId: string,
  workspaceId: string,
  commitHash: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: commitFilesQueryKey(projectId, workspaceId, commitHash),
    queryFn: async (): Promise<GitChange[]> => {
      const result = await rpc.git.getCommitFiles(projectId, workspaceId, commitHash);
      if (!result.success) throw new Error('Failed to load commit files');
      return result.data.files;
    },
    enabled,
    staleTime: 60_000,
  });
}
