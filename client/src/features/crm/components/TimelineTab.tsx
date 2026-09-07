import React from 'react';
import { Card } from '../../../components/ui';
import { useCRMStore } from '../../../store/useCRMStore';

export const TimelineTab: React.FC = () => {
  const { interactions } = useCRMStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Historial Completo de Interacciones y Recontactos</h3>
      </div>

      <Card>
        {interactions.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No se han registrado interacciones aún.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {interactions.map((int) => (
              <div key={int.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-subtle, rgba(0,0,0,0.02))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{int.clientName || 'Cliente'}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', fontWeight: 600 }}>
                      {int.type}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{int.summary}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {new Date(int.date).toLocaleDateString()} {new Date(int.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {int.details && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '6px 0 0 0' }}>
                    {int.details}
                  </p>
                )}

                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Registrado por: <strong>{int.user}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
