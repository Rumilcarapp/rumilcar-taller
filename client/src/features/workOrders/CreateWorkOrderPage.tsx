import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Button, Card, Input } from '../../components/ui';
import { ArrowLeft, UserPlus, Car, Info, Plus } from 'lucide-react';
import { ClientModal } from './components/ClientModal';
import { VehicleModal } from './components/VehicleModal';
import { PhotoUploader } from './components/PhotoUploader';
import { VehicleInspectionPanel } from './components/VehicleInspectionPanel';
import { ServiceLine, ServiceLineItem } from './components/ServiceLineItem';
import { PartLine, PartLineItem } from './components/PartLineItem';
import { OrderSummary } from './components/OrderSummary';
import { handlePrintOrder, handleWhatsAppShare } from '../../lib/orderActions';
import { useWorkOrderStore } from '../../store/useWorkOrderStore';
import './CreateWorkOrderPage.css';

export const CreateWorkOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isBudget = location.pathname.includes('/presupuestos');
  const { workOrders, updateWorkOrder } = useWorkOrderStore();
  
  // Modals state
  const [showClientModal, setShowClientModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  
  // Search state
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Inspection & Reception State (Kilometraje, Gasolina, Pertenencias, Fotos)
  const [mileage, setMileage] = useState<string | number>('');
  const [mileageUnit, setMileageUnit] = useState<'km' | 'mi'>('km');
  const [fuelPercentage, setFuelPercentage] = useState<number>(50);
  const [fuelLevel, setFuelLevel] = useState<string>('1/2 Tanque');
  const [belongings, setBelongings] = useState<string[]>(['Caucho de repuesto', 'Gato y palanca']);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionPhotos, setInspectionPhotos] = useState<any[]>([]);
  const [mechanicId, setMechanicId] = useState('');

  // Lines State
  const [services, setServices] = useState<ServiceLine[]>([]);
  const [parts, setParts] = useState<PartLine[]>([]);

  useEffect(() => {
    if (id) {
      const existingOrder = workOrders.find(wo => wo.id === id);
      if (existingOrder) {
        setSelectedClient(existingOrder.client);
        setSelectedVehicle(existingOrder.vehicle);
        setServices(existingOrder.services || []);
        setParts(existingOrder.parts || []);
        if (existingOrder.mileage !== undefined) setMileage(existingOrder.mileage);
        if (existingOrder.mileageUnit) setMileageUnit(existingOrder.mileageUnit);
        if (existingOrder.fuelPercentage !== undefined) setFuelPercentage(existingOrder.fuelPercentage);
        if (existingOrder.fuelLevel) setFuelLevel(existingOrder.fuelLevel);
        if (existingOrder.belongings) setBelongings(existingOrder.belongings);
        if (existingOrder.inspectionNotes) setInspectionNotes(existingOrder.inspectionNotes);
        if (existingOrder.photos) setInspectionPhotos(existingOrder.photos);
      }
    }
  }, [id, workOrders]);

  // If vehicle has previous mileage, pre-fill when selected
  useEffect(() => {
    if (selectedVehicle && !mileage && selectedVehicle.kilometraje) {
      setMileage(selectedVehicle.kilometraje);
    }
  }, [selectedVehicle]);

  const handleSaveClient = (client: any) => {
    setSelectedClient(client);
    setClientSearch('');
  };

  const handleSaveVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setVehicleSearch('');
  };

  const handleAddService = () => {
    const newService: ServiceLine = {
      id: Math.random().toString(),
      name: '',
      description: '',
      price: 0,
      currency: 'USD'
    };
    setServices([...services, newService]);
  };

  const handleUpdateService = (updated: ServiceLine) => {
    setServices(services.map(s => s.id === updated.id ? updated : s));
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleAddPart = () => {
    const newPart: PartLine = {
      id: Math.random().toString(),
      name: '',
      quantity: 1,
      price: 0,
      currency: 'USD',
      isManual: true
    };
    setParts([...parts, newPart]);
  };

  const handleUpdatePart = (updated: PartLine) => {
    setParts(parts.map(p => p.id === updated.id ? updated : p));
  };

  const handleRemovePart = (id: string) => {
    setParts(parts.filter(p => p.id !== id));
  };

  const { addWorkOrder } = useWorkOrderStore();

  const buildMockOrder = (totalUSD?: number) => ({
    id: id || 'BORRADOR',
    client: selectedClient,
    vehicle: selectedVehicle ? { ...selectedVehicle, kilometraje: mileage !== '' ? Number(mileage) : selectedVehicle.kilometraje } : null,
    services,
    parts,
    date: new Date().toISOString(),
    totalUSD: totalUSD || 0,
    status: (isBudget ? 'Presupuesto' : 'Recibido') as any,
    mileage: mileage !== '' ? Number(mileage) : undefined,
    mileageUnit,
    fuelPercentage,
    fuelLevel,
    belongings,
    inspectionNotes,
    photos: inspectionPhotos
  });

  const handlePrint = (totalUSD: number) => handlePrintOrder(buildMockOrder(totalUSD));
  const handleWhatsApp = (totalUSD: number) => handleWhatsAppShare(buildMockOrder(totalUSD));

  const handleConvertToOrder = (totalUSD: number) => {
    if (!selectedClient || !selectedVehicle) { alert('Debes seleccionar un cliente y un vehiculo'); return; }
    if (id) {
      updateWorkOrder(id, {
        client: selectedClient,
        vehicle: { ...selectedVehicle, kilometraje: mileage !== '' ? Number(mileage) : selectedVehicle.kilometraje },
        services,
        parts,
        totalUSD,
        status: 'Recibido',
        mileage: mileage !== '' ? Number(mileage) : undefined,
        mileageUnit,
        fuelPercentage,
        fuelLevel,
        belongings,
        inspectionNotes,
        photos: inspectionPhotos
      });
      alert("Presupuesto aprobado y convertido a orden de trabajo!");
      navigate('/trabajos');
    }
  };

  const handleSaveOrder = (totalUSD: number) => {
    if (!selectedClient || !selectedVehicle) { alert('Debes seleccionar un cliente y un vehiculo'); return; }
    const orderPayload = {
      client: selectedClient,
      vehicle: { ...selectedVehicle, kilometraje: mileage !== '' ? Number(mileage) : selectedVehicle.kilometraje },
      services,
      parts,
      totalUSD,
      mileage: mileage !== '' ? Number(mileage) : undefined,
      mileageUnit,
      fuelPercentage,
      fuelLevel,
      belongings,
      inspectionNotes,
      photos: inspectionPhotos
    };

    if (id) {
      updateWorkOrder(id, orderPayload);
    } else {
      addWorkOrder({
        id: 'RMC-2026-' + Math.floor(1000 + Math.random() * 9000).toString(),
        date: new Date().toISOString(),
        status: isBudget ? 'Presupuesto' : 'Recibido',
        ...orderPayload
      });
    }
    alert(isBudget ? "Presupuesto guardado exitosamente!" : "Orden guardada exitosamente!");
    navigate(isBudget ? '/presupuestos' : '/trabajos');
  };

  return (
    <div className="create-wo page-enter">
      <div className="create-wo-header">
        <button className="back-button" onClick={() => navigate(isBudget ? '/presupuestos' : '/trabajos')}>
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
        <h1 className="page-title">{id ? `EDITAR ${isBudget ? 'PRESUPUESTO' : 'ORDEN'} ` + id : `NUEVO ${isBudget ? 'PRESUPUESTO' : 'ORDEN DE TRABAJO'} `}</h1>
        <div style={{ width: 80 }}></div>
      </div>

      <div className="create-wo-content">
        
        {/* LEFT COLUMN: FORM */}
        <div className="wo-form-column">
          
          <div className="wo-grid-2">
            <Card title="1. CLIENTE" className="wo-card-compact">
              {selectedClient ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Info size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{selectedClient.nombre} {selectedClient.apellido}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{selectedClient.documento}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedClient(null)}>Cambiar</Button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div className="flex-row">
                    <Input 
                      placeholder="Buscar cliente..." 
                      value={clientSearch} 
                      onChange={(e) => setClientSearch(e.target.value)} 
                      icon={<Info size={16} />}
                    />
                    <Button variant="outline" icon={<UserPlus size={18} />} onClick={() => setShowClientModal(true)}>NUEVO</Button>
                  </div>
                  {clientSearch.length > 1 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 100, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginTop: '4px', zIndex: 10, padding: '4px' }}>
                      <button 
                        style={{ width: '100%', padding: '12px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}
                        onClick={() => setShowClientModal(true)}
                      >
                        <UserPlus size={16} />
                        No encontrado. + Crear cliente "{clientSearch}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card title="2. VEHICULO" className="wo-card-compact">
              {selectedVehicle ? (
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Car size={16} />
                   </div>
                   <div>
                     <div style={{ fontWeight: 600 }}>{selectedVehicle.marca} {selectedVehicle.modelo}</div>
                     <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>PLACA: {selectedVehicle.placa}</div>
                   </div>
                 </div>
                 <Button variant="outline" size="sm" onClick={() => setSelectedVehicle(null)}>Cambiar</Button>
               </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div className="flex-row">
                    <Input 
                      placeholder="Buscar vehiculo..." 
                      value={vehicleSearch} 
                      onChange={(e) => setVehicleSearch(e.target.value.toUpperCase())}
                    />
                    <Button variant="outline" icon={<Car size={18} />} onClick={() => setShowVehicleModal(true)}>NUEVO</Button>
                  </div>
                  {vehicleSearch.length > 1 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 100, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginTop: '4px', zIndex: 10, padding: '4px' }}>
                      <button 
                        style={{ width: '100%', padding: '12px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}
                        onClick={() => setShowVehicleModal(true)}
                      >
                        <Car size={16} />
                        No encontrado. + Registrar placa "{vehicleSearch}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card className="wo-card-compact">
            <div className="section-header-inline">
              <h3>SERVICIOS REALIZADOS</h3>
              <Button variant="outline" size="sm" icon={<Plus size={16} />} onClick={handleAddService}>
                Agregar servicio
              </Button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {services.length === 0 ? (
                <div className="empty-lines">Haz clic en "Agregar servicio" o búscalo en el catálogo.</div>
              ) : (
                services.map(s => (
                  <ServiceLineItem 
                    key={s.id} 
                    service={s} 
                    onChange={handleUpdateService} 
                    onRemove={() => handleRemoveService(s.id)} 
                  />
                ))
              )}
            </div>
          </Card>

          <Card className="wo-card-compact">
            <div className="section-header-inline">
              <h3>REPUESTOS E INSUMOS</h3>
              <Button variant="outline" size="sm" icon={<Plus size={16} />} onClick={handleAddPart}>
                Agregar repuesto manual
              </Button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {parts.length === 0 ? (
                <div className="empty-lines">Agrega repuestos desde el inventario o manualmente.</div>
              ) : (
                parts.map(p => (
                  <PartLineItem 
                    key={p.id} 
                    part={p} 
                    onChange={handleUpdatePart} 
                    onRemove={() => handleRemovePart(p.id)} 
                  />
                ))
              )}
            </div>
          </Card>

          <Card 
            title="INSPECCION DE INGRESO DEL VEHICULO" 
            className="wo-card-compact"
            action={
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Control de Recepción & Custodia
              </span>
            }
          >
            <VehicleInspectionPanel 
              mileage={mileage}
              onMileageChange={setMileage}
              mileageUnit={mileageUnit}
              onMileageUnitChange={setMileageUnit}
              lastRecordedMileage={selectedVehicle?.kilometraje}
              fuelPercentage={fuelPercentage}
              fuelLevel={fuelLevel}
              onFuelChange={(pct, label) => {
                setFuelPercentage(pct);
                setFuelLevel(label);
              }}
              belongings={belongings}
              onBelongingsChange={setBelongings}
              notes={inspectionNotes}
              onNotesChange={setInspectionNotes}
            />

            <div className="form-group" style={{ marginTop: '18px', marginBottom: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Evidencia fotográfica (Cámara / Galería):
              </label>
              <PhotoUploader photos={inspectionPhotos} onChange={setInspectionPhotos} />
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: SUMMARY */}
        <div className="wo-summary-column">
           <OrderSummary 
             services={services}
             parts={parts}
             onSaveOrder={handleSaveOrder}
             onPrint={handlePrint}
             onWhatsApp={handleWhatsApp}
             isBudget={isBudget}
             onConvertToOrder={id && isBudget ? handleConvertToOrder : undefined}
           />
        </div>

      </div>

      {showClientModal && <ClientModal onClose={() => setShowClientModal(false)} onSave={handleSaveClient} initialName={clientSearch} />}
      {showVehicleModal && <VehicleModal onClose={() => setShowVehicleModal(false)} onSave={handleSaveVehicle} initialPlaca={vehicleSearch} />}
    </div>
  );
};