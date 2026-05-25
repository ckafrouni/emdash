import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Plus,
  Settings,
  SquareTerminal,
  X,
  type LucideIcon,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { asMounted, getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import {
  type LifecycleScriptStore,
  type LifecycleScriptsStore,
} from '@renderer/features/tasks/stores/lifecycle-scripts';
import { type TerminalTabViewStore } from '@renderer/features/tasks/terminals/terminal-tab-view-store';
import { useNavigate } from '@renderer/lib/layout/navigation-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/lib/ui/dropdown-menu';
import { BoundShortcut } from '@renderer/lib/ui/shortcut';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';
import { scriptIcon } from './terminal-tabs';

interface TerminalTopTabsProps {
  projectId: string;
  terminalTabView: TerminalTabViewStore;
  lifecycleScriptsMgr: LifecycleScriptsStore | null;
  activeTerminalId: string | undefined;
  activeScriptId: string | undefined;
  onSelectTerminal: (id: string) => void;
  onRemoveTerminal: (id: string) => void;
  onRenameTerminal: (id: string, name: string) => void;
  onHoverTerminal?: (id: string) => void;
  onSelectScript: (id: string) => void;
  onRunScript: (id: string) => void;
  onStopScript: (id: string) => void;
  onAddTerminal: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  className?: string;
}

export const TerminalTopTabs = observer(function TerminalTopTabs({
  projectId,
  terminalTabView,
  lifecycleScriptsMgr,
  activeTerminalId,
  activeScriptId,
  onSelectTerminal,
  onRemoveTerminal,
  onRenameTerminal,
  onHoverTerminal,
  onSelectScript,
  onRunScript,
  onStopScript,
  onAddTerminal,
  isOpen,
  onToggleOpen,
  className,
}: TerminalTopTabsProps) {
  const terminals = terminalTabView.tabs;
  const scripts = lifecycleScriptsMgr?.tabs ?? [];
  const { navigate } = useNavigate();
  const project = asMounted(getProjectStore(projectId));

  return (
    <div
      className={cn(
        'flex h-10 shrink-0 items-stretch bg-background-2 text-xs',
        !isOpen && 'border-t border-border-1',
        className
      )}
    >
      {scripts.length > 0 && (
        <div className="flex shrink-0 items-stretch">
          <PinnedScriptTab
            scripts={scripts}
            selectedScript={
              scripts.find((s) => s.data.id === lifecycleScriptsMgr?.activeTabId) ?? scripts[0]
            }
            isActive={
              activeScriptId !== undefined &&
              activeScriptId ===
                (scripts.find((s) => s.data.id === lifecycleScriptsMgr?.activeTabId) ?? scripts[0])
                  .data.id
            }
            isOpen={isOpen}
            onSelectScript={onSelectScript}
            onRunScript={onRunScript}
            onStopScript={onStopScript}
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {terminals.map((terminal) => {
          const isActive = activeTerminalId === terminal.data.id;
          return (
            <TopTab
              key={terminal.data.id}
              icon={SquareTerminal}
              label={`${terminal.data.name} — zsh`}
              isActive={isActive}
              isOpen={isOpen}
              onSelect={() => onSelectTerminal(terminal.data.id)}
              onHover={onHoverTerminal ? () => onHoverTerminal(terminal.data.id) : undefined}
              onRename={(name) => onRenameTerminal(terminal.data.id, name)}
              trailing={
                <Tooltip>
                  <TooltipTrigger>
                    <button
                      aria-label="Close terminal"
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded text-foreground-muted hover:bg-background-3 hover:text-foreground',
                        !isActive && 'opacity-0 group-hover/tab:opacity-100'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTerminal(terminal.data.id);
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Close terminal</TooltipContent>
                </Tooltip>
              }
            />
          );
        })}
        <div
          onDoubleClick={(e) => {
            if (e.target !== e.currentTarget) return;
            onAddTerminal();
          }}
          className={cn('min-w-4 flex-1', isOpen && 'border-b border-border-1')}
        />
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5 px-1.5',
          isOpen && 'border-b border-border-1'
        )}
      >
        <Tooltip>
          <TooltipTrigger>
            <button
              aria-label="New terminal"
              className="flex size-5 items-center justify-center rounded text-foreground-muted hover:bg-background-3 hover:text-foreground"
              onClick={onAddTerminal}
            >
              <Plus className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            New terminal <BoundShortcut settingsKey="newTerminal" variant="badge" />
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <button
              aria-label="Configure scripts"
              disabled={!project}
              className="flex size-5 items-center justify-center rounded text-foreground-muted hover:bg-background-3 hover:text-foreground disabled:opacity-50"
              onClick={() => {
                if (!project) return;
                project.view.setProjectView('settings');
                navigate('project', { projectId });
              }}
            >
              <Settings className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Configure scripts</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <button
              aria-label={isOpen ? 'Collapse terminal' : 'Expand terminal'}
              className="flex size-5 items-center justify-center rounded text-foreground-muted hover:bg-background-3 hover:text-foreground"
              onClick={onToggleOpen}
            >
              {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{isOpen ? 'Collapse' : 'Expand'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

interface TopTabProps {
  icon?: LucideIcon;
  iconNode?: ReactNode;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onSelect: () => void;
  onHover?: () => void;
  onRename?: (name: string) => void;
  trailing?: ReactNode;
  hideBorderRight?: boolean;
}

function TopTab({
  icon: Icon,
  iconNode,
  label,
  isActive,
  isOpen,
  onSelect,
  onHover,
  onRename,
  trailing,
  hideBorderRight,
}: TopTabProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      role="tab"
      aria-selected={isActive}
      onClick={onSelect}
      onMouseEnter={onHover}
      onDoubleClick={(e) => {
        if (!onRename) return;
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={cn(
        'group/tab relative flex h-full max-w-[220px] min-w-[120px] cursor-pointer items-center gap-1.5 px-3',
        !hideBorderRight && 'border-r border-border-1',
        isActive
          ? 'bg-background text-foreground'
          : cn(
              'bg-background-2 text-foreground-muted hover:bg-background-3 hover:text-foreground',
              isOpen && 'border-b border-border-1'
            )
      )}
    >
      {(Icon || iconNode) && (
        <span className="shrink-0 text-foreground-muted">
          {Icon ? <Icon className="size-3.5" /> : iconNode}
        </span>
      )}
      {isEditing && onRename ? (
        <InlineRenameInput
          initialValue={stripSuffix(label)}
          onConfirm={(name) => {
            setIsEditing(false);
            if (name && name !== stripSuffix(label)) onRename(name);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}
      {trailing}
    </div>
  );
}

function stripSuffix(label: string): string {
  const idx = label.lastIndexOf(' — ');
  return idx === -1 ? label : label.slice(0, idx);
}

function InlineRenameInput({
  initialValue,
  onConfirm,
  onCancel,
}: {
  initialValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      className="min-w-0 flex-1 rounded border border-border bg-transparent px-1 py-0.5 text-xs text-foreground outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onConfirm(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onConfirm(value);
        if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

const PinnedScriptTab = observer(function PinnedScriptTab({
  scripts,
  selectedScript,
  isActive,
  isOpen,
  onSelectScript,
  onRunScript,
  onStopScript,
}: {
  scripts: LifecycleScriptStore[];
  selectedScript: LifecycleScriptStore;
  isActive: boolean;
  isOpen: boolean;
  onSelectScript: (id: string) => void;
  onRunScript: (id: string) => void;
  onStopScript: (id: string) => void;
}) {
  return (
    <>
      <TopTab
        label={selectedScript.data.label}
        isActive={isActive}
        isOpen={isOpen}
        onSelect={() => onSelectScript(selectedScript.data.id)}
        hideBorderRight={scripts.length > 1}
        trailing={
          <Tooltip>
            <TooltipTrigger>
              <button
                aria-label={selectedScript.isRunning ? 'Stop script' : 'Run script'}
                className="flex size-4 shrink-0 items-center justify-center rounded text-foreground-muted hover:bg-background-3 hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedScript.isRunning) {
                    onStopScript(selectedScript.data.id);
                  } else {
                    onRunScript(selectedScript.data.id);
                  }
                }}
              >
                {selectedScript.isRunning ? (
                  <Pause className="size-3" />
                ) : (
                  <Play className="size-3" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{selectedScript.isRunning ? 'Stop' : 'Run'}</TooltipContent>
          </Tooltip>
        }
      />
      {scripts.length > 1 && (
        <ScriptSwitcher
          scripts={scripts}
          isActive={isActive}
          isOpen={isOpen}
          onSelectScript={onSelectScript}
        />
      )}
    </>
  );
});

function ScriptSwitcher({
  scripts,
  isActive,
  isOpen,
  onSelectScript,
}: {
  scripts: LifecycleScriptStore[];
  isActive: boolean;
  isOpen: boolean;
  onSelectScript: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex h-full items-center border-r border-border-1 px-1',
        isActive ? 'bg-background' : cn('bg-background-2', isOpen && 'border-b border-border-1')
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              aria-label="Switch script"
              className="flex size-5 items-center justify-center rounded text-foreground-muted hover:bg-background-3 hover:text-foreground data-popup-open:bg-background-3 data-popup-open:text-foreground"
            />
          }
        >
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {scripts.map((s) => (
            <DropdownMenuItem key={s.data.id} onClick={() => onSelectScript(s.data.id)}>
              <span className="flex items-center gap-2">
                <span className="text-foreground-muted">{scriptIcon(s.data.type)}</span>
                <span>{s.data.label}</span>
                {s.isRunning && <span className="text-xs text-foreground-muted">(running)</span>}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
