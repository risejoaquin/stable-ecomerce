import React from 'react';

type UixCardProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: 'default' | 'warm' | 'dark' | 'sage';
};

export function UixCard({ tone = 'default', className = '', children, ...props }: UixCardProps) {
  return (
    <div className={`uix-card uix-card--${tone} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
