import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hideLabel, className = '', id, ...props }, ref) => {
    // Generate a unique ID if none is provided
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const errorId = `${inputId}-error`;

    return (
      <div className={`w-full flex flex-col gap-[var(--spacing-2)] ${className}`}>
        <label 
          htmlFor={inputId} 
          className={`font-medium text-[var(--font-size-md)] text-[var(--color-text-tertiary)] ${hideLabel ? 'sr-only' : ''}`}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-[var(--spacing-5)] py-[var(--spacing-4)] bg-[var(--color-surface-base)] text-[var(--color-text-primary)] 
            border rounded-[var(--radius-xs)] shadow-sm transition-all duration-200
            ${error ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'}
            focus:outline-none focus:border-[var(--color-surface-strong)] focus:ring-4 focus:ring-[var(--color-surface-strong)]/20
            disabled:opacity-50 disabled:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed
          `}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {error && (
          <span id={errorId} className="text-[var(--font-size-sm)] text-red-500 mt-1" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
