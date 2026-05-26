import { ChevronDown } from 'lucide-react';
import { type ReactNode } from 'react';
import { type SelectionState } from '@renderer/features/tasks/diff-view/stores/changes-view-store';
import { Badge } from '@renderer/lib/ui/badge';
import { Checkbox } from '@renderer/lib/ui/checkbox';
import { cn } from '@renderer/utils/utils';

interface SectionHeaderProps {
  label: string;
  count: number;
  /**
   * When provided, replaces the default `label + count` rendering. The chevron
   * stays as its own toggle button on the left so that the slot can host
   * interactive controls (e.g. a Select) without swallowing clicks meant for
   * the collapse-toggle.
   */
  labelSlot?: ReactNode;
  selectionState?: SelectionState;
  onToggleAll?: () => void;
  actions?: ReactNode;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function SectionHeader({
  label,
  count,
  labelSlot,
  selectionState,
  onToggleAll,
  actions,
  collapsed,
  onToggleCollapsed,
}: SectionHeaderProps) {
  const showCheckbox = selectionState !== undefined && onToggleAll !== undefined;
  const isCollapsible = onToggleCollapsed !== undefined;

  const chevron = isCollapsible && (
    <span className="text-foreground-muted hover:text-foreground">
      <ChevronDown
        className={cn(
          'size-4 transition-transform duration-200 ease-in-out',
          collapsed ? 'rotate-180' : 'rotate-0'
        )}
      />
    </span>
  );

  return (
    <div
      className={cn(
        'h-header-row flex shrink-0 items-center justify-between gap-2 px-3.5',
        collapsed && 'border-t border-border'
      )}
    >
      {labelSlot ? (
        <div className="flex min-w-0 items-center gap-2">
          {isCollapsible && (
            <button
              onClick={onToggleCollapsed}
              aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
              className="flex shrink-0 items-center"
            >
              {chevron}
            </button>
          )}
          <div className="min-w-0 flex-1">{labelSlot}</div>
        </div>
      ) : isCollapsible ? (
        <button onClick={onToggleCollapsed} className="min-w-0">
          <span className="flex min-w-0 items-center gap-2 text-sm text-foreground-muted">
            {chevron}
            <span className="truncate">{label}</span>{' '}
            <Badge variant="secondary" className="shrink-0">
              {count}
            </Badge>
          </span>
        </button>
      ) : (
        <div className="min-w-0">
          <span className="flex min-w-0 items-center gap-2 text-sm text-foreground-muted">
            <span className="truncate">{label}</span>{' '}
            <Badge variant="secondary" className="shrink-0">
              {count}
            </Badge>
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        {actions}
        {showCheckbox && (
          <Checkbox
            checked={selectionState === 'all'}
            indeterminate={selectionState === 'partial'}
            onCheckedChange={onToggleAll}
            aria-label={`Select all ${label.toLowerCase()}`}
            className="mr-0.5"
          />
        )}
      </div>
    </div>
  );
}
