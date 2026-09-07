import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVehicleStore, Vehicle } from '../../store/useVehicleStore';
import { useClientStore } from '../../store/useClientStore';
import { useWorkOrderStore } from '../../store/useWorkOrderStore';
import { Button, Card, EmptyState } from '../../components/ui';
import { Plus, Search, Car, ArrowRight } from 'lucide-react';
import { VehicleModal } from '../workOrders/components/VehicleModal';

export const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const { vehicles } = useVehicleStore();
  const { clients } = useClientStore();
  const { workOrders } = useWorkOrderStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const getOwnerName = (doc: string) => {
    const owner = clients.find(c => c.documento === doc);
    return owner ? `${owner.nombre} ${owner.apellido}` : 'Desconocido';
  };

  const getHistoryCount = (placa: string) => {
    return workOrders.filter(wo => wo.vehicle?.placa === placa).length;
  };

  const filteredVehicles = vehicles.filter(v => {
    const owner = clients.find(c => c.documento === v.ownerDocumento);
    const ownerName = owner ? `${owner.nombre} ${owner.apellido}`.toLowerCase() : '';
    const ownerDoc = owner ? owner.documento.toLowerCase() : '';
    
    return (
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerName.includes(searchTerm.toLowerCase()) ||
      ownerDoc.includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Vehiculos</h1>
          <p className="page-subtitle">Listado de autos registrados y consulta de historial de servicio.</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          Nuevo Vehiculo
        </Button>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0 12px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por placa, marca, modelo o cliente..." 
              style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredVehicles.length === 0 ? (
          <EmptyState
            icon={<Car size={48} />}
            title="No se encontraron vehiculos"
            description="Registra un carro nuevo y asocialo a un cliente para empezar a registrar su historial."
            action={{ label: "Crear primer vehiculo", onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}>Placa</th>
                  <th style={{ padding: '12px 8px' }}>Vehiculo</th>
                  <th style={{ padding: '12px 8px' }}>Propietario</th>
                  <th style={{ padding: '12px 8px' }}>Año / Color</th>
                  <th style={{ padding: '12px 8px' }}>Servicios Realizados</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map(veh => (
                  <tr 
                    key={veh.id} 
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                    onClick={() => navigate(`/vehiculos/${veh.id}`)}
                  >
                    <td style={{ padding: '12px 8px' }}>
                      <span className="plate-badge" style={{ textTransform: 'uppercase', padding: '4px 8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px', fontWeight: 700, fontSize: '12px' }}>
                        {veh.placa}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {veh.marca} {veh.modelo}
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>
                      {getOwnerName(veh.ownerDocumento)}
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                      {veh.ano || 'S/A'} · {veh.color || 'S/C'}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', background: 'var(--color-bg-secondary)', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        {getHistoryCount(veh.placa)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <Button size="sm" variant="outline" icon={<ArrowRight size={14} />}>Ver Historial</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && <VehicleModal onClose={() => setShowModal(false)} />}
    </div>
  );
};