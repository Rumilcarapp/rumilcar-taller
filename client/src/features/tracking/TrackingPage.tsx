import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkOrderStore } from '../../store/useWorkOrderStore';
import { useCashStore } from '../../store/useCashStore';
import { DocumentPrintModal } from '../workOrders/components/DocumentPrintModal';
import { 
  Wrench, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Send, 
  Printer, 
  AlertCircle, 
  ShieldCheck,
  ChevronRight,
  Car,
  PhoneCall
} from 'lucide-react';
import './TrackingPage.css';

export const TrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workOrders } = useWorkOrderStore();
  const { exchangeRateVES } = useCashStore();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Find order by ID or Plate
  const order = workOrders.find(
    (o) =>
      o.id.toLowerCase() === id?.toLowerCase() ||
      o.vehicle?.placa?.toLowerCase() === id?.toLowerCase()
  ) || workOrders[0]; // fallback to first for demo if invalid id

  if (!order) {
    return (
      <div className="tracking-wrapper">
        <div className="tracking-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2>Orden no encontrada</h2>
          <p style={{ color: '#64748b' }}>No pudimos localizar una orden con el identificador <strong>{id}</strong>.</p>
          <button 
            onClick={() => navigate('/')} 
            style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '8px', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    );
  }

  const rate = exchangeRateVES || 65;
  const totalUSD = order.totalUSD || 0;
  const totalVES = totalUSD * rate;

  const paidUSD = (order.payments || []).reduce((acc, p) => acc + (p.amountUSD || 0), 0);
  const pendingUSD = Math.max(0, totalUSD - paidUSD);

  // Stepper state calculation
  let currentStep = 1;
  if (order.status === 'Recibido') currentStep = 1;
  else if (order.status === 'Presupuesto') currentStep = 2;
  else if (order.status === 'En Proceso') currentStep = 3;
  else if (order.status === 'Listo') currentStep = 4;
  else if (order.status === 'Finalizado') currentStep = 5;

  const steps = [
    {
      num: 1,
      title: 'Vehículo Ingresado al Taller',
      desc: `Registrado el ${new Date(order.date).toLocaleDateString()} e inventario inicial completado.`,
      icon: <Car size={18} />,
    },
    {
      num: 2,
      title: 'Diagnóstico & Cotización',
      desc: 'Inspección técnica realizada y presupuesto de repuestos aprobado.',
      icon: <FileText size={18} />,
    },
    {
      num: 3,
      title: 'En Reparación Mecánica',
      desc: `Mecánico asignado: ${order.mechanicName || 'Especialista en Planta'}.`,
      icon: <Wrench size={18} />,
    },
    {
      num: 4,
      title: 'Pruebas de Calidad & Listo para Retiro',
      desc: 'Tu vehículo ha sido probado y está listo para ser retirado en el taller.',
      icon: <CheckCircle2 size={18} />,
    },
    {
      num: 5,
      title: 'Entregado & Garantía Activa',
      desc: 'Servicio completado con garantía de 30 días o 1.000 KM.',
      icon: <ShieldCheck size={18} />,
    },
  ];

  return (
    <div className="tracking-wrapper">
      <div className="tracking-card">
        
        {/* Header */}
        <div className="tracking-header">
          <div className="tracking-logo">
            <span>🔧 RUMILCAR TALLER MECÁNICO</span>
          </div>
          <h1 className="tracking-title">Estado de tu Vehículo en Vivo</h1>
          <div className="tracking-order-badge">
            Orden #{order.id}
          </div>
        </div>

        {/* Content */}
        <div className="tracking-content">
          
          {/* Vehicle Box */}
          <div className="tracking-veh-box">
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Vehículo en Servicio
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {order.vehicle?.marca} {order.vehicle?.modelo} ({order.vehicle?.ano || '2020'})
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Propietario: <strong>{order.client?.nombre} {order.client?.apellido}</strong>
              </div>
            </div>

            <div className="tracking-plate-badge">
              {order.vehicle?.placa}
            </div>
          </div>

          {/* Stepper Timeline */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
              Progreso de la Reparación:
            </h3>

            <div className="tracking-stepper">
              {steps.map((s, idx) => {
                const isCompleted = s.num < currentStep || (currentStep === 5 && s.num === 5);
                const isActive = s.num === currentStep && currentStep !== 5;
                const isLast = idx === steps.length - 1;

                return (
                  <div
                    key={s.num}
                    className={`tracking-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                  >
                    {!isLast && <div className="tracking-step-line" />}
                    
                    <div className="tracking-step-icon">
                      {isCompleted ? <CheckCircle2 size={20} /> : s.num}
                    </div>

                    <div className="tracking-step-info">
                      <div className="tracking-step-title" style={{ color: isActive ? '#2563eb' : isCompleted ? '#10b981' : '#64748b' }}>
                        {s.title} {isActive && <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px' }}>En Curso</span>}
                      </div>
                      <p className="tracking-step-desc">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Services & Parts Accordion Summary */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Servicios y Repuestos de la Orden
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              {(order.services || []).map((s, idx) => (
                <div key={'s-' + idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                  <span>🔧 {s.name || s.nombre}</span>
                  <strong>${(s.price || s.precio || 0).toFixed(2)}</strong>
                </div>
              ))}
              {(order.parts || []).map((p, idx) => (
                <div key={'p-' + idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                  <span>📦 {p.quantity || 1}x {p.name || p.nombre}</span>
                  <strong>${((p.quantity || 1) * (p.price || 0)).toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="tracking-financial-box">
            <div className="tracking-total-row">
              <span style={{ color: '#64748b' }}>Total del Servicio:</span>
              <strong style={{ fontSize: '15px' }}>${totalUSD.toFixed(2)} USD</strong>
            </div>
            <div className="tracking-total-row" style={{ color: '#dc2626' }}>
              <span>Equivalente oficial en Bolívares:</span>
              <strong>Bs {totalVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })}</strong>
            </div>

            {pendingUSD > 0 ? (
              <div className="tracking-due-banner">
                <span>Saldo pendiente por cancelar:</span>
                <span style={{ fontSize: '16px' }}>${pendingUSD.toFixed(2)} USD</span>
              </div>
            ) : (
              <div className="tracking-paid-banner">
                ✅ Orden cancelada al 100%
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="tracking-actions">
            <a
              href={`https://wa.me/584141234567?text=${encodeURIComponent(`Hola, quisiera consultar sobre mi orden #${order.id} del vehículo ${order.vehicle?.marca} ${order.vehicle?.modelo} (${order.vehicle?.placa})`)}`}
              target="_blank"
              rel="noreferrer"
              className="tracking-btn-whatsapp"
            >
              <Send size={18} /> Contactar a mi Asesor por WhatsApp
            </a>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Printer size={16} /> Ver Presupuesto / Comprobante Oficial en PDF
            </button>
          </div>

        </div>

      </div>

      {/* Document Print Modal */}
      <DocumentPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        order={order}
        documentType={order.status === 'Presupuesto' ? 'PRESUPUESTO' : 'ORDEN'}
      />
    </div>
  );
};
