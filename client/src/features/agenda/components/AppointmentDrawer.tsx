import React, { useState } from 'react';
import { X, Calendar, User, Phone, Car, Wrench, Info, CheckCircle2, Navigation, MessageCircle, Copy, Check, Edit } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { buildWhatsAppMessage, openWhatsApp, copyToClipboard } from '../../../lib/whatsapp';
import { useWorkshopStore } from '../../../store/useWorkshopStore';
import { useClientStore } from '../../../store/useClientStore';
import './AppointmentDrawer.css';

interface AppointmentDrawerProps {
  appointment: any;
  onClose: () => void;
  onConvertToWO: () => void;
  onEdit?: () => void;
}

export const AppointmentDrawer: React.FC<AppointmentDrawerProps> = ({ appointment, onClose, onConvertToWO, onEdit }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const { workshop } = useWorkshopStore();
  const { clients } = useClientStore();

  if (!appointment) return null;

  // Resolve client phone
  const matchedClient = appointment.clientId 
    ? clients.find(c => c.id === appointment.clientId) 
    : clients.find(c => `${c.nombre} ${c.apellido || ''}`.trim().toLowerCase() === (appointment.clientName || '').trim().toLowerCase());

  const clientPhone = appointment.clientPhone || matchedClient?.telefono || '';

  const handleSendWhatsApp = () => {
    const confUrl = `${window.location.origin}/cita/${appointment.id}`;
    const parts = (appointment.vehicleDesc || '').split('-');
    const plate = parts.length > 1 ? parts[parts.length - 1].trim() : '';
    const makeModel = parts[0].trim().split(' ');

    const message = buildWhatsAppMessage('CITA_CONFIRMACION', {
      clientName: appointment.clientName,
      clientPhone: clientPhone,
      workshopName: workshop?.name || 'Rumilcar Taller Mecánico',
      vehicle: {
        marca: makeModel[0] || '',
        modelo: makeModel.slice(1).join(' ') || '',
        placa: plate || '',
      },
      appointment: {
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        service: appointment.service,
        confirmationUrl: confUrl,
      },
    });

    if (clientPhone) {
      openWhatsApp(clientPhone, message);
    } else {
      copyToClipboard(message);
      alert('El cliente no tiene teléfono guardado. El mensaje con el link de confirmación fue copiado al portapapeles.');
    }
  };

  const handleCopyLink = async () => {
    const confUrl = `${window.location.origin}/cita/${appointment.id}`;
    await copyToClipboard(confUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="default">Pendiente</Badge>;
      case 'CONFIRMED': return <Badge variant="success">Confirmada</Badge>;
      case 'IN_PROGRESS': return <Badge variant="info">En Proceso</Badge>;
      case 'COMPLETED': return <Badge variant="primary">Completada</Badge>;
      case 'CANCELLED': return <Badge variant="error" outline>Cancelada</Badge>;
      default: return null;
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-container">
        <div className="drawer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="drawer-title">DETALLE DE CITA</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {onEdit && (
              <button 
                onClick={onEdit} 
                className="drawer-close-btn" 
                title="Editar cita"
                style={{ color: '#60a5fa' }}
              >
                <Edit size={18} />
              </button>
            )}
            <button className="drawer-close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="drawer-content">
          {/* Main Info */}
          <div className="drawer-main-info">
            <div className="drawer-datetime">
              <Calendar size={18} />
              <span>{appointment.date} - {appointment.startTime} a {appointment.endTime}</span>
            </div>
            <div className="drawer-status">
              {getStatusBadge(appointment.status)}
            </div>
          </div>

          <div className="drawer-section">
            <h4 className="drawer-section-title"><User size={14}/> CLIENTE</h4>
            <div className="drawer-field">
              <div className="drawer-value">{appointment.clientName}</div>
              <div className="drawer-subvalue">
                <Phone size={12}/> {clientPhone || 'Sin teléfono registrado'}
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <h4 className="drawer-section-title"><Car size={14}/> VEHICULO</h4>
            <div className="drawer-field">
              <div className="drawer-value">{appointment.vehicleDesc}</div>
            </div>
          </div>

          <div className="drawer-section">
            <h4 className="drawer-section-title"><Wrench size={14}/> SERVICIO Y MECANICO</h4>
            <div className="drawer-field">
              <div className="drawer-label">Tipo:</div>
              <div className="drawer-value">{appointment.service}</div>
            </div>
            <div className="drawer-field">
              <div className="drawer-label">Modalidad:</div>
              <div className="drawer-value flex-align">
                {appointment.modality === 'DOMICILIO' ? <Navigation size={14}/> : <Info size={14}/>}
                {appointment.modality === 'DOMICILIO' ? 'A Domicilio' : appointment.modality === 'RETIRO' ? 'Con Retiro' : 'En Taller'}
              </div>
            </div>
            <div className="drawer-field">
              <div className="drawer-label">Mecanico:</div>
              <div className="drawer-value">{appointment.mechanic || 'Sin asignar'}</div>
            </div>
          </div>

          <div className="drawer-section">
            <h4 className="drawer-section-title">📝 COMENTARIOS INTERNOS</h4>
            <div className="drawer-notes">
              {appointment.internalNotes || <em>No hay comentarios.</em>}
            </div>
          </div>

          <div className="drawer-section">
            <h4 className="drawer-section-title">🕒 HISTORIAL DE CAMBIOS</h4>
            <ul className="drawer-history">
              <li>
                <CheckCircle2 size={12} /> Creada el {appointment.date} ({appointment.startTime})
              </li>
              {appointment.status !== 'PENDING' && (
                <li>
                  <CheckCircle2 size={12} /> Estado cambiado a {appointment.status}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="drawer-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button
              onClick={handleSendWhatsApp}
              style={{
                flex: 1,
                backgroundColor: '#25D366',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              title="Enviar mensaje híbrido de confirmación por WhatsApp"
            >
              <MessageCircle size={16} />
              WhatsApp de Cita
            </button>

            <button
              onClick={handleCopyLink}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#e5e7eb',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
              }}
              title="Copiar enlace de confirmación web"
            >
              {copiedLink ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              {copiedLink ? '¡Copiado!' : 'Copiar Link'}
            </button>
          </div>

          <Button variant="primary" style={{ width: '100%' }} onClick={onConvertToWO} disabled={appointment.status === 'CANCELLED'}>
            CONVERTIR A ORDEN DE TRABAJO
          </Button>
        </div>
      </div>
    </>
  );
};