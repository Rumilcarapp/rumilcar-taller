import React from 'react';
import { Card, Button } from '../../../components/ui';
import { Zap, UserCheck, AlertCircle, Eye } from 'lucide-react';

interface SegmentationTabProps {
  clientMetrics: any[];
  onOpenClient360: (client: any) => void;
}

export const SegmentationTab: React.FC<SegmentationTabProps> = ({ clientMetrics, onOpenClient360 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5cf6' }}>
            <Zap size={16} /> Clientes VIP & Flotas
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
            Clientes con más de $600 USD facturados o múltiples vehículos. Enfoque en atención preferencial y promociones exclusivas.
          </p>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6' }}>
            <UserCheck size={16} /> Clientes Recurrentes
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
            Clientes fieles con 3 o más visitas y mantenimiento al día (&lt;90 días). Ideales para programas de fidelidad.
          </p>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
            <AlertCircle size={16} /> En Riesgo de Pérdida
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
            Solían asistir al taller pero llevan entre 90 y 180 días sin visitarnos. Requieren contacto proactivo urgente.
          </p>
        </Card>
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '10px' }}>Cliente</th>
                <th style={{ padding: '10px' }}>Segmento</th>
                <th style={{ padding: '10px' }}>Vehículos</th>
                <th style={{ padding: '10px' }}>Total Gastado</th>
                <th style={{ padding: '10px' }}>Última Visita</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientMetrics.map((item) => (
                <tr key={item.client.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>
                    {item.client.nombre} {item.client.apellido}
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.client.telefono}</div>
                  </td>

                  <td style={{ padding: '10px' }}>
                    {item.segmentTag === 'VIP_FLOTA' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>👑 VIP / Flota</span>}
                    {item.segmentTag === 'RECURRENTE' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>🔄 Recurrente</span>}
                    {item.segmentTag === 'EN_RIESGO' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>⚠️ En Riesgo</span>}
                    {item.segmentTag === 'INACTIVO' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(100, 116, 139, 0.15)', color: '#64748b' }}>💤 Inactivo</span>}
                    {item.segmentTag === 'NUEVO' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>🌱 Nuevo</span>}
                  </td>

                  <td style={{ padding: '10px', fontSize: '12px' }}>
                    {item.primaryVehicle ? `${item.primaryVehicle.marca} ${item.primaryVehicle.modelo} (${item.primaryVehicle.placa})` : 'Sin registrar'}
                  </td>

                  <td style={{ padding: '10px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    ${item.totalSpent.toFixed(2)} USD
                  </td>

                  <td style={{ padding: '10px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {item.lastVisitDate ? `${new Date(item.lastVisitDate).toLocaleDateString()} (${item.daysSinceVisit}d)` : 'Nunca'}
                  </td>

                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenClient360(item.client)}
                      icon={<Eye size={14} />}
                    >
                      Ver 360°
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
