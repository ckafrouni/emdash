import { useLayoutEffect, useState } from 'react';
import { usePanelRef } from 'react-resizable-panels';
import type {
  ChangesViewStore,
  ExpandedSections,
} from '@renderer/features/tasks/diff-view/stores/changes-view-store';
import { HEADER_ROW_HEIGHT_CSS } from '@renderer/lib/ui/layout-constants';

const DEFAULT_EXPANDED: ExpandedSections = { unstaged: true, staged: true, pullRequests: true };

export const SECTION_HEADER_HEIGHT = HEADER_ROW_HEIGHT_CSS;

type UsePanelLayoutReturn = {
  expanded: ExpandedSections;
  toggleExpanded: (section: keyof ExpandedSections) => void;
  setExpanded: (next: ExpandedSections | ((prev: ExpandedSections) => ExpandedSections)) => void;
  panelTransitionClass: string | false;
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
  prRef: ReturnType<typeof usePanelRef>;
};

/**
 * Lightweight panel-layout hook for the changes sidebar. Only the PR section
 * is collapsible now; the changes section above it is non-collapsible and
 * takes the remaining space.
 */
export function usePanelLayout(changesView: ChangesViewStore | null): UsePanelLayoutReturn {
  const prRef = usePanelRef();
  const [isDragging, setIsDragging] = useState(false);

  const panelTransitionClass = !isDragging && '[transition:flex-basis_200ms_ease-in-out]';
  const pointerHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
    },
    onPointerUp: () => setIsDragging(false),
    onPointerCancel: () => setIsDragging(false),
  };

  const expanded = changesView?.expandedSections ?? DEFAULT_EXPANDED;

  useLayoutEffect(() => {
    if (expanded.pullRequests) {
      prRef.current?.expand();
    } else {
      prRef.current?.collapse();
    }
  }, [expanded.pullRequests, prRef]);

  return {
    expanded,
    toggleExpanded: (section) => changesView?.toggleExpanded(section),
    setExpanded: (next) => changesView?.setExpanded(next),
    panelTransitionClass,
    pointerHandlers,
    prRef,
  };
}
