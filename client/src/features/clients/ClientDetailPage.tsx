import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClientStore } from '../../store/useClientStore';
import { useVehicleStore } from '../../store/useVehicleStore';
import { useWorkOrderStore } from '../../store/useWorkOrderStore';
import { Button, Card, Input } from '../../components/ui';
import { ArrowLeft, Car, FileText, Plus, Phone, MapPin, User, Settings } from 'lucide-react';
import { VehicleModal } from '../workOrders/components/VehicleModal';
import { WorkOrderListCard } from '../workOrders/components/WorkOrderListCard';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { clients, updateClient } = useClientStore();
  const { vehicles } = useVehicleStore();
  const { workOrders, updateOrderStatus, deleteWorkOrder } = useWorkOrderStore();

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const client = clients.find(c => c.id === id);

  if (!client) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Cliente no encontrado</h2>
        <Button onClick={() => navigate('/clientes')} icon={<ArrowLeft size={16} />}>Volver a la lista</Button>
      </div>
    );
  }

  // State for editing
  const [nombre, setNombre] = useState(client.nombre);
  const [apellido, setApellido] = useState(client.apellido);
  const [telefono, setTelefono] = useState(client.telefono);
  const [direccion, setDireccion] = useState(client.direccion);

  const clientVehicles = vehicles.filter(v => v.ownerDocumento === client.documento);
  const clientOrders = workOrders.filter(wo => wo.client?.documento === client.documento);
  const activeOrders = clientOrders.filter(wo => wo.status !== 'Finalizado' && wo.status !== 'Rechazado' && wo.status !== 'Presupuesto');
  const outstandingBalance = activeOrders.reduce((acc, wo) => acc + (wo.totalUSD || 0), 0);

  const handleUpdateProfile = () => {
    updateClient(client.id, { nombre, apellido, telefono, direccion });
    setIsEditing(false);
    alert('Datos del cliente actualizados!');
  };

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="back-button" onClick={() => navigate('/clientes')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
        <h1 className="page-title">{client.nombre} {client.apellido}</h1>
        {client.type === 'empresa' && <span style={{ padding: '4px 10px', background: 'var(--color-bg-secondary)', borderRadius: '12px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Empresa</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
        
        {/* LEFT COLUMN: Profile info & Outstanding balance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Profile Card */}
          <Card title="Perfil del Cliente">
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input label="Nombre / Razon Social" value={nombre} onChange={e => setNombre(e.target.value)} />
                {client.type === 'persona' && <Input label="Apellido" value={apellido} onChange={e => setApellido(e.target.value)} />}
                <Input label="Telefono" value={telefono} onChange={e => setTelefono(e.target.value)} />
                <Input label="Direccion" value={direccion} onChange={e => setDireccion(e.target.value)} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="btn-flex">Cancelar</Button>
                  <Button size="sm" onClick={handleUpdateProfile} className="btn-flex">Guardar</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{client.nombre} {client.apellido}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{client.documento}</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                    <Phone size={16} />
                    <span>+58 {client.telefono || 'Sin telefono'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                    <MapPin size={16} />
                    <span>{client.direccion || 'Sin direccion'}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" icon={<Settings size={14} />} onClick={() => setIsEditing(true)} style={{ marginTop: '8px' }}>
                  Editar Perfil
                </Button>
              </div>
            )}
          </Card>

          {/* Account Balance Card */}
          <Card>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Saldo Pendiente</div>
              <strong style={{ fontSize: '32px', color: outstandingBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700 }}>
                ${outstandingBalance.toFixed(2)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                {activeOrders.length} Ordenes de trabajo activas por pagar.
              </div>
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: Associated Vehicles & Work history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Associated Vehicles */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Car size={18} />
                Vehiculos Asociados ({clientVehicles.length})
              </h3>
              <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setShowVehicleModal(true)}>
                Asociar Vehiculo
              </Button>
            </div>

            {clientVehicles.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
                Este cliente aun no tiene vehiculos registrados.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {clientVehicles.map(veh => (
                  <div 
                    key={veh.id}
                    onClick={() => navigate(`/vehiculos/${veh.id}`)}
                    style={{ padding: '12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                    className="hover-card"
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{veh.marca} {veh.modelo}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>PLACA: {veh.placa}</div>
                    </div>
                    <span style={{ fontSize: '11px', background: 'var(--color-bg-primary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      {veh.ano || 'S/A'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Work History */}
          <Card>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} />
              Historial de Trabajos y Presupuestos
            </h3>

            {clientOrders.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
                No hay historial de trabajos registrados para este cliente.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clientOrders.map(order => (
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

      {showVehicleModal && (
        <VehicleModal 
          onClose={() => setShowVehicleModal(false)} 
          ownerDocumento={client.documento} 
        />
      )}
    </div>
  );
};