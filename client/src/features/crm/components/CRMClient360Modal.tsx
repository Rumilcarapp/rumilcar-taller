import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { useCRMStore, InteractionType } from '../../../store/useCRMStore';
import { useWorkOrderStore } from '../../../store/useWorkOrderStore';
import { useVehicleStore } from '../../../store/useVehicleStore';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MessageSquare, 
  Plus, 
  Clock, 
  Send, 
  FileText, 
  Wrench
} from 'lucide-react';

interface CRMClient360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
}

export const CRMClient360Modal: React.FC<CRMClient360ModalProps> = ({
  isOpen,
  onClose,
  client,
}) => {
  const navigate = useNavigate();
  const { interactions, addInteraction, templates } = useCRMStore();
  const { workOrders } = useWorkOrderStore();
  const { vehicles } = useVehicleStore();

  const [activeTab, setActiveTab] = useState<'bitacora' | 'ordenes' | 'whatsapp'>('bitacora');

  // New Note / Interaction State
  const [interactionType, setInteractionType] = useState<InteractionType>('WHATSAPP');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [sentiment, setSentiment] = useState<'POSITIVO' | 'NEUTRO' | 'URGENTE' | 'INSATISFECHO'>('POSITIVO');

  // Quick WhatsApp State
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const [customMsg, setCustomMsg] = useState('');

  if (!client) return null;

  const clientOrders = workOrders.filter(
    (o) =>
      (o.client?.documento && o.client.documento === client.documento) ||
      (o.client?.nombre === client.nombre && o.client?.apellido === client.apellido)
  );

  const clientVehicles = vehicles.filter(
    (v) => v.ownerDocumento === client.documento
  );

  const clientInteractions = interactions.filter(
    (i) => i.clientId === client.id || i.clientName === `${client.nombre} ${client.apellido}`
  );

  const totalSpent = clientOrders.reduce((acc, o) => acc + (o.totalUSD || 0), 0);
  const totalPaid = clientOrders.reduce((acc, o) => {
    const paid = (o.payments || []).reduce((pAcc, p) => pAcc + (p.amountUSD || 0), 0);
    return acc + paid;
  }, 0);
  const pendingBalance = Math.max(0, totalSpent - totalPaid);
  const avgTicket = clientOrders.length > 0 ? totalSpent / clientOrders.length : 0;

  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return alert('Ingresa un resumen para la nota.');

    addInteraction({
      clientId: client.id,
      clientName: `${client.nombre} ${client.apellido}`,
      type: interactionType,
      summary,
      details,
      sentiment,
      user: 'Asesor Técnico',
    });

    setSummary('');
    setDetails('');
    alert('Nota registrada en la bitácora del cliente.');
  };

  const handleSendWhatsApp = () => {
    if (!client.telefono) return alert('El cliente no posee un número de teléfono registrado.');
    let cleanPhone = client.telefono.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('58') && cleanPhone.length === 10) cleanPhone = '58' + cleanPhone;

    const tpl = templates.find((t) => t.id === selectedTemplateId);
    let msg = customMsg || tpl?.template || '';

    const firstPlate = clientVehicles[0]?.placa || clientOrders[0]?.vehicle?.placa || 'su vehículo';
    const firstModel = clientVehicles[0] ? `${clientVehicles[0].marca} ${clientVehicles[0].modelo}` : clientOrders[0]?.vehicle?.marca || 'su vehículo';

    msg = msg
      .replace(/\[nombre\]/g, client.nombre)
      .replace(/\[vehiculo\]/g, firstModel)
      .replace(/\[placa\]/g, firstPlate)
      .replace(/\[servicio\]/g, 'Mantenimiento preventivo')
      .replace(/\[nombre_taller\]/g, 'Rumilcar Taller Mecánico')
      .replace(/\[telefono_taller\]/g, '0414-1234567');

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');

    addInteraction({
      clientId: client.id,
      clientName: `${client.nombre} ${client.apellido}`,
      type: 'WHATSAPP',
      summary: `Envío de WhatsApp: ${tpl?.title || 'Mensaje directo'}`,
      details: msg,
      sentiment: 'POSITIVO',
      user: 'Asesor Técnico',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ficha 360° del Cliente: ${client.nombre} ${client.apellido}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
        
        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', background: 'var(--color-bg-subtle, rgba(0,0,0,0.03))', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Contacto</div>
            <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>{client.telefono || 'Sin teléfono'}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>CI/RIF: {client.documento}</div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-subtle, rgba(0,0,0,0.03))', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Gasto Histórico</div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-primary)', marginTop: '4px' }}>${totalSpent.toFixed(2)} USD</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{clientOrders.length} visitas al taller</div>
          </div>

          <div style={{ padding: '12px', background: 'var(--color-bg-subtle, rgba(0,0,0,0.03))', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ticket Promedio</div>
            <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '4px' }}>${avgTicket.toFixed(2)} USD</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>por visita</div>
          </div>

          <div style={{ padding: '12px', background: pendingBalance > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: `1px solid ${pendingBalance > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
            <div style={{ fontSize: '11px', color: pendingBalance > 0 ? '#ef4444' : '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Estado de Cuenta</div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: pendingBalance > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
              {pendingBalance > 0 ? `Pendiente $${pendingBalance.toFixed(2)}` : 'Al Día ✅'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{client.direccion || 'Sin dirección'}</div>
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              onClose();
              navigate('/agenda');
            }}
            icon={<Calendar size={14} />}
          >
            Agendar en Citas
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              onClose();
              navigate('/trabajos/nueva');
            }}
            icon={<Wrench size={14} />}
          >
            Nueva Orden de Trabajo
          </Button>
        </div>

        {/* Modal Tabs Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('bitacora')}
            style={{
              padding: '8px 16px',
              borderBottom: activeTab === 'bitacora' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === 'bitacora' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: 600,
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={16} /> Bitácora & Notas ({clientInteractions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ordenes')}
            style={{
              padding: '8px 16px',
              borderBottom: activeTab === 'ordenes' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === 'ordenes' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: 600,
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={16} /> Historial de Órdenes ({clientOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            style={{
              padding: '8px 16px',
              borderBottom: activeTab === 'whatsapp' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === 'whatsapp' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: 600,
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <MessageSquare size={16} /> Enviar WhatsApp
          </button>
        </div>

        {/* Tab 1: Bitácora & Notas */}
        {activeTab === 'bitacora' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form onSubmit={handleAddInteraction} style={{ padding: '14px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>Registrar Nueva Interacción / Nota</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Canal / Tipo</label>
                  <select
                    value={interactionType}
                    onChange={(e) => setInteractionType(e.target.value as any)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
                  >
                    <option value="WHATSAPP">📲 WhatsApp</option>
                    <option value="LLAMADA">📞 Llamada Telefónica</option>
                    <option value="EMAIL">✉️ Correo Electrónico</option>
                    <option value="VISITA">🏢 Visita en Taller</option>
                    <option value="NOTA_INTERNA">📝 Nota Interna / Preferencia</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Percepción / Sentimiento</label>
                  <select
                    value={sentiment}
                    onChange={(e) => setSentiment(e.target.value as any)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
                  >
                    <option value="POSITIVO">🟢 Satisfecho / Receptivo</option>
                    <option value="NEUTRO">⚪ Neutro / Informativo</option>
                    <option value="URGENTE">🟠 Urgente / Requiere Acción</option>
                    <option value="INSATISFECHO">🔴 Insatisfecho / Reclamo</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  required
                  placeholder="Resumen (Ej: Consulta de precio de frenos, prometió traer el auto el jueves)"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales o acuerdos específicos..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="sm" variant="primary" type="submit" icon={<Plus size={14} />}>
                  Guardar Nota en Bitácora
                </Button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Historial de Interacciones Registradas</div>
              {clientInteractions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  No hay interacciones registradas aún para este cliente.
                </div>
              ) : (
                clientInteractions.map((item) => (
                  <div key={item.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--color-bg-subtle)', fontWeight: 700 }}>
                          {item.type}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.summary}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {item.details && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>{item.details}</p>}
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>Registrado por: <strong>{item.user}</strong></div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Historial de Órdenes */}
        {activeTab === 'ordenes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {clientOrders.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Este cliente no tiene órdenes de trabajo registradas.
              </div>
            ) : (
              clientOrders.map((order) => (
                <div key={order.id} style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>Orden #{order.id}</span>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--color-bg-subtle)', fontWeight: 600 }}>{order.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Vehículo: <strong>{order.vehicle?.marca} {order.vehicle?.modelo} ({order.vehicle?.placa})</strong> • Fecha: {new Date(order.date).toLocaleDateString()}
                    </div>
                    {order.services && order.services.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Servicios: {order.services.map((s: any) => s.name || s.nombre).join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)' }}>${order.totalUSD?.toFixed(2)} USD</div>
                    <Button size="sm" variant="ghost" onClick={() => {
                      onClose();
                      navigate('/trabajos/' + order.id);
                    }}>
                      Ver Orden
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Enviar WhatsApp Rápido */}
        {activeTab === 'whatsapp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Seleccionar Plantilla Predefinida</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  const found = templates.find((t) => t.id === e.target.value);
                  if (found) setCustomMsg(found.template);
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title} ({tpl.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Mensaje Personalizado</label>
              <textarea
                rows={5}
                value={customMsg || templates.find((t) => t.id === selectedTemplateId)?.template || ''}
                onChange={(e) => setCustomMsg(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button 
                variant="primary" 
                onClick={handleSendWhatsApp} 
                icon={<Send size={16} />}
                style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: '#ffffff' }}
              >
                Abrir WhatsApp con este Cliente
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
