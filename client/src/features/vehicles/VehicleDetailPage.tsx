import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVehicleStore } from '../../store/useVehicleStore';
import { useClientStore } from '../../store/useClientStore';
import { useWorkOrderStore } from '../../store/useWorkOrderStore';
import { Button, Card, Input } from '../../components/ui';
import { ArrowLeft, User, Car, FileText, Settings, ShieldCheck } from 'lucide-react';
import { WorkOrderListCard } from '../workOrders/components/WorkOrderListCard';

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { vehicles, updateVehicle } = useVehicleStore();
  const { clients } = useClientStore();
  const { workOrders, updateOrderStatus, deleteWorkOrder } = useWorkOrderStore();

  const [isEditing, setIsEditing] = useState(false);

  const vehicle = vehicles.find(v => v.id === id);

  if (!vehicle) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Vehiculo no encontrado</h2>
        <Button onClick={() => navigate('/vehiculos')} icon={<ArrowLeft size={16} />}>Volver a la lista</Button>
      </div>
    );
  }

  // State for editing
  const [marca, setMarca] = useState(vehicle.marca);
  const [modelo, setModelo] = useState(vehicle.modelo);
  const [ano, setAno] = useState(vehicle.ano || '');
  const [color, setColor] = useState(vehicle.color || '');

  const owner = clients.find(c => c.documento === vehicle.ownerDocumento);
  const vehicleOrders = workOrders.filter(wo => wo.vehicle?.placa === vehicle.placa);

  const handleUpdateVehicle = () => {
    updateVehicle(vehicle.id, { marca, modelo, ano, color });
    setIsEditing(false);
    alert('Datos del vehiculo actualizados!');
  };

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="back-button" onClick={() => navigate('/vehiculos')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="plate-badge" style={{ textTransform: 'uppercase', padding: '6px 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', fontWeight: 800, fontSize: '18px' }}>
            {vehicle.placa}
          </span>
          {vehicle.marca} {vehicle.modelo}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
        
        {/* LEFT COLUMN: Vehicle specifications & Owner Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Specs Card */}
          <Card title="Ficha Tecnica">
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input label="Marca" value={marca} onChange={e => setMarca(e.target.value)} />
                <Input label="Modelo" value={modelo} onChange={e => setModelo(e.target.value)} />
                <Input label="Año" value={ano} onChange={e => setAno(e.target.value)} />
                <Input label="Color" value={color} onChange={e => setColor(e.target.value)} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="btn-flex">Cancelar</Button>
                  <Button size="sm" onClick={handleUpdateVehicle} className="btn-flex">Guardar</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{vehicle.marca} {vehicle.modelo}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>PLACA: {vehicle.placa}</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Año</div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{vehicle.ano || 'Sin especificar'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Color</div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{vehicle.color || 'Sin especificar'}</div>
                  </div>
                </div>

                <Button variant="outline" size="sm" icon={<Settings size={14} />} onClick={() => setIsEditing(true)} style={{ marginTop: '8px' }}>
                  Editar Ficha
                </Button>
              </div>
            )}
          </Card>

          {/* Owner Card */}
          <Card title="Propietario Asociado">
            {owner ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{owner.nombre} {owner.apellido}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{owner.documento}</div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate(`/clientes/${owner.id}`)}
                  style={{ marginTop: '8px' }}
                >
                  Ver Perfil Propietario
                </Button>
              </div>
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                Este vehiculo no tiene un propietario registrado en el sistema.
              </div>
            )}
          </Card>

        </div>

        {/* RIGHT COLUMN: Clinical Work history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <Card>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} />
              Historial Clinico de Reparaciones
            </h3>

            {vehicleOrders.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
                No se registran ordenes de trabajo ni presupuestos para este vehiculo.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {vehicleOrders.map(order => (
                  <WorkOrderListCard 
                    key={order.id} 
                    order={order} 
                    onStatusChange={updateOrderStatus}
                    onDelete={deleteWorkOrder}
                  />
                ))}
              </div>
            )}
          </Card>

        </div>

      </div>
    </div>
  );
};