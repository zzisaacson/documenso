import * as React from 'react';

import { cn } from '../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /**
   * Optional function that returns the border class(es) to apply (e.g. "border-amber-400").
   * Called on each render so the border can change based on external variables.
   */
  getBorderClassName?: () => string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, getBorderClassName, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const hasCustomBorder = Boolean(getBorderClassName);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <input
        {...props}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          // Default focus ring only when not using custom border
          !hasCustomBorder &&
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // When using custom border, only override border color on focus (single border)
          hasCustomBorder && isFocused && getBorderClassName?.(),
          className,
          {
            'ring-2 !ring-red-500 transition-all': props['aria-invalid'],
          },
        )}
        ref={ref}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );
  },
);

Input.displayName = 'Input';

export { Input };
