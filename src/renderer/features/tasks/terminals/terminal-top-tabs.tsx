import {
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
  Settings,
  Square,
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
import { BoundShortcut } from '@renderer/lib/ui/shortcut';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';

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
        'h-header-row flex shrink-0 items-stretch bg-background-2 text-xs',
        !isOpen && 'border-t border-border',
        className
      )}
    >
      {scripts.length > 0 && (
        <div className="flex shrink-0 items-stretch">
          {scripts.map((script) => (
            <LifecycleScriptTab
              key={script.data.id}
              script={script}
              isActive={activeScriptId === script.data.id}
              isOpen={isOpen}
              onSelect={() => onSelectScript(script.data.id)}
              onRun={() => onRunScript(script.data.id)}
              onStop={() => onStopScript(script.data.id)}
            />
          ))}
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
          className={cn('min-w-4 flex-1', isOpen && 'border-b border-border')}
        />
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5 px-1.5',
          isOpen && 'border-b border-border'
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
  labelClassName?: string;
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
  labelClassName,
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
        'group/tab relative flex h-full max-w-[220px] min-w-[90px] cursor-pointer items-center gap-1.5 px-2.5',
        !hideBorderRight && 'border-r border-border',
        isActive
          ? 'bg-background text-foreground'
          : cn(
              'bg-background-2 text-foreground-muted hover:bg-background-3 hover:text-foreground',
              isOpen && 'border-b border-border'
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
        <span className={cn('min-w-0 flex-1 truncate', labelClassName)}>{label}</span>
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

const LifecycleScriptTab = observer(function LifecycleScriptTab({
  script,
  isActive,
  isOpen,
  onSelect,
  onRun,
  onStop,
}: {
  script: LifecycleScriptStore;
  isActive: boolean;
  isOpen: boolean;
  onSelect: () => void;
  onRun: () => void;
  onStop: () => void;
}) {
  return (
    <TopTab
      label={script.data.label}
      labelClassName={script.isRunning ? 'text-foreground-info' : undefined}
      isActive={isActive}
      isOpen={isOpen}
      onSelect={onSelect}
      trailing={
        <Tooltip>
          <TooltipTrigger>
            <button
              aria-label={script.isRunning ? 'Stop script' : 'Run script'}
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded hover:bg-background-3',
                script.isRunning
                  ? 'text-foreground-error hover:text-foreground-error'
                  : 'text-foreground-muted hover:text-foreground'
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (script.isRunning) onStop();
                else onRun();
              }}
            >
              {script.isRunning ? (
                <Square className="size-3 fill-current" />
              ) : (
                <Play className="size-3" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>{script.isRunning ? 'Stop' : 'Run'}</TooltipContent>
        </Tooltip>
      }
    />
  );
});
