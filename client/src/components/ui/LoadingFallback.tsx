import React from 'react';
import { Wrench } from 'lucide-react';

interface LoadingFallbackProps {
  message?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message = 'Cargando módulo...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        padding: '2rem',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0.05) 100%)',
          border: '2px solid rgba(37,99,235,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'rumilcar-pulse 1.8s infinite ease-in-out',
        }}
      >
        <Wrench
          size={24}
          color="#3b82f6"
          style={{
            animation: 'rumilcar-spin 2.5s infinite linear',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--color-text-secondary, #94a3b8)',
          letterSpacing: '0.02em',
        }}
      >
        {message}
      </span>
      <style>{`
        @keyframes rumilcar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rumilcar-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
