import { X } from 'lucide-react';

export function TabCloseButton({
  onClose,
  ariaLabel,
  statusIndicator,
}: {
  onClose: () => void;
  ariaLabel: string;
  statusIndicator?: React.ReactNode;
}) {
  return (
    <div className="relative flex size-5 shrink-0 items-center justify-center">
      {statusIndicator}
      <button
        className="absolute inset-0 hidden items-center justify-center rounded-md text-foreground-muted group-hover:flex hover:bg-background-2"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={ariaLabel}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
