import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  disabled, 
  className = '', 
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-sans font-medium rounded-[var(--radius-xs)] transition-all duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-surface-strong)] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0';
  
  const variants = {
    primary: 'bg-[var(--color-surface-strong)] text-[var(--color-text-inverse)] hover:shadow-lg hover:shadow-[var(--color-surface-strong)]/30',
    secondary: 'bg-[var(--color-surface-base)] text-[var(--color-text-tertiary)] border border-gray-200 hover:shadow-md',
    ghost: 'bg-transparent text-[var(--color-text-tertiary)] hover:bg-gray-100',
  };

  const spacing = 'px-4 py-2 text-[var(--font-size-md)]'; 

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${spacing} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
}
