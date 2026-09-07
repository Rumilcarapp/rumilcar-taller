import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '../../components/ui';
import { FileText, Plus, Search } from 'lucide-react';
import { useWorkOrderStore } from '../../store/useWorkOrderStore';
import { WorkOrderListCard } from '../workOrders/components/WorkOrderListCard';

export const BudgetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { workOrders, updateOrderStatus, deleteWorkOrder, convertToWorkOrder } = useWorkOrderStore();
  
  const [activeTab, setActiveTab] = useState<'Todos' | 'Presupuesto' | 'Rechazado'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only budgets
  const budgetOrders = workOrders.filter(wo => wo.status === 'Presupuesto' || wo.status === 'Rechazado');

  const filteredOrders = budgetOrders.filter(wo => {
    if (activeTab !== 'Todos' && wo.status !== activeTab) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchClient = `${wo.client?.nombre || '} ${wo.client?.apellido || '}`.toLowerCase().includes(term);
      const matchVehicle = `${wo.vehicle?.marca || '} ${wo.vehicle?.placa || '}`.toLowerCase().includes(term);
      const matchId = wo.id.toLowerCase().includes(term);
      if (!matchClient && !matchVehicle && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="work-orders page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Presupuestos</h1>
          <p className="page-subtitle">Cotizaciones pendientes por aprobar</p>
        </div>
        <div className="header-actions">
          <Button onClick={() => navigate('/presupuestos/nuevo')} icon={<Plus size={18} />}>
            Crear Presupuesto
          </Button>
        </div>
      </div>

      <div className="page-content" style={{ marginTop: '16px' }}>
        {budgetOrders.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} />}
            title="Aun no tienes presupuestos creados."
            description="Genera cotizaciones para tus clientes y conviertelas a ordenes de trabajo con un clic al ser aprobadas."
            action={{
              label: "Crear tu primer presupuesto",
              onClick: () => navigate('/presupuestos/nuevo'),
            }}
          />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <div className="dashboard-tabs" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                <button className={'tab-btn ' + (activeTab === 'Todos' ? 'active' : '')} onClick={() => setActiveTab('Todos')}>Todos ({budgetOrders.length})</button>
                <button className={'tab-btn ' + (activeTab === 'Presupuesto' ? 'active' : '')} onClick={() => setActiveTab('Presupuesto')}>Pendientes ({budgetOrders.filter(o => o.status === 'Presupuesto').length})</button>
                <button className={'tab-btn ' + (activeTab === 'Rechazado' ? 'active' : '')} onClick={() => setActiveTab('Rechazado')}>Rechazados ({budgetOrders.filter(o => o.status === 'Rechazado').length})</button>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0 12px' }}>
                  <Search size={16} color="var(--color-text-muted)" />
                  <input 
                    type="text" 
                    placeholder="Buscar cliente o placa..." 
                    style={{ padding: '8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="work-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>No se encontraron presupuestos.</div>
              ) : (
                filteredOrders.map(order => (
                  <WorkOrderListCard 
                    key={order.id} 
                    order={order} 
                    onStatusChange={updateOrderStatus}
                    onDelete={deleteWorkOrder}
                    onConvertToWorkOrder={() => convertToWorkOrder(order.id)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
