import React from 'react';
import './Card.css';

export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'stats' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  style,
}) => {
  return (
    <div className={`card card-${variant} card-pad-${padding} ${className}`} style={style}>
      {(title || action) && (
        <div className="card-header">
          <div className="card-header-text">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
};

/* Stats Card */
export interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: { value: number; positive: boolean };
  color?: string;
  style?: React.CSSProperties;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label, value, icon, change, color, style
}) => {
  return (
    <div 
      className="card card-stats" 
      style={{
        ...(color ? { borderTopColor: color } : {}),
        ...style
      }}
    >
      <div className="stats-header">
        <span className="stats-label">{label}</span>
        {icon && <span className="stats-icon" style={color ? { color } : undefined}>{icon}</span>}
      </div>
      <div className="stats-value">{value}</div>
      {change && (
        <div className={`stats-change ${change.positive ? 'positive' : 'negative'}`}>
          {change.positive ? '+' : ''}{change.value}% vs ayer
        </div>
      )}
    </div>
  );
};