import React from 'react';
import { X, Calendar, User, Phone, Car, Wrench, Info, CheckCircle2, Navigation } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import './AppointmentDrawer.css';

interface AppointmentDrawerProps {
  appointment: any;
  onClose: () => void;
  onConvertToWO: () => void;
}

export const AppointmentDrawer: React.FC<AppointmentDrawerProps> = ({ appointment, onClose, onConvertToWO }) => {
  if (!appointment) return null;

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
        <div className="drawer-header">
          <h2 className="drawer-title">DETALLE DE CITA</h2>
          <button className="drawer-close-btn" onClick={onClose}><X size={20} /></button>
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
              <div className="drawer-subvalue"><Phone size={12}/> 0414-1234567 (Mock)</div>
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

        <div className="drawer-footer">
          <Button variant="primary" style={{ width: '100%' }} onClick={onConvertToWO} disabled={appointment.status === 'CANCELLED'}>
            CONVERTIR A ORDEN DE TRABAJO
          </Button>
        </div>
      </div>
    </>
  );
};