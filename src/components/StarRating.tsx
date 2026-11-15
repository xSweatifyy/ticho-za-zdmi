import { Star } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
  label?: string;
  readOnly?: boolean;
  showValue?: boolean;
  count?: number;
}

export function StarRating({
  value,
  onChange,
  size = 'md',
  label,
  readOnly = false,
  showValue = false,
  count,
}: StarRatingProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="inline-flex items-center gap-1.5">
      {label && <span className="text-xs text-muted-foreground mr-1">{label}</span>}
      <div
        className="inline-flex items-center gap-0.5"
        role={readOnly ? 'img' : 'radiogroup'}
        aria-label={label || `Hodnocení ${value.toFixed(1)} z 5`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(value);
          if (readOnly || !onChange) {
            return (
              <Star
                key={star}
                className={cn(
                  iconSize,
                  filled
                    ? 'fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400'
                    : 'fill-transparent text-stone-300 dark:text-zinc-600'
                )}
                aria-hidden="true"
              />
            );
          }
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer transition-transform hover:scale-110"
              aria-label={`${star} z 5 hvězdiček`}
              aria-checked={Math.round(value) === star}
              role="radio"
            >
              <Star
                className={cn(
                  iconSize,
                  star <= value
                    ? 'fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400'
                    : 'fill-transparent text-stone-300 dark:text-zinc-600'
                )}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-xs font-mono tabular-nums text-foreground font-medium ml-1">
          {value > 0 ? value.toFixed(1) : '—'}
          {typeof count === 'number' && count > 0 && (
            <span className="text-muted-foreground font-normal"> ({count})</span>
          )}
        </span>
      )}
    </div>
  );
}
