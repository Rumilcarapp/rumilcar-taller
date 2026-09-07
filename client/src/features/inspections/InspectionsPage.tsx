import React, { useState, useRef } from 'react';
import { useInspectionStore, Inspection, ChecklistItem, DamageMark } from '../../store/useInspectionStore';
import { useVehicleStore } from '../../store/useVehicleStore';
import { Button, Card, EmptyState, Modal } from '../../components/ui';
import { Plus, Search, ClipboardCheck, CheckCircle2, AlertTriangle, XCircle, Camera, X, Gauge, Fuel } from 'lucide-react';
import { CarDamageMap } from './components/CarDamageMap';

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: '1', name: 'Luces principales y cruces', status: 'good' },
  { id: '2', name: 'Presión y estado de neumáticos', status: 'good' },
  { id: '3', name: 'Nivel de fluidos (Aceite, Agua)', status: 'good' },
  { id: '4', name: 'Caucho de repuesto', status: 'good' },
  { id: '5', name: 'Gato y kit de herramientas', status: 'good' },
  { id: '6', name: 'Parabrisas y vidrios intactos', status: 'good' },
  { id: '7', name: 'Tapicería y limpieza interior', status: 'good' }
];

export const InspectionsPage: React.FC = () => {
  const { inspections, addInspection } = useInspectionStore();
  const { vehicles } = useVehicleStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // New inspection form states
  const [selectedPlaca, setSelectedPlaca] = useState('');
  const [mileage, setMileage] = useState<string | number>('');
  const [fuelLevel, setFuelLevel] = useState<string>('1/2');
  const [fuelPercentage, setFuelPercentage] = useState<number>(50);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [damages, setDamages] = useState<DamageMark[]>([]);

  // Detailed view states
  const [viewingInspection, setViewingInspection] = useState<Inspection | null>(null);

  const handleStatusChange = (itemId: string, status: 'good' | 'warning' | 'danger') => {
    setChecklist(prev => prev.map(item => 
      item.id === itemId ? { ...item, status } : item
    ));
  };

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const triggerFileInput = (itemId: string) => {
    fileInputRefs.current[itemId]?.click();
  };

  const handlePhotoUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setChecklist(prev => prev.map(item => 
        item.id === itemId ? { ...item, photoUrl: reader.result as string } : item
      ));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChecklist(prev => prev.map(item => 
      item.id === itemId ? { ...item, photoUrl: undefined } : item
    ));
  };

  const handlePlacaChange = (placa: string) => {
    setSelectedPlaca(placa);
    const veh = vehicles.find(v => v.placa === placa);
    if (veh && (veh as any).kilometraje) {
      setMileage((veh as any).kilometraje);
    }
  };

  const handleSave = () => {
    if (!selectedPlaca) return alert('Debes seleccionar un vehiculo');

    const newIns: Inspection = {
      id: 'INS-' + Date.now().toString().slice(-6),
      vehiclePlaca: selectedPlaca,
      date: new Date().toISOString(),
      fuelLevel,
      fuelPercentage,
      mileage: mileage !== '' ? Number(mileage) : undefined,
      notes,
      checklist,
      damages
    };

    addInspection(newIns);
    setShowModal(false);

    // Reset state
    setSelectedPlaca('');
    setMileage('');
    setFuelPercentage(50);
    setFuelLevel('1/2');
    setNotes('');
    setChecklist(INITIAL_CHECKLIST);
    setDamages([]);
    alert('Inspeccion de recepcion guardada con exito!');
  };

  const getSystemStatusIcon = (status: 'good' | 'warning' | 'danger', size = 16) => {
    switch (status) {
      case 'good': return <CheckCircle2 size={size} color="var(--color-success)" />;
      case 'warning': return <AlertTriangle size={size} color="var(--color-warning)" />;
      case 'danger': return <XCircle size={size} color="var(--color-danger)" />;
    }
  };

  const filteredInspections = inspections.filter(ins => 
    ins.vehiclePlaca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ins.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Inspecciones de Recepción</h1>
          <p className="page-subtitle">Checklists de recepcion de vehiculos con mapas de danos y evidencias fotograficas.</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          Nueva Inspección
        </Button>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0 12px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por placa o notas..." 
              style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredInspections.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={48} />}
            title="No hay inspecciones registradas"
            description="Registra una nueva inspección pre-servicio para cada vehiculo que ingresa al taller."
            action={{ label: "Crear Inspección", onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}>ID / Fecha</th>
                  <th style={{ padding: '12px 8px' }}>Placa Vehiculo</th>
                  <th style={{ padding: '12px 8px' }}>Nivel Combustible</th>
                  <th style={{ padding: '12px 8px' }}>Danos en Carrocería</th>
                  <th style={{ padding: '12px 8px' }}>Checklist (M/F/S/E)</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map(ins => {
                  const dangerCount = ins.checklist.filter(item => item.status === 'danger').length;
                  const warningCount = ins.checklist.filter(item => item.status === 'warning').length;
                  
                  return (
                    <tr key={ins.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{ins.id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(ins.date).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span className="plate-badge" style={{ textTransform: 'uppercase', padding: '2px 6px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                          {ins.vehiclePlaca}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{ins.fuelLevel} Tanque</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: ins.damages.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: ins.damages.length > 0 ? 'red' : 'green' }}>
                          {ins.damages.length} Marcas de daño
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {dangerCount > 0 && <span style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}><XCircle size={14} /> {dangerCount} Criticos</span>}
                          {warningCount > 0 && <span style={{ color: 'var(--color-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}><AlertTriangle size={14} /> {warningCount} Advertencias</span>}
                          {dangerCount === 0 && warningCount === 0 && <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}><CheckCircle2 size={14} /> Todo OK</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <Button size="sm" variant="outline" onClick={() => setViewingInspection(ins)}>Ver Detalle</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* NEW INSPECTION MODAL */}
      {showModal && (
        <Modal 
          isOpen={true} 
          title="Nueva Inspección Pre-Servicio" 
          onClose={() => setShowModal(false)}
          size="lg"
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="danger" onClick={handleSave}>Guardar Inspeccion</Button>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* LEFT COLUMN: Vehicle Details & Damage Map */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Seleccionar Vehiculo</label>
                <select 
                  className="custom-input"
                  value={selectedPlaca}
                  onChange={e => handlePlacaChange(e.target.value)}
                >
                  <option value="">-- Seleccionar Placa --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.placa}>
                      {v.marca} {v.modelo} ({v.placa})
                    </option>
                  ))}
                </select>
              </div>

              {/* KILOMETRAJE ACTUAL */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Gauge size={16} color="var(--color-primary)" />
                    <span>Kilometraje Actual (Odómetro)</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="number"
                    className="custom-input"
                    placeholder="Ej: 85000"
                    value={mileage}
                    onChange={e => setMileage(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ fontWeight: 700, fontSize: '15px' }}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--color-text-muted)', fontSize: '13px' }}>KM</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button type="button" className="btn-action-ghost" style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--color-border)', cursor: 'pointer', background: 'var(--color-bg-secondary)' }} onClick={() => setMileage((Number(mileage) || 0) + 500)}>+500</button>
                  <button type="button" className="btn-action-ghost" style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--color-border)', cursor: 'pointer', background: 'var(--color-bg-secondary)' }} onClick={() => setMileage((Number(mileage) || 0) + 1000)}>+1,000</button>
                  <button type="button" className="btn-action-ghost" style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--color-border)', cursor: 'pointer', background: 'var(--color-bg-secondary)' }} onClick={() => setMileage((Number(mileage) || 0) + 5000)}>+5,000</button>
                </div>
              </div>

              {/* NIVEL DE COMBUSTIBLE */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Fuel size={16} color="var(--color-primary)" />
                    <span>Nivel de Combustible</span>
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: fuelPercentage <= 20 ? 'rgba(239,68,68,0.15)' : fuelPercentage <= 50 ? 'rgba(234,179,8,0.15)' : 'rgba(16,185,129,0.15)', color: fuelPercentage <= 20 ? '#ef4444' : fuelPercentage <= 50 ? '#eab308' : '#10b981' }}>
                    {fuelLevel} ({fuelPercentage}%)
                  </span>
                </div>

                {/* Tank meter bar */}
                <div style={{ height: '14px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '7px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ height: '100%', width: `${Math.max(5, fuelPercentage)}%`, background: fuelPercentage <= 20 ? '#ef4444' : fuelPercentage <= 50 ? '#eab308' : '#10b981', transition: 'width 0.2s ease, background 0.2s ease' }} />
                </div>

                {/* Preset buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
                  {[
                    { label: 'E', name: 'Vacío', pct: 0 },
                    { label: '1/4', name: '1/4', pct: 25 },
                    { label: '1/2', name: '1/2', pct: 50 },
                    { label: '3/4', name: '3/4', pct: 75 },
                    { label: 'F', name: 'Lleno', pct: 100 },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setFuelPercentage(p.pct);
                        setFuelLevel(p.name);
                      }}
                      style={{
                        padding: '6px 2px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: Math.abs(fuelPercentage - p.pct) <= 12 ? 'var(--color-primary)' : 'var(--color-border)',
                        background: Math.abs(fuelPercentage - p.pct) <= 12 ? 'rgba(220, 38, 38, 0.15)' : 'var(--color-bg-secondary)',
                        color: Math.abs(fuelPercentage - p.pct) <= 12 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Range Slider */}
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={fuelPercentage}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setFuelPercentage(val);
                    if (val <= 10) setFuelLevel('Vacío');
                    else if (val <= 35) setFuelLevel('1/4');
                    else if (val <= 65) setFuelLevel('1/2');
                    else if (val <= 85) setFuelLevel('3/4');
                    else setFuelLevel('Lleno');
                  }}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Mapa de Daños de Carrocería</label>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>
                  Haz clic sobre cualquier parte del auto para registrar un Rayon (R), Abolladura (A) o Golpe (G).
                </span>
                <CarDamageMap damages={damages} onChange={setDamages} />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Observaciones de Recepcion</label>
                <textarea 
                  className="custom-input"
                  style={{ minHeight: '60px', padding: '10px', resize: 'vertical' }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Golpes leves en parachoques delantero, sin tapa de gasolina..."
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Checklist Items (Status & Camera) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <strong style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                Checklist de Control
              </strong>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {checklist.map(item => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.name}</span>
                      
                      {/* Control buttons & Camera icon */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleStatusChange(item.id, 'good')}
                          style={{ width: 22, height: 22, border: 'none', borderRadius: '50%', background: item.status === 'good' ? 'var(--color-success)' : 'var(--color-border)', cursor: 'pointer', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✔</button>
                        <button 
                          onClick={() => handleStatusChange(item.id, 'warning')}
                          style={{ width: 22, height: 22, border: 'none', borderRadius: '50%', background: item.status === 'warning' ? 'var(--color-warning)' : 'var(--color-border)', cursor: 'pointer', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >⚠</button>
                        <button 
                          onClick={() => handleStatusChange(item.id, 'danger')}
                          style={{ width: 22, height: 22, border: 'none', borderRadius: '50%', background: item.status === 'danger' ? 'var(--color-danger)' : 'var(--color-border)', cursor: 'pointer', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✖</button>
                        
                        {/* Hidden File Input */}
                        <input 
                          type="file" 
                          ref={el => { fileInputRefs.current[item.id] = el; }}
                          style={{ display: 'none' }}
                          onChange={(e) => handlePhotoUpload(item.id, e)}
                          accept="image/*"
                        />
                        <button 
                          onClick={() => triggerFileInput(item.id)}
                          style={{ width: 26, height: 26, border: '1px solid var(--color-border)', borderRadius: '4px', background: item.photoUrl ? 'var(--color-success-light)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="Adjuntar evidencia fotográfica"
                        >
                          <Camera size={14} color={item.photoUrl ? 'green' : 'var(--color-text-secondary)'} />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail display */}
                    {item.photoUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <img 
                          src={item.photoUrl} 
                          alt="Evidencia" 
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }} 
                        />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Imagen cargada</span>
                        <button 
                          onClick={(e) => handleRemovePhoto(item.id, e)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '11px', display: 'flex', alignItems: 'center' }}
                        >
                          <X size={12} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* DETAIL INSPECTION MODAL */}
      {viewingInspection && (
        <Modal 
          isOpen={true} 
          title={`Inspección Detallada ${viewingInspection.id}`} 
          onClose={() => setViewingInspection(null)}
          size="lg"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left side */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Vehiculo</div>
                <strong style={{ fontSize: '18px' }}>{viewingInspection.vehiclePlaca}</strong>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Kilometraje</div>
                  <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>
                    {viewingInspection.mileage ? `${Number(viewingInspection.mileage).toLocaleString()} KM` : 'No registrado'}
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Nivel de Combustible</div>
                  <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>
                    {viewingInspection.fuelLevel} {viewingInspection.fuelPercentage !== undefined ? `(${viewingInspection.fuelPercentage}%)` : ''}
                  </strong>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Mapa de Daños Registrados</div>
                <CarDamageMap damages={viewingInspection.damages} onChange={() => {}} readOnly={true} />
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Observaciones</div>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '13px' }}>{viewingInspection.notes || 'Sin observaciones.'}</p>
              </div>
            </div>

            {/* Right side checklist display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                Chequeo Técnico Realizado
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {viewingInspection.checklist.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--color-bg-secondary)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{item.name}</div>
                      {item.photoUrl && (
                        <div style={{ marginTop: '8px' }}>
                          <img 
                            src={item.photoUrl} 
                            alt="Evidencia" 
                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }} 
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      {getSystemStatusIcon(item.status, 20)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};