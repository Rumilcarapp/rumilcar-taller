import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { useClientStore } from '../../../store/useClientStore';
import { useCRMStore, CRMOpportunity, PipelineStage } from '../../../store/useCRMStore';

interface CRMPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOpportunity?: CRMOpportunity | null;
}

export const CRMPipelineModal: React.FC<CRMPipelineModalProps> = ({
  isOpen,
  onClose,
  initialOpportunity,
}) => {
  const { clients } = useClientStore();
  const { addOpportunity, updateOpportunity } = useCRMStore();

  const [clientId, setClientId] = useState(initialOpportunity?.clientId || (clients[0]?.id || ''));
  const [title, setTitle] = useState(initialOpportunity?.title || '');
  const [serviceType, setServiceType] = useState(initialOpportunity?.serviceType || 'Mantenimiento General');
  const [stage, setStage] = useState<PipelineStage>(initialOpportunity?.stage || 'POR_CONTACTAR');
  const [estimatedValueUSD, setEstimatedValueUSD] = useState(initialOpportunity?.estimatedValueUSD?.toString() || '100');
  const [priority, setPriority] = useState<'ALTA' | 'MEDIA' | 'BAJA'>(initialOpportunity?.priority || 'MEDIA');
  const [vehiclePlate, setVehiclePlate] = useState(initialOpportunity?.vehiclePlate || '');
  const [vehicleModel, setVehicleModel] = useState(initialOpportunity?.vehicleModel || '');
  const [notes, setNotes] = useState(initialOpportunity?.notes || '');

  const selectedClient = clients.find((c) => c.id === clientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Por favor ingresa un título para la oportunidad');

    const clientName = selectedClient ? `${selectedClient.nombre} ${selectedClient.apellido}` : 'Cliente General';
    const clientPhone = selectedClient?.telefono || '';

    if (initialOpportunity) {
      updateOpportunity(initialOpportunity.id, {
        clientId,
        clientName,
        clientPhone,
        title,
        serviceType,
        stage,
        estimatedValueUSD: parseFloat(estimatedValueUSD) || 0,
        priority,
        vehiclePlate,
        vehicleModel,
        notes,
      });
    } else {
      addOpportunity({
        clientId,
        clientName,
        clientPhone,
        title,
        serviceType,
        stage,
        estimatedValueUSD: parseFloat(estimatedValueUSD) || 0,
        priority,
        vehiclePlate,
        vehicleModel,
        notes,
        lastContactDate: new Date().toISOString(),
      });
    }

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialOpportunity ? 'Editar Oportunidad CRM' : 'Nueva Oportunidad de Recontacto'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Cliente</label>
          <select
            className="input-field"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellido} ({c.documento}) - {c.telefono}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Título de la Oportunidad / Necesidad</label>
          <input
            type="text"
            required
            placeholder="Ej: Cambio de pastillas y rectificación de discos"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Tipo de Servicio</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
            >
              <option value="Mantenimiento General">Mantenimiento General</option>
              <option value="Cambio de Aceite">Cambio de Aceite</option>
              <option value="Frenos y Seguridad">Frenos y Seguridad</option>
              <option value="Suspensión y Tren Delantero">Suspensión y Tren Delantero</option>
              <option value="Motor y Distribución">Motor y Distribución</option>
              <option value="Electricidad y Batería">Electricidad y Batería</option>
              <option value="Aire Acondicionado">Aire Acondicionado</option>
              <option value="Revisión / Diagnóstico">Revisión / Diagnóstico</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Etapa en el Embudo</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as PipelineStage)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
            >
              <option value="POR_CONTACTAR">Por Contactar</option>
              <option value="CONTACTADO">Contactado</option>
              <option value="NEGOCIACION">En Negociación</option>
              <option value="AGENDADO">Cita Agendada</option>
              <option value="COMPLETADO">Servicio Completado</option>
              <option value="PERDIDO">No Interesado / Perdido</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Placa del Vehículo</label>
            <input
              type="text"
              placeholder="Ej: ABC-123"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Modelo / Versión</label>
            <input
              type="text"
              placeholder="Ej: Toyota Corolla 2018"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Valor Estimado ($ USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={estimatedValueUSD}
              onChange={(e) => setEstimatedValueUSD(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Prioridad</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
            >
              <option value="ALTA">🔥 Alta</option>
              <option value="MEDIA">⚡ Media</option>
              <option value="BAJA">🌱 Baja</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Notas y Observaciones</label>
          <textarea
            rows={3}
            placeholder="Detalles sobre lo conversado con el cliente, fecha esperada de respuesta, etc..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            {initialOpportunity ? 'Guardar Cambios' : 'Crear Oportunidad'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
