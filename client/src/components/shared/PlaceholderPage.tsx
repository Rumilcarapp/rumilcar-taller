import React from 'react';
import { EmptyState } from '../ui';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  return (
    <div className="page-enter">
      <EmptyState
        icon={<Construction size={36} />}
        title={title}
        description={description || 'Este modulo esta en desarrollo. Estara disponible pronto.'}
      />
    </div>
  );
};