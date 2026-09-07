import React, { useState } from 'react';
import { WorkOrder, OrderStatus } from '../../../store/useWorkOrderStore';
import { Car, User, MessageCircle, DollarSign } from 'lucide-react';

interface Props {
  orders: WorkOrder[];
  onStatusChange: (id: string, status: OrderStatus) => void;
  onPayOrder?: (order: WorkOrder) => void;
  onWhatsAppClick?: (order: WorkOrder) => void;
}

const KANBAN_COLUMNS: { id: OrderStatus; title: string; color: string }[] = [
  { id: 'Recibido', title: 'Recibidos', color: '#3b82f6' },
  { id: 'En Proceso', title: 'En Proceso', color: '#f59e0b' },
  { id: 'Finalizado', title: 'Listos / Pagados', color: '#10b981' }
];

export const KanbanBoard: React.FC<Props> = ({ orders, onStatusChange, onPayOrder, onWhatsAppClick }) => {
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedOrderId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: OrderStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const orderId = e.dataTransfer.getData('text/plain');
    if (orderId && draggedOrderId === orderId) {
      const order = orders.find(o => o.id === orderId);
      if (order && order.status !== columnId) {
        if (columnId === 'Finalizado' && onPayOrder) {
          onPayOrder(order);
        } else {
          onStatusChange(orderId, columnId);
        }
      }
    }
    setDraggedOrderId(null);
  };

  return (
    <div className="kanban-board">
      {KANBAN_COLUMNS.map(col => {
        const colOrders = orders.filter(o => o.status === col.id);
        const isOver = dragOverColumn === col.id;
        
        return (
          <div 
            key={col.id}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="kanban-col-header" style={{ borderBottomColor: col.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: col.color }}></div>
                <h3>{col.title}</h3>
              </div>
              <span className="kanban-badge">{colOrders.length}</span>
            </div>
            
            <div className="kanban-col-body">
              {colOrders.map(order => (
                <div 
                  key={order.id}
                  className={`kanban-card ${draggedOrderId === order.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, order.id)}
                  onDragEnd={() => setDraggedOrderId(null)}
                  style={{ borderLeftColor: col.color }}
                >
                  <div className="kc-header">
                    <span className="kc-id">{order.id}</span>
                    <span className="kc-total">${order.totalUSD?.toFixed(0)}</span>
                  </div>
                  <div className="kc-body">
                    <div className="kc-row"><User size={12}/> {order.client?.nombre}</div>
                    <div className="kc-row"><Car size={12}/> {order.vehicle?.marca} ({order.vehicle?.placa})</div>
                    {order.paymentMethod && (
                      <div style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600, marginTop: '4px' }}>
                        ✓ Pagado con {order.paymentMethod}
                      </div>
                    )}
                  </div>
                   <div className="kc-footer">
                      <div className="kc-mechanic" title={order.mechanicName}>
                        {order.mechanicName ? order.mechanicName.substring(0,2).toUpperCase() : 'UN'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {onWhatsAppClick && (
                          <button 
                            className="kc-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onWhatsAppClick(order);
                            }}
                            title="Contactar al cliente por WhatsApp"
                            style={{ color: '#25D366' }}
                          >
                            <MessageCircle size={14}/>
                          </button>
                        )}
                        {order.status !== 'Finalizado' && onPayOrder && (
                          <button 
                            className="kc-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onPayOrder(order);
                            }} 
                            title="Cobrar Orden"
                            style={{ color: 'var(--color-success)' }}
                          >
                            <DollarSign size={14}/>
                          </button>
                        )}
                      </div>
                   </div>
                </div>
              ))}
              {colOrders.length === 0 && <div className="kanban-empty">Arrastra una orden aquí</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};