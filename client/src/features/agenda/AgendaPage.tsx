import React, { useState, useEffect } from 'react';
import { CalendarPanel } from './components/CalendarPanel';
import { AppointmentsList } from './components/AppointmentsList';
import { AppointmentModal } from './components/AppointmentModal';
import { Button } from '../../components/ui';
import { Plus } from 'lucide-react';
import { useAppointmentStore, AppointmentItem } from '../../store/useAppointmentStore';
import { useWorkshopStore } from '../../store/useWorkshopStore';
import { useClientStore } from '../../store/useClientStore';
import { buildWhatsAppMessage, openWhatsApp, copyToClipboard } from '../../lib/whatsapp';
import './AgendaPage.css';

export const AgendaPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingApt, setEditingApt] = useState<AppointmentItem | null>(null);

  const { appointments, fetchAppointments, addAppointment, updateAppointment } = useAppointmentStore();
  const { workshop } = useWorkshopStore();
  const { clients } = useClientStore();

  useEffect(() => {
    fetchAppointments().catch(() => {});
  }, [fetchAppointments]);

  const handleCreateClick = () => {
    setEditingApt(null);
    setShowModal(true);
  };

  const handleEditClick = (apt: any) => {
    setEditingApt(apt);
    setShowModal(true);
  };

  const handleSaveAppointment = async (savedApt: any, sendWhatsApp?: boolean) => {
    let resultApt = savedApt;
    if (editingApt) {
      updateAppointment(savedApt.id, savedApt);
    } else {
      resultApt = await addAppointment(savedApt);
    }
    setShowModal(false);
    setEditingApt(null);

    if (sendWhatsApp) {
      const aptId = resultApt?.id || savedApt.id;
      const matchedClient = savedApt.clientId 
        ? clients.find(c => c.id === savedApt.clientId) 
        : clients.find(c => `${c.nombre} ${c.apellido || ''}`.trim().toLowerCase() === (savedApt.clientName || '').trim().toLowerCase());

      const clientPhone = savedApt.clientPhone || matchedClient?.telefono || '';
      const confUrl = `${window.location.origin}/cita/${aptId}`;
      const parts = (savedApt.vehicleDesc || '').split('-');
      const plate = parts.length > 1 ? parts[parts.length - 1].trim() : '';
      const makeModel = parts[0].trim().split(' ');

      const message = buildWhatsAppMessage('CITA_CONFIRMACION', {
        clientName: savedApt.clientName,
        clientPhone,
        workshopName: workshop?.name || 'Rumilcar Taller Mecánico',
        vehicle: {
          marca: makeModel[0] || '',
          modelo: makeModel.slice(1).join(' ') || '',
          placa: plate || '',
        },
        appointment: {
          id: aptId,
          date: savedApt.date,
          startTime: savedApt.startTime,
          endTime: savedApt.endTime,
          service: savedApt.service,
          confirmationUrl: confUrl,
        },
      });

      if (clientPhone) {
        openWhatsApp(clientPhone, message);
      } else {
        copyToClipboard(message);
        alert('Cita guardada con éxito. El cliente no tiene teléfono guardado, pero el mensaje con el link de confirmación fue copiado a tu portapapeles.');
      }
    }
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    updateAppointment(id, { status: newStatus as any });
  };

  // Only consider active appointments for the calendar dots
  const activeAppointments = appointments.filter(a => a.status !== 'CANCELLED');

  return (
    <div className="agenda-page page-enter">
      <div className="agenda-top-bar">
        <div style={{ flex: 1 }}></div>
        <Button onClick={handleCreateClick} icon={<Plus size={18} />}>
          Crear cita
        </Button>
      </div>

      <div className="agenda-layout">
        <div className="agenda-panel-left">
          <CalendarPanel 
            selectedDate={selectedDate} 
            onSelectDate={setSelectedDate}
            appointments={activeAppointments}
          />
        </div>
        <div className="agenda-panel-right">
          <AppointmentsList 
            selectedDate={selectedDate}
            appointments={appointments}
            onCreateClick={handleCreateClick}
            onEditClick={handleEditClick}
            onUpdateStatus={handleUpdateStatus}
          />
        </div>
      </div>

      {showModal && (
        <AppointmentModal 
          selectedDate={selectedDate}
          onClose={() => { setShowModal(false); setEditingApt(null); }}
          onSave={handleSaveAppointment}
          editData={editingApt}
        />
      )}
    </div>
  );
};