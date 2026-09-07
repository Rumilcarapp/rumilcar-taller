import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '../../components/ui';
import { FileText, Plus, List, KanbanSquare } from 'lucide-react';
import { useWorkOrderStore, OrderStatus, WorkOrder } from '../../store/useWorkOrderStore';
import { WorkOrderListCard } from './components/WorkOrderListCard';
import { KanbanBoard } from './components/KanbanBoard';
import { PaymentModal } from './components/PaymentModal';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';
import { getOrderWhatsAppContext } from '../../lib/orderActions';
import './WorkOrdersPage.css';
import './components/Dashboard.css';

type ViewMode = 'list' | 'kanban';
type FilterTab = 'Todas' | OrderStatus;

export const WorkOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { workOrders, updateOrderStatus, deleteWorkOrder } = useWorkOrderStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<FilterTab>('Todas');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Payment & WhatsApp Modal state
  const [payingOrder, setPayingOrder] = useState<WorkOrder | null>(null);
  const [whatsAppOrder, setWhatsAppOrder] = useState<WorkOrder | null>(null);

  const activeWorkOrders = workOrders.filter(wo => wo.status !== 'Presupuesto' && wo.status !== 'Rechazado');
  const filteredOrders = activeWorkOrders.filter(wo => {
    if (activeTab !== 'Todas' && wo.status !== activeTab) return false;
    if (startDate && new Date(wo.date) < new Date(startDate)) return false;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(wo.date) > end) return false;
    }
    return true;
  });

  return (
    <div className="work-orders page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ordenes de Trabajo</h1>
          <p className="page-subtitle">Centro de control de reparaciones, diagnósticos y cobranzas</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista de Lista"
            >
              <List size={18} />
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Vista de Tablero Kanban"
            >
              <KanbanSquare size={18} />
            </button>
          </div>
          <Button onClick={() => navigate('/trabajos/nueva')} icon={<Plus size={18} />}>
            Crear orden
          </Button>
        </div>
      </div>

      <div className="page-content" style={{ marginTop: '16px' }}>
        {workOrders.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} />}
            title="Aun no tienes trabajos activos en el taller."
            description="Las ordenes de trabajo te permiten llevar el control de los servicios, repuestos y la inspeccion visual del vehiculo."
            action={{
              label: "Crear tu primera orden de trabajo",
              onClick: () => navigate('/trabajos/nueva'),
            }}
          />
        ) : (
          <>
            {viewMode === 'list' && (
              <>
                <div className="dashboard-tabs">
                  <button className={`tab-btn ${activeTab === 'Todas' ? 'active' : ''}`} onClick={() => setActiveTab('Todas')}>Todas ({activeWorkOrders.length})</button>
                  <button className={`tab-btn ${activeTab === 'Recibido' ? 'active' : ''}`} onClick={() => setActiveTab('Recibido')}>Recibidas ({activeWorkOrders.filter(o => o.status === 'Recibido').length})</button>
                  <button className={`tab-btn ${activeTab === 'En Proceso' ? 'active' : ''}`} onClick={() => setActiveTab('En Proceso')}>En Proceso ({activeWorkOrders.filter(o => o.status === 'En Proceso').length})</button>
                  <button className={`tab-btn ${activeTab === 'Finalizado' ? 'active' : ''}`} onClick={() => setActiveTab('Finalizado')}>Pagadas / Listas ({activeWorkOrders.filter(o => o.status === 'Finalizado').length})</button>
                </div>

                <div className="work-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>No hay ordenes en este estado.</div>
                  ) : (
                    filteredOrders.map(order => (
                      <WorkOrderListCard 
                        key={order.id} 
                        order={order} 
                        onStatusChange={updateOrderStatus}
                        onDelete={deleteWorkOrder}
                        onPayOrder={(ord) => setPayingOrder(ord)}
                        onWhatsAppClick={(ord) => setWhatsAppOrder(ord)}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {viewMode === 'kanban' && (
              <KanbanBoard 
                orders={workOrders} 
                onStatusChange={updateOrderStatus} 
                onPayOrder={(ord) => setPayingOrder(ord)}
                onWhatsAppClick={(ord) => setWhatsAppOrder(ord)}
              />
            )}
          </>
        )}
      </div>

      {payingOrder && (
        <PaymentModal 
          order={payingOrder} 
          onClose={() => setPayingOrder(null)} 
          onSuccess={() => setPayingOrder(null)}
        />
      )}

      {whatsAppOrder && (
        <WhatsAppModal
          isOpen={!!whatsAppOrder}
          onClose={() => setWhatsAppOrder(null)}
          contextData={getOrderWhatsAppContext(whatsAppOrder)}
        />
      )}
    </div>
  );
};