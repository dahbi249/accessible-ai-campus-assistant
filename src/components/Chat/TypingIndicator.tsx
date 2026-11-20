interface TypingIndicatorProps {
  label: string;
  compact?: boolean;
  announceRole?: boolean;
}

export function TypingIndicator({
  label,
  compact = false,
  announceRole = false,
}: TypingIndicatorProps) {
  return (
    <div
      data-testid="ai-typing-indicator"
      role={announceRole ? 'status' : undefined}
      aria-label={label}
      className={`inline-flex items-center gap-2.5 text-neutral-300 ${
        compact ? 'text-xs pt-2.5 mt-2.5 border-t border-neutral-800/80 w-full' : 'text-sm'
      }`}
    >
      <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 typing-dot" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 typing-dot typing-dot-delay-1" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 typing-dot typing-dot-delay-2" />
      </span>
      <span className={compact ? 'text-xs text-neutral-400' : 'text-sm text-neutral-300'}>
        {label}
      </span>
    </div>
  );
}
