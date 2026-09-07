import React, { useState } from 'react';
import { Modal, Button, Input } from '../../../components/ui';
import { Calendar, Clock, User, Car, Wrench, FileText, Info, AlertTriangle } from 'lucide-react';
import './AppointmentModal.css';

interface AppointmentModalProps {
  selectedDate: Date;
  onClose: () => void;
  onSave: (apt: any) => void;
  editData?: any;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({ selectedDate, onClose, onSave, editData }) => {
  const [isDirty, setIsDirty] = useState(false);
  
  const [client, setClient] = useState(editData?.clientName || '');
  const [vehicle, setVehicle] = useState(editData?.vehicleDesc || '');
  
  const [service, setService] = useState(editData?.service || '');
  const [mechanic, setMechanic] = useState(editData?.mechanic || '');
  const [modality, setModality] = useState(editData?.modality || 'TALLER');
  
  const defaultStartDate = editData?.startAt ? new Date(editData.startAt) : selectedDate;
  const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(editData?.startTime || '10:00');
  
  const defaultEndDate = editData?.endAt ? new Date(editData.endAt) : selectedDate;
  const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState(editData?.endTime || '11:00');
  
  const [notes, setNotes] = useState(editData?.internalNotes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasServicesConfigured = true; // Mock true for now

  const handleFieldChange = (setter: any, value: any) => {
    setIsDirty(true);
    setter(value);
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('¿Seguro que deseas cerrar? Los datos no se guardaran.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!client) newErrors.client = "Selecciona o crea un cliente";
    if (!vehicle) newErrors.vehicle = "Selecciona o crea un vehiculo";
    if (!startDate || !startTime) newErrors.start = "Fecha de ingreso obligatoria";
    
    // Check end date >= start date
    const startObj = new Date(`${startDate}T${startTime}`);
    const endObj = new Date(`${endDate}T${endTime}`);
    if (endObj < startObj) {
      newErrors.end = "La fecha de termino no puede ser antes del ingreso";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
       // Mock scroll to first error
       return;
    }

    onSave({
      id: editData?.id || Math.random().toString(),
      startAt: `${startDate}T${startTime}:00Z`,
      endAt: `${endDate}T${endTime}:00Z`,
      startTime,
      endTime,
      date: startDate,
      clientName: client,
      vehicleDesc: vehicle,
      mechanic: mechanic === '1' ? 'Carlos M.' : mechanic === '2' ? 'Pedro R.' : null,
      service: service,
      modality,
      internalNotes: notes,
      status: editData?.status || 'PENDING'
    });
  };

  return (
    <Modal isOpen={true} title={editData ? "EDITAR CITA" : "NUEVA CITA"} onClose={handleClose} size="lg" footer={
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button variant="danger" onClick={handleClose}>Cerrar</Button>
        <Button 
          style={{ backgroundColor: '#1E3A8A', color: 'white', borderColor: '#1E3A8A' }} 
          onClick={handleSave}
        >
          {editData ? "Guardar cambios" : "Enviar Cita"}
        </Button>
      </div>
    }>
      <div className="apt-modal-form">
        
        {/* BLOQUE 1: Cliente y Vehiculo */}
        <div className="apt-form-section">
          <div className="apt-form-row">
            <div className="apt-form-group flex-1">
              <label>Cliente</label>
              <div className="apt-search-row">
                <div className={`apt-input-wrap flex-1 ${errors.client ? 'has-error' : ''}`}>
                  <User size={16} />
                  <input type="text" placeholder="Buscar cliente existente..." value={client} onChange={e => handleFieldChange(setClient, e.target.value)} />
                </div>
                <Button variant="primary" size="sm">+ Crear nuevo cliente</Button>
              </div>
              {errors.client && <span className="error-text">{errors.client}</span>}
            </div>
          </div>
          <div className="apt-form-row">
            <div className="apt-form-group flex-1">
              <label>Vehiculo</label>
              <div className="apt-search-row">
                <div className={`apt-input-wrap flex-1 ${errors.vehicle ? 'has-error' : ''}`}>
                  <Car size={16} />
                  <input type="text" placeholder="Buscar vehiculo (filtrado por cliente)..." value={vehicle} onChange={e => handleFieldChange(setVehicle, e.target.value)} />
                </div>
                <Button variant="primary" size="sm">+ Crear nuevo vehiculo</Button>
              </div>
              {errors.vehicle && <span className="error-text">{errors.vehicle}</span>}
            </div>
          </div>
        </div>

        {/* BLOQUE 2: Tipo de Servicio */}
        <div className="apt-form-section">
          {!hasServicesConfigured ? (
             <div className="service-alert">
               <AlertTriangle size={16} className="text-warning" />
               <span>No hay tipos de servicios creados</span>
               <Button variant="outline" size="sm" className="ml-auto">Ir a crear tipos</Button>
             </div>
          ) : (
             <div className="apt-form-group">
               <label>Tipo de servicio</label>
               <div className="apt-input-wrap">
                 <Wrench size={16} />
                 <input type="text" placeholder="Ej: Ruido en la suspension delantera" value={service} onChange={e => handleFieldChange(setService, e.target.value)} />
               </div>
             </div>
          )}
        </div>

        {/* BLOQUE 3: Mecanico y Modalidad */}
        <div className="apt-form-row">
          <div className="apt-form-group flex-1">
            <label>Mecanico asignado</label>
            <div className="apt-input-wrap">
              <User size={16} />
              <select value={mechanic} onChange={e => handleFieldChange(setMechanic, e.target.value)}>
                <option value="">Sin asignar</option>
                <option value="1">Carlos M.</option>
                <option value="2">Pedro R.</option>
              </select>
            </div>
          </div>
          <div className="apt-form-group flex-1">
            <label>Modalidad</label>
            <div className="modality-options">
              <label className="modality-radio">
                <input type="radio" name="modality" checked={modality === 'DOMICILIO'} onChange={() => handleFieldChange(setModality, 'DOMICILIO')} />
                A Domicilio
                <div className="tooltip-icon" title="El tecnico se desplaza al cliente"><Info size={14} /></div>
              </label>
              <label className="modality-radio">
                <input type="radio" name="modality" checked={modality === 'RETIRO'} onChange={() => handleFieldChange(setModality, 'RETIRO')} />
                Con Retiro
                <div className="tooltip-icon" title="El vehiculo es retirado por el taller"><Info size={14} /></div>
              </label>
            </div>
          </div>
        </div>

        {/* BLOQUE 4: Fechas */}
        <div className="apt-form-row">
          <div className="apt-form-group flex-1">
            <label>Fecha ingreso</label>
            <div className={`datetime-picker ${errors.start ? 'has-error' : ''}`}>
              <div className="apt-input-wrap flex-1">
                <Calendar size={16} />
                <input type="date" value={startDate} onChange={e => handleFieldChange(setStartDate, e.target.value)} />
              </div>
              <div className="apt-input-wrap flex-1">
                <Clock size={16} />
                <input type="time" value={startTime} onChange={e => handleFieldChange(setStartTime, e.target.value)} />
              </div>
            </div>
            {errors.start && <span className="error-text">{errors.start}</span>}
          </div>
          <div className="apt-form-group flex-1">
            <label>Fecha termino</label>
            <div className={`datetime-picker ${errors.end ? 'has-error' : ''}`}>
              <div className="apt-input-wrap flex-1">
                <Calendar size={16} />
                <input type="date" value={endDate} onChange={e => handleFieldChange(setEndDate, e.target.value)} />
              </div>
              <div className="apt-input-wrap flex-1">
                <Clock size={16} />
                <input type="time" value={endTime} onChange={e => handleFieldChange(setEndTime, e.target.value)} />
              </div>
            </div>
            {errors.end && <span className="error-text">{errors.end}</span>}
          </div>
        </div>

        {/* BLOQUE 5: Comentarios */}
        <div className="apt-form-section mt-2">
          <div className="apt-form-group">
            <label>Comentarios internos</label>
            <span className="help-text">Ingresa comentarios de uso interno para la cita (no visibles para el cliente).</span>
            <div className="apt-input-wrap align-start">
              <FileText size={16} style={{ marginTop: 10 }} />
              <textarea 
                rows={4} 
                value={notes}
                onChange={e => handleFieldChange(setNotes, e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};