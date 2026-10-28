import type { HTMLAttributes, ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warning';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span {...props} className={`wd-badge wd-badge--${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}
