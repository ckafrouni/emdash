import { useHotkey } from '@tanstack/react-hotkeys';
import { Columns2, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { getProjectSshConnectionId } from '@renderer/features/projects/stores/project-selectors';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { useAgentAutoApproveDefaults } from '@renderer/features/tasks/hooks/useAgentAutoApproveDefaults';
import { conversationRegistry } from '@renderer/features/tasks/stores/conversation-registry';
import AgentLogo from '@renderer/lib/components/agent-logo';
import { useAgentAvailability } from '@renderer/lib/components/agent-selector/use-agent-availability';
import {
  getEffectiveHotkey,
  getHotkeyRegistration,
} from '@renderer/lib/hooks/useKeyboardShortcuts';
import { Button } from '@renderer/lib/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/lib/ui/dropdown-menu';
import { BoundShortcut } from '@renderer/lib/ui/shortcut';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { agentConfig } from '@renderer/utils/agentConfig';
import type { AgentProviderId } from '@shared/agent-provider-registry';
import { nextDefaultConversationTitle } from '../../conversations/conversation-title-utils';
import { useTabGroupContext } from '../../tabs/tab-group-context';
import { useTaskViewContext, useWorkspaceViewModel } from '../../task-view-context';

interface TabBarActionsProps {
  newConversationOpen: boolean;
  onNewConversationOpenChange: (open: boolean) => void;
}

export const TabBarActions = observer(function TabBarActions({
  newConversationOpen,
  onNewConversationOpenChange,
}: TabBarActionsProps) {
  const taskView = useWorkspaceViewModel();
  const { projectId, taskId } = useTaskViewContext();
  const { groupId, tabManager } = useTabGroupContext();
  const { tabGroupManager } = taskView;

  const connectionId = getProjectSshConnectionId(projectId);
  const { groups } = useAgentAvailability({ connectionId, value: null });
  const installedAgents =
    groups.find((g) => g.value === 'installed')?.items.filter((item) => !item.disabled) ?? [];
  const conversationMgr = conversationRegistry.get(taskId);
  const autoApproveDefaults = useAgentAutoApproveDefaults();

  const isFocusedPane =
    taskView.focusedRegion === 'main' && tabGroupManager.activeGroupId === groupId;
  const { value: keyboard } = useAppSettingsKey('keyboard');
  const canSplit = tabManager.resolvedTabs.length >= 2 && tabGroupManager.groups.length < 3;

  useHotkey(
    getHotkeyRegistration('splitPane', keyboard),
    (e) => {
      e.preventDefault();
      tabGroupManager.splitRight();
    },
    {
      enabled: isFocusedPane && canSplit && getEffectiveHotkey('splitPane', keyboard) !== null,
      conflictBehavior: 'allow',
    }
  );

  const handleSelectAgent = useCallback(
    async (agentId: AgentProviderId) => {
      if (!conversationMgr) return;
      const id = crypto.randomUUID();
      const title = nextDefaultConversationTitle(
        agentId,
        Array.from(conversationMgr.conversations.values(), (c) => c.data)
      );
      try {
        await conversationMgr.createConversation({
          projectId,
          taskId,
          id,
          autoApprove: autoApproveDefaults.getDefault(agentId),
          provider: agentId,
          title,
        });
        tabManager.openConversation(id);
      } finally {
        onNewConversationOpenChange(false);
      }
    },
    [
      autoApproveDefaults,
      conversationMgr,
      onNewConversationOpenChange,
      projectId,
      tabManager,
      taskId,
    ]
  );

  return (
    <div className="flex h-full shrink-0 items-center border-b border-border px-2">
      <DropdownMenu open={newConversationOpen} onOpenChange={onNewConversationOpenChange}>
        <Tooltip>
          <DropdownMenuTrigger
            render={
              <TooltipTrigger
                render={
                  <Button size="icon-sm" variant="ghost" aria-label="New conversation">
                    <Plus className="size-3.5" />
                  </Button>
                }
              />
            }
          />
          <TooltipContent>
            New Conversation <BoundShortcut settingsKey="newConversation" variant="badge" />
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-44">
          {installedAgents.map((item) => {
            const config = agentConfig[item.agentId];
            return (
              <DropdownMenuItem
                key={item.value}
                onClick={() => void handleSelectAgent(item.agentId)}
              >
                {config && (
                  <AgentLogo
                    logo={config.logo}
                    alt={config.alt}
                    isSvg={config.isSvg}
                    invertInDark={config.invertInDark}
                    className="size-4 rounded-sm"
                  />
                )}
                <span>{item.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {tabGroupManager.groups.length < 3 && (
        <Tooltip>
          <TooltipTrigger>
            <span>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={!canSplit}
                onClick={() => tabGroupManager.splitRight()}
                aria-label="Split pane right"
              >
                <Columns2 className="size-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {canSplit ? (
              <span className="flex items-center gap-2">
                Move active tab to a new pane
                <BoundShortcut settingsKey="splitPane" variant="badge" />
              </span>
            ) : (
              'Open at least 2 tabs to split this pane'
            )}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});
