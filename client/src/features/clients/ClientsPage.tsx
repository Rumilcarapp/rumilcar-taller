import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientStore, Client } from '../../store/useClientStore';
import { useVehicleStore } from '../../store/useVehicleStore';
import { useWorkOrderStore } from '../../store/useWorkOrderStore';
import { Button, Card, EmptyState } from '../../components/ui';
import { Plus, Search, User, FileText, ArrowRight } from 'lucide-react';
import { ClientModal } from '../workOrders/components/ClientModal';

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { clients } = useClientStore();
  const { vehicles } = useVehicleStore();
  const { workOrders } = useWorkOrderStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const getVehicleCount = (doc: string) => vehicles.filter(v => v.ownerDocumento === doc).length;

  const getOutstandingBalance = (doc: string) => {
    return workOrders
      .filter(wo => wo.client?.documento === doc && wo.status !== 'Finalizado' && wo.status !== 'Rechazado' && wo.status !== 'Presupuesto')
      .reduce((acc, wo) => acc + (wo.totalUSD || 0), 0);
  };

  const filteredClients = clients.filter(c => 
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.documento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Gestiona la base de datos de tus clientes y sus vehiculos asociados.</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0 12px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o cedula/RIF..." 
              style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <EmptyState
            icon={<User size={48} />}
            title="No se encontraron clientes"
            description="Registra un nuevo cliente para empezar a asociarle vehiculos y ordenes de trabajo."
            action={{ label: "Crear primer cliente", onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}>Nombre / Razon Social</th>
                  <th style={{ padding: '12px 8px' }}>Documento</th>
                  <th style={{ padding: '12px 8px' }}>Telefono</th>
                  <th style={{ padding: '12px 8px' }}>Vehiculos</th>
                  <th style={{ padding: '12px 8px' }}>Saldo Pendiente</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => {
                  const balance = getOutstandingBalance(client.documento);
                  return (
                    <tr 
                      key={client.id} 
                      style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                      onClick={() => navigate(`/clientes/${client.id}`)}
                    >
                      <td style={{ padding: '12px 8px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {client.nombre} {client.apellido}
                        {client.type === 'empresa' && <span style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 6px', background: 'var(--color-bg-secondary)', borderRadius: '4px', color: 'var(--color-text-muted)' }}>Empresa</span>}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>{client.documento}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>{client.telefono ? `+58 ${client.telefono}` : '-'}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ padding: '2px 8px', background: 'var(--color-bg-secondary)', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                          {getVehicleCount(client.documento)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: balance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {balance > 0 ? `$${balance.toFixed(2)}` : 'Al dia'}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <Button size="sm" variant="outline" icon={<ArrowRight size={14} />}>Detalles</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && <ClientModal onClose={() => setShowModal(false)} />}
    </div>
  );
};