import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../../../components/ui';
import { Calendar, Clock, User, Car, Wrench, FileText, Info, AlertTriangle } from 'lucide-react';
import { usePersonnelStore } from '../../../store/usePersonnelStore';
import { useClientStore, Client } from '../../../store/useClientStore';
import { useVehicleStore, Vehicle } from '../../../store/useVehicleStore';
import { capitalizeWords } from '../../../lib/stringUtils';
import { ClientModal } from '../../workOrders/components/ClientModal';
import { VehicleModal } from '../../workOrders/components/VehicleModal';
import './AppointmentModal.css';

interface AppointmentModalProps {
  selectedDate: Date;
  onClose: () => void;
  onSave: (apt: any) => void;
  editData?: any;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({ selectedDate, onClose, onSave, editData }) => {
  const { personnel, fetchPersonnel } = usePersonnelStore();
  const activePersonnel = personnel.filter(p => p.isActive);

  const { clients, fetchClients } = useClientStore();
  const { vehicles, fetchVehicles } = useVehicleStore();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  const [showClientModal, setShowClientModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  useEffect(() => {
    fetchPersonnel().catch(() => {});
    fetchClients().catch(() => {});
    fetchVehicles().catch(() => {});
  }, [fetchPersonnel, fetchClients, fetchVehicles]);

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

  const handleSelectClient = (c: Client) => {
    const full = capitalizeWords(`${c.nombre} ${c.apellido || ''}`.trim());
    setSelectedClient(c);
    setClient(full);
    setIsDirty(true);
    setShowClientDropdown(false);
    const cVehs = vehicles.filter(v => {
      const vDoc = (v.ownerDocumento || '').toUpperCase();
      const cDoc = (c.documento || '').toUpperCase();
      return vDoc === cDoc || vDoc.replace(/[^0-9]/g, '') === cDoc.replace(/[^0-9]/g, '');
    });
    if (cVehs.length === 1 && !vehicle) {
      const vDesc = `${cVehs[0].marca} ${cVehs[0].modelo} - ${cVehs[0].placa}`;
      setSelectedVehicle(cVehs[0]);
      setVehicle(vDesc);
    }
  };

  const handleSelectVehicle = (v: Vehicle) => {
    const desc = `${v.marca} ${v.modelo} - ${v.placa}`;
    setSelectedVehicle(v);
    setVehicle(desc);
    setIsDirty(true);
    setShowVehicleDropdown(false);
    if (!selectedClient && v.ownerDocumento) {
      const owner = clients.find(c => {
        const cDoc = (c.documento || '').toUpperCase();
        const vDoc = (v.ownerDocumento || '').toUpperCase();
        return cDoc === vDoc || cDoc.replace(/[^0-9]/g, '') === vDoc.replace(/[^0-9]/g, '');
      });
      if (owner) handleSelectClient(owner);
    }
  };

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
      mechanic: mechanic || null,
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
            <div className="apt-form-group flex-1" style={{ position: 'relative' }}>
              <label>Cliente</label>
              <div className="apt-search-row">
                <div className={`apt-input-wrap flex-1 ${errors.client ? 'has-error' : ''}`}>
                  <User size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar cliente por nombre o cédula..." 
                    value={client} 
                    onChange={e => {
                      handleFieldChange(setClient, e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="primary" 
                  size="sm"
                  onClick={() => setShowClientModal(true)}
                >
                  + Crear nuevo cliente
                </Button>
              </div>
              {errors.client && <span className="error-text">{errors.client}</span>}

              {/* Client dropdown */}
              {showClientDropdown && client.trim().length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 180, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginTop: '4px', zIndex: 40, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  {(() => {
                    const cleanQ = client.trim().toLowerCase();
                    const cleanQAlpha = cleanQ.replace(/[^a-z0-9]/gi, '');
                    const matches = clients.filter(c => {
                      const fullName = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
                      const doc = (c.documento || '').toLowerCase();
                      const docAlpha = doc.replace(/[^a-z0-9]/gi, '');
                      return fullName.includes(cleanQ) || 
                             doc.includes(cleanQ) || 
                             (cleanQAlpha.length >= 2 && docAlpha.includes(cleanQAlpha));
                    });

                    return (
                      <>
                        {matches.map(c => (
                          <div
                            key={c.id}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onClick={() => handleSelectClient(c)}
                          >
                            <div>
                              <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                {capitalizeWords(`${c.nombre} ${c.apellido || ''}`.trim())}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                {c.documento} {c.telefono ? `• ${c.telefono}` : ''}
                              </div>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>Seleccionar</span>
                          </div>
                        ))}
                        {matches.length === 0 && (
                          <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                            No se encontraron clientes con "{client}".
                          </div>
                        )}
                        <button 
                          type="button"
                          style={{ width: '100%', padding: '12px 14px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 600 }}
                          onClick={() => {
                            setShowClientDropdown(false);
                            setShowClientModal(true);
                          }}
                        >
                          <User size={16} />
                          + Crear nuevo cliente "{capitalizeWords(client.trim())}"
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="apt-form-row">
            <div className="apt-form-group flex-1" style={{ position: 'relative' }}>
              <label>Vehiculo</label>
              <div className="apt-search-row">
                <div className={`apt-input-wrap flex-1 ${errors.vehicle ? 'has-error' : ''}`}>
                  <Car size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar vehículo por placa, marca o modelo..." 
                    value={vehicle} 
                    onChange={e => {
                      handleFieldChange(setVehicle, e.target.value.toUpperCase());
                      setShowVehicleDropdown(true);
                    }}
                    onFocus={() => setShowVehicleDropdown(true)}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="primary" 
                  size="sm"
                  onClick={() => setShowVehicleModal(true)}
                >
                  + Crear nuevo vehiculo
                </Button>
              </div>
              {errors.vehicle && <span className="error-text">{errors.vehicle}</span>}

              {/* Suggestions for selected client's vehicles */}
              {selectedClient && vehicle.trim().length === 0 && (() => {
                const cVehs = vehicles.filter(v => {
                  const ownerDoc = (v.ownerDocumento || '').toUpperCase();
                  const cDoc = (selectedClient.documento || '').toUpperCase();
                  return ownerDoc === cDoc || ownerDoc.replace(/[^0-9]/g, '') === cDoc.replace(/[^0-9]/g, '');
                });
                if (cVehs.length === 0) return null;
                return (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Vehículos registrados de este cliente:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {cVehs.map(v => (
                        <button
                          key={v.id || v.placa}
                          type="button"
                          style={{ padding: '6px 10px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-primary)' }}
                          onClick={() => handleSelectVehicle(v)}
                        >
                          <Car size={14} color="var(--color-primary)" />
                          <span>{v.marca} {v.modelo}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>({v.placa})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Vehicle dropdown */}
              {showVehicleDropdown && vehicle.trim().length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 180, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginTop: '4px', zIndex: 40, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  {(() => {
                    const cleanVQ = vehicle.trim().toUpperCase();
                    const matches = vehicles.filter(v => {
                      const plate = (v.placa || '').toUpperCase();
                      const makeModel = `${v.marca || ''} ${v.modelo || ''}`.toUpperCase();
                      return plate.includes(cleanVQ) || makeModel.includes(cleanVQ);
                    });

                    return (
                      <>
                        {matches.map(v => (
                          <div
                            key={v.id || v.placa}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onClick={() => handleSelectVehicle(v)}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>{v.marca} {v.modelo}</div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                Placa: {v.placa} {v.color ? `• Color: ${v.color}` : ''} {v.ano ? `• Año: ${v.ano}` : ''}
                              </div>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>Seleccionar</span>
                          </div>
                        ))}
                        {matches.length === 0 && (
                          <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                            No se encontraron vehículos con "{vehicle}".
                          </div>
                        )}
                        <button 
                          type="button"
                          style={{ width: '100%', padding: '12px 14px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 600 }}
                          onClick={() => {
                            setShowVehicleDropdown(false);
                            setShowVehicleModal(true);
                          }}
                        >
                          <Car size={16} />
                          + Registrar nuevo vehículo "{vehicle}"
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
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
                {activePersonnel.map(p => (
                  <option key={p.id} value={p.name}>
                    {p.name} {p.specialty ? `(${p.specialty})` : ''}
                  </option>
                ))}
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

      {showClientModal && (
        <ClientModal 
          onClose={() => setShowClientModal(false)}
          initialName={client}
          onSave={(newClient) => {
            handleSelectClient(newClient);
            setShowClientModal(false);
          }}
        />
      )}

      {showVehicleModal && (
        <VehicleModal 
          onClose={() => setShowVehicleModal(false)}
          initialPlaca={vehicle}
          ownerDocumento={selectedClient?.documento}
          onSave={(newVeh) => {
            handleSelectVehicle(newVeh);
            setShowVehicleModal(false);
          }}
        />
      )}
    </Modal>
  );
};