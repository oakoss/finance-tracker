import { cva, type VariantProps } from 'class-variance-authority';
import { useState } from 'react';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const ratingVariants = cva('flex items-center', {
  variants: {
    size: {
      default: 'gap-2.5',
      lg: 'gap-3',
      sm: 'gap-2',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const starVariants = cva('', {
  variants: {
    size: {
      default: 'size-5',
      lg: 'size-6',
      sm: 'size-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const valueVariants = cva('text-muted-foreground w-5', {
  variants: {
    size: {
      default: 'text-sm',
      lg: 'text-base',
      sm: 'text-xs',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

function Rating({
  rating,
  maxRating = 5,
  size,
  className,
  starClassName,
  showValue = false,
  editable = false,
  onRatingChange,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof ratingVariants> & {
    /**
     * Current rating value (supports decimal values for partial stars)
     */
    rating: number;
    /**
     * Maximum rating value (number of stars to show)
     */
    maxRating?: number;
    /**
     * Whether to show the numeric rating value
     */
    showValue?: boolean;
    /**
     * Class name for the value span
     */
    starClassName?: string;
    /**
     * Whether the rating is editable (clickable)
     */
    editable?: boolean;
    /**
     * Callback function called when rating changes
     */
    onRatingChange?: (rating: number) => void;
  }) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const displayRating =
    editable && hoveredRating !== null ? hoveredRating : rating;

  function handleStarClick(starRating: number) {
    if (editable && onRatingChange) {
      onRatingChange(starRating);
    }
  }

  function handleStarMouseEnter(starRating: number) {
    if (editable) {
      setHoveredRating(starRating);
    }
  }

  function handleStarMouseLeave() {
    if (editable) {
      setHoveredRating(null);
    }
  }

  function renderStars() {
    const stars = [];

    for (let i = 1; i <= maxRating; i++) {
      const filled = displayRating >= i;
      const partiallyFilled = displayRating > i - 1 && displayRating < i;
      const fillPercentage = partiallyFilled
        ? (displayRating - (i - 1)) * 100
        : 0;

      stars.push(
        <button
          key={i}
          aria-label={`Rate ${i} of ${maxRating}`}
          className={cn('relative', editable && 'cursor-pointer')}
          disabled={!editable}
          type="button"
          onClick={() => handleStarClick(i)}
          onMouseEnter={() => handleStarMouseEnter(i)}
          onMouseLeave={handleStarMouseLeave}
        >
          <Icons.Star
            className={cn(starVariants({ size }), 'text-muted-foreground/30')}
            data-slot="rating-star-empty"
          />

          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              width: filled ? '100%' : `${fillPercentage}%`,
            }}
          >
            <Icons.Star
              className={cn(
                starVariants({ size }),
                'fill-yellow-400 text-yellow-400',
              )}
              data-slot="rating-star-filled"
            />
          </div>
        </button>,
      );
    }

    return stars;
  }

  return (
    <div
      className={cn(ratingVariants({ size }), className)}
      data-slot="rating"
      {...props}
    >
      <div className="flex items-center">{renderStars()}</div>
      {showValue ? (
        <span
          className={cn(valueVariants({ size }), starClassName)}
          data-slot="rating-value"
        >
          {displayRating.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}

export { Rating };
