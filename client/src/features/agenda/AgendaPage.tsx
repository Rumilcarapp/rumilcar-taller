import React, { useState } from 'react';
import { CalendarPanel } from './components/CalendarPanel';
import { AppointmentsList } from './components/AppointmentsList';
import { AppointmentModal } from './components/AppointmentModal';
import { Button } from '../../components/ui';
import { Plus } from 'lucide-react';
import './AgendaPage.css';

export const AgendaPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingApt, setEditingApt] = useState<any>(null);

  // Mock appointments for demo reactivity
  const [appointments, setAppointments] = useState<any[]>([
    { 
      id: '1', 
      date: new Date().toISOString().split('T')[0], 
      startAt: `${new Date().toISOString().split('T')[0]}T10:00:00Z`,
      endAt: `${new Date().toISOString().split('T')[0]}T11:00:00Z`,
      startTime: '10:00 AM', 
      endTime: '11:00 AM',
      clientName: 'Juan Perez', 
      vehicleDesc: 'Toyota Corolla - ABC-123', 
      mechanic: 'Carlos M.', 
      service: 'Rev. frenos', 
      modality: 'TALLER',
      internalNotes: 'Cliente frecuente.',
      status: 'PENDING' 
    },
    { 
      id: '2', 
      date: new Date().toISOString().split('T')[0], 
      startAt: `${new Date().toISOString().split('T')[0]}T11:30:00Z`,
      endAt: `${new Date().toISOString().split('T')[0]}T12:30:00Z`,
      startTime: '11:30 AM', 
      endTime: '12:30 PM',
      clientName: 'Maria Gomez', 
      vehicleDesc: 'Ford Fiesta - XYZ-789', 
      mechanic: null, 
      service: 'Cambio de aceite',
      modality: 'DOMICILIO',
      internalNotes: '',
      status: 'CONFIRMED' 
    }
  ]);

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
      setAppointments(appointments.map(a => a.id === savedApt.id ? savedApt : a));
    } else {
      setAppointments([...appointments, savedApt]);
    }
    setShowModal(false);
    setEditingApt(null);
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setAppointments(appointments.map(a => a.id === id ? { ...a, status: newStatus } : a));
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