import { createContext, useContext, useState, type ReactNode, type RefObject } from 'react';
import { useDefaultLayout, usePanelRef, type PanelImperativeHandle } from 'react-resizable-panels';
import { useWorkspaceLayoutContext } from '@renderer/lib/layout/layout-provider';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@renderer/lib/ui/resizable';
import { cn } from '@renderer/utils/utils';

type RightSidebarPanelRef = RefObject<PanelImperativeHandle | null>;
const RightSidebarPanelContext = createContext<RightSidebarPanelRef | null>(null);
/** Returns the imperative handle for the workspace right-sidebar panel. */
export function useRightSidebarPanelRef(): RightSidebarPanelRef | null {
  return useContext(RightSidebarPanelContext);
}

const LEFT_PANEL_DEFAULT_SIZE = '20%';
const LEFT_SIDEBAR_MIN_SIZE = '200px';
const LEFT_SIDEBAR_MAX_SIZE = '30%';
const MAIN_PANEL_MIN_SIZE = '30%';

interface WorkspaceLayoutProps {
  leftSidebar: ReactNode;
  mainContent: ReactNode;
}

export function WorkspaceLayout({ leftSidebar, mainContent }: WorkspaceLayoutProps) {
  const { leftPanelRef, handleDragging, setIsLeftOpen, isLeftOpen } = useWorkspaceLayoutContext();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'workspace-outer',
    storage: localStorage,
  });

  return (
    <ResizablePanelGroup
      id="workspace-outer"
      orientation="horizontal"
      className="h-full w-full overflow-hidden"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    >
      <ResizablePanel
        id="workspace-left"
        panelRef={leftPanelRef}
        defaultSize={LEFT_PANEL_DEFAULT_SIZE}
        minSize={LEFT_SIDEBAR_MIN_SIZE}
        maxSize={LEFT_SIDEBAR_MAX_SIZE}
        collapsedSize="0%"
        onResize={() => setIsLeftOpen(!leftPanelRef.current?.isCollapsed())}
        collapsible
      >
        {leftSidebar}
      </ResizablePanel>
      <ResizableHandle
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handleDragging('left', true);
        }}
        onPointerUp={() => handleDragging('left', false)}
        onPointerCancel={() => handleDragging('left', false)}
        className={cn(
          'items-center justify-center transition-colors hover:bg-border/80',
          isLeftOpen ? 'flex' : 'hidden'
        )}
      />
      <ResizablePanel id="workspace-main" minSize={MAIN_PANEL_MIN_SIZE}>
        {mainContent}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

interface WorkspaceContentLayoutProps {
  titlebarSlot: ReactNode;
  mainPanel: ReactNode;
  rightSidebar?: ReactNode;
}

export function WorkspaceContentLayout({
  titlebarSlot,
  mainPanel,
  rightSidebar,
}: WorkspaceContentLayoutProps) {
  const rightSidebarPanelRef = usePanelRef();
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  const mainColumn = (
    <div className="flex h-full flex-col overflow-hidden">
      {titlebarSlot}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden">{mainPanel}</div>
      </div>
    </div>
  );

  if (!rightSidebar) {
    return <div className="h-full bg-background text-foreground">{mainColumn}</div>;
  }

  return (
    <RightSidebarPanelContext.Provider value={rightSidebarPanelRef}>
      <ResizablePanelGroup
        id="workspace-content"
        orientation="horizontal"
        className="h-full w-full bg-background text-foreground"
      >
        <ResizablePanel id="workspace-content-main" minSize="30%">
          {mainColumn}
        </ResizablePanel>
        <ResizableHandle
          className={cn(
            'items-center justify-center transition-colors hover:bg-border/80',
            isRightSidebarCollapsed && 'hidden'
          )}
        />
        <ResizablePanel
          id="workspace-content-right"
          panelRef={rightSidebarPanelRef}
          defaultSize="40%"
          minSize="280px"
          maxSize="50%"
          collapsible
          collapsedSize="0%"
          onResize={() =>
            setIsRightSidebarCollapsed(rightSidebarPanelRef.current?.isCollapsed() ?? false)
          }
        >
          {rightSidebar}
        </ResizablePanel>
      </ResizablePanelGroup>
    </RightSidebarPanelContext.Provider>
  );
}
