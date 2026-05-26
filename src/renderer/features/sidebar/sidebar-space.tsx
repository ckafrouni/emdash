import { PanelLeft } from 'lucide-react';
import { NavButtons } from '@renderer/lib/components/nav-buttons';
import { useWorkspaceLayoutContext } from '@renderer/lib/layout/layout-provider';
import { BoundShortcut } from '@renderer/lib/ui/shortcut';
import { Toggle } from '@renderer/lib/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';

export function SidebarSpace() {
  const { isLeftOpen, setCollapsed } = useWorkspaceLayoutContext();
  return (
    <div className="h-header-row flex w-full items-center justify-end gap-2 px-2 [-webkit-app-region:drag]">
      <NavButtons />
      <Tooltip>
        <TooltipTrigger>
          <Toggle
            className="size-7 border-none bg-transparent [-webkit-app-region:no-drag] hover:bg-background-1 aria-pressed:bg-transparent aria-pressed:hover:bg-background-1 data-pressed:bg-transparent data-pressed:hover:bg-background-1"
            variant="outline"
            size="sm"
            pressed={isLeftOpen}
            onPressedChange={() => setCollapsed('left', isLeftOpen)}
          >
            <PanelLeft className="h-4 w-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          Toggle left sidebar
          <BoundShortcut settingsKey="toggleLeftSidebar" variant="badge" />
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
