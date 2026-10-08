import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkOrderStore, WorkOrder } from '../../store/useWorkOrderStore';
import { useCashStore } from '../../store/useCashStore';
import { useWorkshopStore } from '../../store/useWorkshopStore';
import { DocumentPrintModal } from '../workOrders/components/DocumentPrintModal';
import { getApiUrl } from '../../services/api';
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
  PhoneCall,
  Star,
  Loader2,
  Camera,
  Calendar,
  User,
  CheckCircle
} from 'lucide-react';
import { normalizePhoneNumber } from '../../lib/whatsapp';
import './TrackingPage.css';

export const TrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workshop } = useWorkshopStore();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [workshopData, setWorkshopData] = useState<any>(null);
  const [rateVES, setRateVES] = useState<number>(65);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTracking = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const cleanId = id.trim();
        const res = await fetch(`${getApiUrl()}/work-orders/tracking/${encodeURIComponent(cleanId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.order) {
            setOrder(data.order);
            if (data.workshop) {
              setWorkshopData(data.workshop);
              useWorkshopStore.getState().updateWorkshop(data.workshop);
            }
            if (data.exchangeRateVES) {
              setRateVES(data.exchangeRateVES);
              useCashStore.getState().setExchangeRateVES(data.exchangeRateVES);
            }
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Error al consultar endpoint de tracking, intentando caché local...', err);
      }

      // Respaldo: si el endpoint no responde o se navega dentro del taller, buscar en memoria
      const localOrders = useWorkOrderStore.getState().workOrders;
      const found = localOrders.find(
        (o) =>
          o.id.toLowerCase() === id?.toLowerCase() ||
          o.vehicle?.placa?.toLowerCase() === id?.toLowerCase() ||
          (o.orderNumber && String(o.orderNumber) === id)
      );

      if (isMounted) {
        if (found) {
          setOrder(found);
          const currentWorkshop = useWorkshopStore.getState().workshop;
          if (currentWorkshop) setWorkshopData(currentWorkshop);
          const currentRate = useCashStore.getState().exchangeRateVES;
          if (currentRate) setRateVES(currentRate);
        }
        setLoading(false);
      }
    };

    fetchTracking();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="tracking-wrapper">
        <div className="tracking-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Loader2 size={44} className="spin-animation" style={{ color: '#dc2626', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
            Cargando seguimiento en vivo...
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Consultando el estado más reciente de tu vehículo
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="tracking-wrapper">
        <div className="tracking-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2>Orden no encontrada</h2>
          <p style={{ color: '#64748b' }}>
            No pudimos localizar una orden con el identificador <strong>{id}</strong>.
          </p>
          <button 
            onClick={() => navigate('/')} 
            style={{ 
              marginTop: '16px', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              background: '#dc2626', 
              color: '#fff', 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: 700 
            }}
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    );
  }

  const rate = rateVES || useCashStore.getState().exchangeRateVES || 65;
  const totalUSD = order.totalUSD || 0;
  const totalVES = totalUSD * rate;

  const paidUSD = (order.payments || []).reduce((acc: number, p: any) => acc + (p.amountUSD || 0), 0);
  const pendingUSD = Math.max(0, totalUSD - paidUSD);

  // Normalizar el estado
  const normStatus = (order.status || '').toLowerCase();
  let currentStep = 1;
  if (normStatus === 'recibido' || normStatus === 'received') currentStep = 1;
  else if (normStatus === 'presupuesto') currentStep = 2;
  else if (normStatus === 'en proceso' || normStatus === 'in_progress') currentStep = 3;
  else if (normStatus === 'listo' || normStatus === 'ready') currentStep = 4;
  else if (normStatus === 'finalizado' || normStatus === 'delivered') currentStep = 5;

  const displayOrderTag = order.orderNumber 
    ? `OT-${order.orderNumber}` 
    : (order.id.length > 10 ? order.id.slice(0, 8) : order.id);

  const workshopName = workshopData?.name || workshop?.name || 'RUMILCAR TALLER MECÁNICO';
  const workshopLogo = workshopData?.logoUrl || workshop?.logoUrl || '/logo-tight.png';

  const steps = [
    {
      num: 1,
      title: 'Vehículo Ingresado al Taller',
      desc: `Registrado el ${new Date(order.date || Date.now()).toLocaleDateString('es-VE')} e inventario inicial completado.`,
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
            <img src={workshopLogo} alt={workshopName} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span>{workshopName.toUpperCase()}</span>
          </div>
          <h1 className="tracking-title">Estado de tu Vehículo en Vivo</h1>
          <div className="tracking-order-badge">
            Orden #{displayOrderTag}
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
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {order.vehicle?.marca} {order.vehicle?.modelo} ({order.vehicle?.ano || '2020'})
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Propietario: <strong>{order.client?.nombre} {order.client?.apellido || ''}</strong>
              </div>
              {order.vehicle?.color && (
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Color: {order.vehicle.color}
                </div>
              )}
            </div>

            <div className="tracking-plate-badge">
              {order.vehicle?.placa || 'SIN PLACA'}
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

          {/* Photos of vehicle repair if available */}
          {order.photos && order.photos.length > 0 && (
            <div className="tracking-photos-section">
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={16} color="#dc2626" />
                Fotografías del Proceso ({order.photos.length})
              </h4>
              <div className="tracking-photos-grid">
                {order.photos.map((ph: any, idx: number) => (
                  <div 
                    key={ph.id || idx} 
                    className="tracking-photo-card"
                    onClick={() => setSelectedPhoto(ph.photoUrl)}
                  >
                    <img src={ph.photoUrl} alt={`Foto de orden ${idx + 1}`} loading="lazy" />
                    {ph.notes && <span className="photo-caption">{ph.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services & Parts Accordion Summary */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Servicios y Repuestos de la Orden
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              {(order.services || []).map((s: any, idx: number) => (
                <div key={'s-' + idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                  <span>🔧 {s.name || s.nombre}</span>
                  <strong>${(s.price || s.precio || 0).toFixed(2)} USD</strong>
                </div>
              ))}
              {(order.parts || []).map((p: any, idx: number) => (
                <div key={'p-' + idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                  <span>📦 {p.quantity || 1}x {p.name || p.nombre}</span>
                  <strong>${((p.quantity || 1) * (p.price || 0)).toFixed(2)} USD</strong>
                </div>
              ))}
              {(!order.services || order.services.length === 0) && (!order.parts || order.parts.length === 0) && (
                <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Diagnóstico y revisión general en proceso.</p>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="tracking-financial-box">
            <div className="tracking-total-row">
              <span style={{ color: '#64748b' }}>Total del Servicio:</span>
              <strong style={{ fontSize: '16px' }}>${totalUSD.toFixed(2)} USD</strong>
            </div>
            <div className="tracking-total-row" style={{ color: '#dc2626' }}>
              <span>Equivalente en Bolívares (Tasa: {rate} Bs/$):</span>
              <strong style={{ fontSize: '15px' }}>Bs {totalVES.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</strong>
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
            {workshopData?.googleReviewUrl && (
              <a
                href={workshopData.googleReviewUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(66, 133, 244, 0.25)'
                }}
              >
                <Star size={16} fill="#FBBC05" color="#FBBC05" />
                <span>¿Satisfecho con el servicio? Califícanos 5★ en Google</span>
              </a>
            )}

            {(() => {
              const rawWorkshopPhone = workshopData?.phone || workshop?.phone || '04124217195';
              const normWorkshopPhone = normalizePhoneNumber(rawWorkshopPhone);
              const targetPhone = normWorkshopPhone.valid ? normWorkshopPhone.e164 : rawWorkshopPhone.replace(/\D/g, '');
              const isBudget = normStatus === 'presupuesto';
              const waMessage = isBudget
                ? `Hola, quisiera consultar / coordinar la aprobación del presupuesto #${displayOrderTag} para mi vehículo ${order.vehicle?.marca || ''} ${order.vehicle?.modelo || ''} (${order.vehicle?.placa || ''})`
                : `Hola, quisiera consultar sobre mi orden #${displayOrderTag} del vehículo ${order.vehicle?.marca || ''} ${order.vehicle?.modelo || ''} (${order.vehicle?.placa || ''})`;

              return (
                <a
                  href={`https://wa.me/${targetPhone}?text=${encodeURIComponent(waMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tracking-btn-whatsapp"
                >
                  <Send size={18} /> {isBudget ? 'Aprobar o Consultar Presupuesto por WhatsApp' : 'Contactar a mi Asesor por WhatsApp'}
                </a>
              );
            })()}

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

      {/* Modal vista previa imagen completa */}
      {selectedPhoto && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out'
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <img 
            src={selectedPhoto} 
            alt="Foto ampliada" 
            style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} 
          />
        </div>
      )}

      {/* Document Print Modal */}
      <DocumentPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        order={order}
        documentType={normStatus === 'presupuesto' ? 'PRESUPUESTO' : 'ORDEN'}
      />
    </div>
  );
};

export default TrackingPage;
