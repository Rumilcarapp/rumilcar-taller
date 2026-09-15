import React, { useState, useEffect } from 'react';
import { CalendarPanel } from './components/CalendarPanel';
import { AppointmentsList } from './components/AppointmentsList';
import { AppointmentModal } from './components/AppointmentModal';
import { Button } from '../../components/ui';
import { Plus } from 'lucide-react';
import { useAppointmentStore, AppointmentItem } from '../../store/useAppointmentStore';
import './AgendaPage.css';

export const AgendaPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingApt, setEditingApt] = useState<AppointmentItem | null>(null);

  const { appointments, fetchAppointments, addAppointment, updateAppointment } = useAppointmentStore();

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

  const handleSaveAppointment = (savedApt: any) => {
    if (editingApt) {
      updateAppointment(savedApt.id, savedApt);
    } else {
      addAppointment(savedApt);
    }
    setShowModal(false);
    setEditingApt(null);
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