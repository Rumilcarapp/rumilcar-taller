import React, { useState } from 'react';
import { Button, Badge, EmptyState } from '../../../components/ui';
import { Clock, Eye, Edit, X, User } from 'lucide-react';
import { AppointmentDrawer } from './AppointmentDrawer';
import './AppointmentsList.css';

interface AppointmentsListProps {
  selectedDate: Date;
  appointments: any[];
  onCreateClick: () => void;
  onEditClick: (apt: any) => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({ 
  selectedDate, 
  appointments, 
  onCreateClick, 
  onEditClick,
  onUpdateStatus
}) => {
  const [viewingApt, setViewingApt] = useState<any>(null);
  const [cancelingAptId, setCancelingAptId] = useState<string | null>(null);
  const [statusDropdownAptId, setStatusDropdownAptId] = useState<string | null>(null);

  const dateStr = selectedDate.toISOString().split('T')[0];
  const dayAppointments = appointments
    .filter(a => a.date === dateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const getDayName = (date: Date) => ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'][date.getDay()];
  const getMonthName = (date: Date) => ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][date.getMonth()];
  const title = `Agenda del ${getDayName(selectedDate)}, ${selectedDate.getDate()} de ${getMonthName(selectedDate)}`;

  const getStatusBadge = (status: string, aptId: string) => {
    const isDropdownOpen = statusDropdownAptId === aptId;
    
    let badgeNode;
    switch (status) {
      case 'PENDING': badgeNode = <Badge variant="default" className="clickable-badge">Pendiente ▼</Badge>; break;
      case 'CONFIRMED': badgeNode = <Badge variant="success" className="clickable-badge">Confirmada ▼</Badge>; break;
      case 'IN_PROGRESS': badgeNode = <Badge variant="info" className="clickable-badge">En Proceso ▼</Badge>; break;
      case 'COMPLETED': badgeNode = <Badge variant="primary" className="clickable-badge">Completada ▼</Badge>; break;
      case 'CANCELLED': badgeNode = <Badge variant="error" outline>Cancelada</Badge>; break; // Not clickable
      default: return null;
    }

    if (status === 'CANCELLED') return badgeNode;

    return (
      <div className="status-dropdown-container">
        <div onClick={() => setStatusDropdownAptId(isDropdownOpen ? null : aptId)}>
          {badgeNode}
        </div>
        {isDropdownOpen && (
          <div className="status-dropdown-menu">
            <div className="status-item" onClick={() => { onUpdateStatus(aptId, 'PENDING'); setStatusDropdownAptId(null); }}>Pendiente</div>
            <div className="status-item" onClick={() => { onUpdateStatus(aptId, 'CONFIRMED'); setStatusDropdownAptId(null); }}>Confirmada</div>
            <div className="status-item" onClick={() => { onUpdateStatus(aptId, 'IN_PROGRESS'); setStatusDropdownAptId(null); }}>En proceso</div>
            <div className="status-item" onClick={() => { onUpdateStatus(aptId, 'COMPLETED'); setStatusDropdownAptId(null); }}>Completada</div>
            <div className="status-item text-danger" onClick={() => { onUpdateStatus(aptId, 'CANCELLED'); setStatusDropdownAptId(null); }}>Cancelar cita</div>
          </div>
        )}
      </div>
    );
  };

  const handleConfirmCancel = (id: string) => {
    onUpdateStatus(id, 'CANCELLED');
    setCancelingAptId(null);
  };

  return (
    <div className="appointments-list-container">
      <div className="appointments-header">
        <h3 className="appointments-title">{title}</h3>
      </div>

      <div className="appointments-content">
        {dayAppointments.length === 0 ? (
          <div className="appointments-empty">
            <EmptyState
              icon={<Clock size={48} />}
              title="No hay citas para este dia"
              description="Agenda una cita para un cliente nuevo o existente."
              action={{ label: "Agendar una cita", onClick: onCreateClick }}
            />
          </div>
        ) : (
          <div className="appointments-cards">
            {dayAppointments.map(apt => {
              const isCancelled = apt.status === 'CANCELLED';
              const isCanceling = cancelingAptId === apt.id;

              return (
                <div key={apt.id} className={`appointment-card ${isCancelled ? 'is-cancelled' : ''}`}>
                  <div className="apt-main">
                    <div className="apt-time">{apt.startTime}</div>
                    <div className="apt-details">
                      <div className="apt-client">{apt.clientName}</div>
                      <div className="apt-vehicle">{apt.vehicleDesc}</div>
                      <div className="apt-meta">
                        <span className="apt-mechanic">
                          <User size={12} />
                          {apt.mechanic ? apt.mechanic : <span className="unassigned">Sin asignar</span>}
                        </span>
                        <span className="apt-service">{apt.service}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="apt-actions-col">
                    <div className="apt-status">
                      {getStatusBadge(apt.status, apt.id)}
                    </div>
                    {!isCancelled && (
                      <div className="apt-actions">
                        <button className="apt-action-btn" title="Ver detalle" onClick={() => setViewingApt(apt)}><Eye size={16} /></button>
                        <button className="apt-action-btn" title="Editar" onClick={() => onEditClick(apt)}><Edit size={16} /></button>
                        <button className="apt-action-btn apt-action-danger" title="Cancelar" onClick={() => setCancelingAptId(apt.id)}><X size={16} /></button>
                      </div>
                    )}
                  </div>

                  {/* Inline Cancel Confirmation Dialog */}
                  {isCanceling && (
                    <div className="cancel-confirm-overlay">
                      <div className="cancel-confirm-dialog">
                        <p>¿Cancelar esta cita? Esta accion no se puede deshacer.</p>
                        <div className="cancel-actions">
                          <Button variant="danger" size="sm" onClick={() => handleConfirmCancel(apt.id)}>Si, cancelar</Button>
                          <Button variant="outline" size="sm" onClick={() => setCancelingAptId(null)}>No, volver</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AppointmentDrawer 
        appointment={viewingApt} 
        onClose={() => setViewingApt(null)} 
        onConvertToWO={() => alert('Convertir a OT - Fase 4')}
      />
    </div>
  );
};