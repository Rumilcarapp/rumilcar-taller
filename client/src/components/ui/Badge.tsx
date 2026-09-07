import React from 'react';
import './Badge.css';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';
  size?: 'sm' | 'md';
  dot?: boolean;
  outline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  outline = false,
  className = '',
  style
}) => {
  return (
    <span className={`badge badge-${variant} badge-${size} ${outline ? 'badge-outline' : ''} ${className}`} style={style}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
};