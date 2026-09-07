import React, { useState } from 'react';
import { WorkOrder } from '../../../store/useWorkOrderStore';
import { 
  MoreVertical, 
  User, 
  Car, 
  Calendar, 
  Printer, 
  ArrowRightCircle, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  Link,
  MessageSquare
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { DocumentPrintModal } from './DocumentPrintModal';

interface Props {
  order: WorkOrder;
  onStatusChange: (id: string, status: any) => void;
  onDelete: (id: string) => void;
  onConvertToWorkOrder?: () => void;
  onPayOrder?: (order: WorkOrder) => void;
  onWhatsAppClick?: (order: WorkOrder) => void;
}

const statusColors = {
  'Recibido': 'var(--color-info, #3b82f6)',
  'En Proceso': 'var(--color-warning, #f59e0b)',
  'Listo': '#a855f7',
  'Finalizado': 'var(--color-success, #10b981)',
  'Presupuesto': 'var(--color-primary, #dc2626)',
  'Rechazado': 'var(--color-text-muted, #64748b)',
};

export const WorkOrderListCard: React.FC<Props> = ({ 
  order, 
  onStatusChange, 
  onDelete, 
  onConvertToWorkOrder, 
  onPayOrder,
  onWhatsAppClick 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const navigate = useNavigate();

  const isBudget = order.status === 'Presupuesto' || order.status === 'Rechazado';
  const detailRoute = isBudget ? '/presupuestos/' + order.id : '/trabajos/' + order.id;

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'UN';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handlePayClick = () => {
    if (onPayOrder) {
      onPayOrder(order);
    } else {
      onStatusChange(order.id, 'Finalizado');
    }
  };

  const totalPaid = (order.payments || []).reduce((acc, p) => acc + (p.amountUSD || 0), 0);
  const pendingUSD = Math.max(0, (order.totalUSD || 0) - totalPaid);

  return (
    <>
      <div 
        className="wo-list-card" 
        style={{ 
          borderLeftColor: statusColors[order.status] || 'var(--color-border)', 
          zIndex: showMenu ? 10 : 1 
        }}
      >
        {/* Col 1: ID, Date, Status */}
        <div className="wo-col-identity">
          <div className="wo-id-badge-row">
            <span className="wo-id">#{order.id}</span>
            <span className={`wo-badge status-${order.status.replace(/\s+/g, '').toLowerCase()}`}>
              {order.status}
            </span>
          </div>

          <div className="wo-date">
            <Calendar size={12} />
            <span>{new Date(order.date).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Col 2: Client & Vehicle */}
        <div className="wo-col-client-vehicle">
          <div className="wo-client-name" title={`${order.client?.nombre} ${order.client?.apellido}`}>
            <User size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <span>{order.client?.nombre} {order.client?.apellido}</span>
          </div>

          <div className="wo-vehicle-desc">
            <Car size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
            <span className="wo-vehicle-name">{order.vehicle?.marca} {order.vehicle?.modelo}</span>
            {order.vehicle?.placa && (
              <span className="plate-badge">{order.vehicle?.placa}</span>
            )}
          </div>
        </div>

        {/* Col 3: Technical & Service details */}
        <div className="wo-col-tech">
          <div className="wo-mechanic-box" title={`Mecánico: ${order.mechanicName || 'Sin asignar'}`}>
            <div className="mechanic-avatar">
              {getInitials(order.mechanicName)}
            </div>
            <span>{order.mechanicName?.split(' ')[0] || 'Técnico'}</span>
          </div>

          <div className="wo-services-count">
            {order.services?.length || 0} Serv. · {order.parts?.length || 0} Rep.
          </div>
        </div>

        {/* Col 4: Total & Payment Status */}
        <div className="wo-col-financial">
          <div className="total-amount">
            ${(order.totalUSD || 0).toFixed(2)}
          </div>
          {order.paymentMethod ? (
            <span className="payment-tag">
              ✓ {order.paymentMethod}
            </span>
          ) : pendingUSD > 0 && order.status !== 'Presupuesto' ? (
            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>
              Pendiente: ${pendingUSD.toFixed(2)}
            </span>
          ) : null}
        </div>

        {/* Col 5: Actions */}
        <div className="wo-col-actions">
          {!isBudget && order.status !== 'Finalizado' && (
            <Button 
              size="sm" 
              style={{ background: '#10b981', color: '#fff', borderColor: '#10b981' }} 
              onClick={handlePayClick}
              icon={<DollarSign size={14} />}
            >
              Cobrar
            </Button>
          )}

          {onWhatsAppClick && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onWhatsAppClick(order)}
              icon={<MessageSquare size={14} color="#25D366" />}
              title="Contactar o notificar por WhatsApp"
              style={{ color: '#15803d', borderColor: 'rgba(37, 211, 102, 0.4)' }}
            >
              WhatsApp
            </Button>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPrintModalOpen(true)}
            icon={<Printer size={14} />}
            title="Ver o Imprimir PDF"
          >
            PDF
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(detailRoute)}
          >
            Detalles
          </Button>

          <div className="action-menu-wrapper">
            <button className="icon-btn" onClick={toggleMenu} title="Más opciones">
              <MoreVertical size={16} />
            </button>
            
            {showMenu && (
              <>
                <div className="menu-overlay" onClick={() => setShowMenu(false)}></div>
                <div className="dropdown-menu">
                  {onWhatsAppClick && (
                    <button className="dropdown-item" style={{ color: '#16a34a' }} onClick={() => { onWhatsAppClick(order); setShowMenu(false); }}>
                      <MessageSquare size={14} color="#25D366" /> Enviar WhatsApp al Cliente
                    </button>
                  )}
                  <button className="dropdown-item" onClick={() => { setIsPrintModalOpen(true); setShowMenu(false); }}>
                    <Printer size={14} /> Imprimir Documento (Carta / Ticket)
                  </button>
                  <button className="dropdown-item" onClick={() => { window.open(`/rastreo/${order.id}`, '_blank'); setShowMenu(false); }}>
                    <Link size={14} /> Abrir Portal de Rastreo del Cliente
                  </button>
                  <div className="dropdown-divider"></div>
                  {isBudget && order.status === 'Presupuesto' && onConvertToWorkOrder && (
                    <button className="dropdown-item success-text" onClick={() => { onConvertToWorkOrder(); setShowMenu(false); }}>
                      <CheckCircle size={14} /> Aprobar y Convertir a Trabajo
                    </button>
                  )}
                  {isBudget && order.status === 'Presupuesto' && (
                    <button className="dropdown-item" onClick={() => { onStatusChange(order.id, 'Rechazado'); setShowMenu(false); }}>
                      <XCircle size={14} /> Rechazar Presupuesto
                    </button>
                  )}
                  {isBudget && order.status === 'Rechazado' && (
                    <button className="dropdown-item" onClick={() => { onStatusChange(order.id, 'Presupuesto'); setShowMenu(false); }}>
                      <ArrowRightCircle size={14} /> Reactivar Presupuesto
                    </button>
                  )}
                  {!isBudget && order.status !== 'Recibido' && (
                    <button className="dropdown-item" onClick={() => { onStatusChange(order.id, 'Recibido'); setShowMenu(false); }}>
                      <ArrowRightCircle size={14} /> Mover a Recibido
                    </button>
                  )}
                  {!isBudget && order.status !== 'En Proceso' && (
                    <button className="dropdown-item" onClick={() => { onStatusChange(order.id, 'En Proceso'); setShowMenu(false); }}>
                      <ArrowRightCircle size={14} /> Mover a En Proceso
                    </button>
                  )}
                  {!isBudget && order.status !== 'Listo' && (
                    <button className="dropdown-item" style={{ color: '#a855f7' }} onClick={() => { onStatusChange(order.id, 'Listo'); setShowMenu(false); }}>
                      <CheckCircle size={14} /> Mover a Listo para Entregar
                    </button>
                  )}
                  {!isBudget && order.status !== 'Finalizado' && (
                    <button className="dropdown-item success-text" onClick={() => { handlePayClick(); setShowMenu(false); }}>
                      <CheckCircle size={14} /> Cobrar y Finalizar
                    </button>
                  )}
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item danger-text" onClick={() => { onDelete(order.id); setShowMenu(false); }}>
                    <XCircle size={14} /> {isBudget ? 'Eliminar Presupuesto' : 'Cancelar Orden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Print Modal */}
      <DocumentPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        order={order}
        documentType={isBudget ? 'PRESUPUESTO' : 'ORDEN'}
      />
    </>
  );
};
