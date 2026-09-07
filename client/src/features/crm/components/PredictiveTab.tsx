import React, { useState } from 'react';
import { Card, Button } from '../../../components/ui';
import { useCRMStore } from '../../../store/useCRMStore';
import { Search, Send, Eye } from 'lucide-react';

interface PredictiveTabProps {
  clientMetrics: any[];
  onOpenClient360: (client: any) => void;
}

export const PredictiveTab: React.FC<PredictiveTabProps> = ({ clientMetrics, onOpenClient360 }) => {
  const { templates, addInteraction } = useCRMStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('TODOS');

  const filteredPredictive = clientMetrics.filter((item) => {
    const fullName = `${item.client.nombre} ${item.client.apellido}`.toLowerCase();
    const doc = (item.client.documento || '').toLowerCase();
    const plate = (item.primaryVehicle?.placa || '').toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || doc.includes(searchTerm.toLowerCase()) || plate.includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (serviceFilter === 'ACEITE') return item.isOilDue;
    if (serviceFilter === 'FRENOS') return item.isBrakesDue;
    if (serviceFilter === 'DISTRIBUCION') return item.isBeltDue;
    if (serviceFilter === 'INACTIVOS') return item.daysSinceVisit >= 90;
    return true;
  });

  const handleDirectWhatsApp = (item: any, templateId: string, serviceName?: string) => {
    const phone = item.client?.telefono;
    if (!phone) return alert('El cliente no tiene teléfono registrado.');

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('58') && cleanPhone.length === 10) cleanPhone = '58' + cleanPhone;

    const tpl = templates.find((t) => t.id === templateId) || templates[0];
    const vehName = item.primaryVehicle ? `${item.primaryVehicle.marca || ''} ${item.primaryVehicle.modelo || ''}`.trim() : 'su vehículo';
    const plate = item.primaryVehicle?.placa || 'su vehículo';
    const lastServ = item.lastVisitDate ? new Date(item.lastVisitDate).toLocaleDateString() : 'hace unos meses';

    const msg = tpl.template
      .replace(/\[nombre\]/g, item.client.nombre)
      .replace(/\[vehiculo\]/g, vehName)
      .replace(/\[placa\]/g, plate)
      .replace(/\[servicio\]/g, serviceName || 'mantenimiento preventivo')
      .replace(/\[ultimo_servicio\]/g, lastServ)
      .replace(/\[nombre_taller\]/g, 'Rumilcar Taller Mecánico')
      .replace(/\[telefono_taller\]/g, '0414-1234567');

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');

    addInteraction({
      clientId: item.client.id,
      clientName: `${item.client.nombre} ${item.client.apellido}`,
      type: 'WHATSAPP',
      summary: `WhatsApp automático: ${tpl.title}`,
      details: msg,
      sentiment: 'POSITIVO',
      user: 'Asesor CRM',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por cliente, cédula o placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setServiceFilter('TODOS')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              background: serviceFilter === 'TODOS' ? 'var(--color-primary)' : 'var(--color-bg-surface)',
              color: serviceFilter === 'TODOS' ? '#ffffff' : 'var(--color-text-main)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setServiceFilter('ACEITE')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              background: serviceFilter === 'ACEITE' ? '#3b82f6' : 'var(--color-bg-surface)',
              color: serviceFilter === 'ACEITE' ? '#ffffff' : 'var(--color-text-main)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🛢️ Aceite & Filtros
          </button>
          <button
            type="button"
            onClick={() => setServiceFilter('FRENOS')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              background: serviceFilter === 'FRENOS' ? '#ef4444' : 'var(--color-bg-surface)',
              color: serviceFilter === 'FRENOS' ? '#ffffff' : 'var(--color-text-main)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🛑 Frenos
          </button>
          <button
            type="button"
            onClick={() => setServiceFilter('DISTRIBUCION')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              background: serviceFilter === 'DISTRIBUCION' ? '#f59e0b' : 'var(--color-bg-surface)',
              color: serviceFilter === 'DISTRIBUCION' ? '#ffffff' : 'var(--color-text-main)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⚙️ Distribución
          </button>
          <button
            type="button"
            onClick={() => setServiceFilter('INACTIVOS')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              background: serviceFilter === 'INACTIVOS' ? '#64748b' : 'var(--color-bg-surface)',
              color: serviceFilter === 'INACTIVOS' ? '#ffffff' : 'var(--color-text-main)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            💤 Inactivos (+90d)
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredPredictive.length === 0 ? (
          <Card>
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No se encontraron clientes para el filtro seleccionado.
            </div>
          </Card>
        ) : (
          filteredPredictive.map((item) => (
            <Card key={item.client.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>{item.client.nombre} {item.client.apellido}</span>
                    {item.segmentTag === 'VIP_FLOTA' && (
                      <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '2px 6px', borderRadius: '4px' }}>
                        👑 VIP
                      </span>
                    )}
                    {item.segmentTag === 'EN_RIESGO' && (
                      <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>
                        ⚠️ EN RIESGO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🚗 {item.primaryVehicle?.marca} {item.primaryVehicle?.modelo} ({item.primaryVehicle?.placa || 'Sin placa'})</span>
                    <span>•</span>
                    <span>🛣️ Km est.: <strong>{item.estimatedCurrentKm.toLocaleString()} km</strong></span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Última visita: {item.lastVisitDate ? `${new Date(item.lastVisitDate).toLocaleDateString()} (hace ${item.daysSinceVisit} días)` : 'Sin visitas registradas'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {item.isOilDue && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      🛢️ Cambio de Aceite Vencido
                    </span>
                  )}
                  {item.isBrakesDue && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      🛑 Revisión de Frenos (+6 meses)
                    </span>
                  )}
                  {item.isBeltDue && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      ⚙️ Correa Distribución (+50k km)
                    </span>
                  )}
                  {!item.isOilDue && !item.isBrakesDue && !item.isBeltDue && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                      ✅ Mantenimiento al día
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDirectWhatsApp(item, item.isOilDue ? 'tpl-mantenimiento-aceite' : (item.isBrakesDue ? 'tpl-frenos-seguridad' : 'tpl-mantenimiento-aceite'))}
                    icon={<Send size={14} />}
                    style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: '#ffffff' }}
                  >
                    Enviar WhatsApp
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenClient360(item.client)}
                    icon={<Eye size={14} />}
                  >
                    Ficha 360°
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
