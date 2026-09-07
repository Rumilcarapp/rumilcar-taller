import React from 'react';
import { Button } from './Button';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon, title, description, actionLabel, onAction, action
}) => {
  const finalLabel = action?.label || actionLabel;
  const finalOnClick = action?.onClick || onAction;

  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {finalLabel && finalOnClick && (
        <Button variant="primary" onClick={finalOnClick} className="empty-state-action">
          {finalLabel}
        </Button>
      )}
    </div>
  );
};