import { observer } from 'mobx-react-lite';
import { useWorkspace, useWorkspaceViewModel } from '@renderer/features/tasks/task-view-context';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@renderer/lib/ui/resizable';
import { cn } from '@renderer/utils/utils';
import { ChangesSection } from './changes-section';
import { SECTION_HEADER_HEIGHT, usePanelLayout } from './hooks/use-panel-layout';
import { PullRequestsSection } from './pr-section';

export const ChangesPanel = observer(function ChangesPanel() {
  const taskView = useWorkspaceViewModel();
  const workspace = useWorkspace();
  const diffView = taskView.diffView;
  const changesView = diffView?.changesView;

  const { expanded, toggleExpanded, panelTransitionClass, pointerHandlers, prRef } = usePanelLayout(
    changesView ?? null
  );

  if (!diffView || !changesView || !workspace.git.hasData) return null;

  return (
    <div className="flex h-full flex-col">
      <ResizablePanelGroup
        orientation="vertical"
        className="min-h-0 flex-1"
        id="changes-panel-group"
        disableCursor
      >
        <ResizablePanel
          id="changes-all"
          minSize="200px"
          defaultSize="70%"
          className="flex flex-col overflow-hidden"
        >
          <ChangesSection />
        </ResizablePanel>
        <ResizableHandle
          disabled={!expanded.pullRequests}
          className={cn(!expanded.pullRequests && 'hidden')}
          {...pointerHandlers}
        />
        <ResizablePanel
          id="changes-pr"
          panelRef={prRef}
          collapsible
          collapsedSize={SECTION_HEADER_HEIGHT}
          minSize="150px"
          maxSize="60%"
          defaultSize="30%"
          className={`flex flex-col overflow-hidden ${panelTransitionClass || ''}`}
        >
          <PullRequestsSection
            onToggleCollapsed={() => toggleExpanded('pullRequests')}
            collapsed={!expanded.pullRequests}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
});
