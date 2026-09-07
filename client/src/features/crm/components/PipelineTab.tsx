import React, { useState } from 'react';
import { Button } from '../../../components/ui';
import { useCRMStore, CRMOpportunity, PipelineStage } from '../../../store/useCRMStore';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

interface PipelineTabProps {
  onNewOpportunity: () => void;
  onEditOpportunity: (opp: CRMOpportunity) => void;
}

export const PipelineTab: React.FC<PipelineTabProps> = ({ onNewOpportunity, onEditOpportunity }) => {
  const { opportunities, updateOpportunityStage, deleteOpportunity } = useCRMStore();
  const [pipelineSearch, setPipelineSearch] = useState('');

  const PIPELINE_COLUMNS: { stage: PipelineStage; title: string; color: string }[] = [
    { stage: 'POR_CONTACTAR', title: 'Por Contactar', color: '#64748b' },
    { stage: 'CONTACTADO', title: 'Contactado', color: '#3b82f6' },
    { stage: 'NEGOCIACION', title: 'En Negociación', color: '#f59e0b' },
    { stage: 'AGENDADO', title: 'Cita Agendada', color: '#8b5cf6' },
    { stage: 'COMPLETADO', title: 'Servicio Concretado', color: '#10b981' },
    { stage: 'PERDIDO', title: 'No Interesado', color: '#ef4444' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar oportunidad o cliente..."
            value={pipelineSearch}
            onChange={(e) => setPipelineSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onNewOpportunity}
          icon={<Plus size={14} />}
        >
          Nueva Oportunidad
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'start', overflowX: 'auto', paddingBottom: '16px' }}>
        {PIPELINE_COLUMNS.map((col) => {
          const colOpportunities = opportunities
            .filter((o) => o.stage === col.stage)
            .filter((o) =>
              o.title.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
              o.clientName.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
              (o.vehiclePlate && o.vehiclePlate.toLowerCase().includes(pipelineSearch.toLowerCase()))
            );

          const stageTotal = colOpportunities.reduce((acc, o) => acc + (o.estimatedValueUSD || 0), 0);

          return (
            <div
              key={col.stage}
              style={{
                background: 'var(--color-bg-subtle, rgba(0,0,0,0.02))',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                padding: '12px',
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid ' + col.color, paddingBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: col.color }}>{col.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{colOpportunities.length} ops • ${stageTotal.toFixed(0)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {colOpportunities.length === 0 ? (
                  <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                    Sin oportunidades
                  </div>
                ) : (
                  colOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      style={{
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: '10px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', lineHeight: '1.2' }}>{opp.title}</span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 5px',
                          borderRadius: '4px',
                          background: opp.priority === 'ALTA' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: opp.priority === 'ALTA' ? '#ef4444' : '#3b82f6'
                        }}>
                          {opp.priority}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        👤 {opp.clientName}
                      </div>

                      {opp.vehiclePlate && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          🚗 {opp.vehicleModel || 'Auto'} ({opp.vehiclePlate})
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-primary)' }}>
                          ${opp.estimatedValueUSD.toFixed(2)} USD
                        </span>

                        <select
                          value={opp.stage}
                          onChange={(e) => updateOpportunityStage(opp.id, e.target.value as PipelineStage)}
                          style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}
                        >
                          <option value="POR_CONTACTAR">Por Contactar</option>
                          <option value="CONTACTADO">Contactado</option>
                          <option value="NEGOCIACION">Negociación</option>
                          <option value="AGENDADO">Agendado</option>
                          <option value="COMPLETADO">Completado</option>
                          <option value="PERDIDO">Perdido</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', borderTop: '1px solid var(--color-border)', paddingTop: '6px', marginTop: '2px' }}>
                        <button
                          type="button"
                          onClick={() => onEditOpportunity(opp)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px' }}
                          title="Editar Oportunidad"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('¿Eliminar esta oportunidad?')) deleteOpportunity(opp.id);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
