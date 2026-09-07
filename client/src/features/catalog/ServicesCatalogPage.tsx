import React, { useState } from 'react';
import { useCatalogStore, CatalogService } from '../../store/useCatalogStore';
import { Button, Card, EmptyState } from '../../components/ui';
import { Plus, Search, Settings, Edit2, Power } from 'lucide-react';
import { ServiceModal } from './components/ServiceModal';
import './ServicesCatalogPage.css'; // We'll add some specific styles if needed or reuse globals

export const ServicesCatalogPage: React.FC = () => {
  const { services, toggleServiceStatus } = useCatalogStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<CatalogService | undefined>(undefined);

  const { addService, updateService } = useCatalogStore();

  const handleSaveService = (service: CatalogService) => {
    if (editingService) {
      updateService(service.id, service);
    } else {
      addService(service);
    }
    setIsModalOpen(false);
  };

  const openNewModal = () => {
    setEditingService(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (service: CatalogService) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Catálogo de Servicios</h1>
          <p className="page-subtitle">Administra los servicios estándar y precios base del taller.</p>
        </div>
        <Button onClick={openNewModal} icon={<Plus size={18} />}>
          Agregar servicio
        </Button>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0 12px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o descripción..." 
              style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredServices.length === 0 ? (
          <EmptyState
            icon={<Settings size={48} />}
            title="No se encontraron servicios"
            description="Agrega servicios a tu catálogo para agilizar la creación de órdenes de trabajo."
            action={{ label: "Crear primer servicio", onClick: openNewModal }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}>Nombre del Servicio</th>
                  <th style={{ padding: '12px 8px' }}>Precio Base</th>
                  <th style={{ padding: '12px 8px' }}>Tiempo Est.</th>
                  <th style={{ padding: '12px 8px' }}>Estado</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map(service => (
                  <tr key={service.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: service.isActive ? 1 : 0.5 }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{service.name}</div>
                      {service.description && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{service.description.length > 60 ? service.description.substring(0, 60) + '...' : service.description}</div>}
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                      {service.currency === 'USD' || service.currency === 'USDT' ? '$' : 'Bs.'}{service.basePrice.toFixed(2)} <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>{service.currency}</span>
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>
                      {service.estimatedTime ? `${service.estimatedTime} ${service.timeUnit === 'minutes' ? 'min' : 'hrs'}` : '-'}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        background: service.isActive ? 'var(--color-success)' : 'var(--color-bg-secondary)',
                        color: service.isActive ? '#fff' : 'var(--color-text-muted)',
                      }}>
                        {service.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="icon-btn" onClick={() => openEditModal(service)} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-btn" onClick={() => toggleServiceStatus(service.id)} title={service.isActive ? "Desactivar" : "Activar"}>
                          <Power size={16} color={service.isActive ? 'var(--color-danger)' : 'var(--color-success)'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isModalOpen && (
        <ServiceModal 
          initialService={editingService} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveService} 
        />
      )}
    </div>
  );
};