import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div 
      className={`bg-[var(--color-surface-base)] rounded-[var(--radius-lg)] p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.1),0_30px_60px_-30px_rgba(0,0,0,0.1)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
