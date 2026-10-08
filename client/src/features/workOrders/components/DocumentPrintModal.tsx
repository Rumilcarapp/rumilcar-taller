import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { WorkOrder } from '../../../store/useWorkOrderStore';
import { useCashStore } from '../../../store/useCashStore';
import { useWorkshopStore, DEFAULT_TERMS_AND_CONDITIONS } from '../../../store/useWorkshopStore';
import { useAuthStore } from '../../../stores/authStore';
import { Printer, Send, Link, FileText, Receipt, Check, Building2 } from 'lucide-react';
import { normalizePhoneNumber, openWhatsApp } from '../../../lib/whatsapp';
import './DocumentPrint.css';

interface DocumentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: WorkOrder | null;
  documentType?: 'ORDEN' | 'PRESUPUESTO' | 'RECIBO';
}

export const DocumentPrintModal: React.FC<DocumentPrintModalProps> = ({
  isOpen,
  onClose,
  order,
  documentType = 'ORDEN',
}) => {
  const { exchangeRateVES } = useCashStore();
  const { workshop } = useWorkshopStore();
  const { user } = useAuthStore();
  const workshopDisplayName = (workshop?.name || user?.workshopName || 'Taller Mecánico').trim();
  const [format, setFormat] = useState<'LETTER' | 'TICKET'>('LETTER');
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const rate = exchangeRateVES || 65;

  const subServices = (order.services || []).reduce((acc: number, s: any) => {
    const isVES = s.currency === 'VES';
    const price = isVES && rate > 0 ? (s.price || s.precio || 0) / rate : (s.price || s.precio || 0);
    return acc + price;
  }, 0);
  const subParts = (order.parts || []).reduce((acc: number, p: any) => {
    const isVES = p.currency === 'VES';
    const price = isVES && rate > 0 ? (p.price || p.precio || 0) / rate : (p.price || p.precio || 0);
    const qty = p.quantity || p.cantidad || 1;
    return acc + (price * qty);
  }, 0);
  const itemsTotal = subServices + subParts;

  const totalUSD = (itemsTotal > 0 && (!order.totalUSD || (order.totalUSD < 1 && itemsTotal >= 1)))
    ? itemsTotal
    : (order.totalUSD || itemsTotal || 0);
  const totalVES = totalUSD * rate;

  const paidUSD = (order.payments || []).reduce((acc, p) => acc + (p.amountUSD || 0), 0);
  const pendingUSD = Math.max(0, totalUSD - paidUSD);

  const trackingUrl = `${window.location.origin}/rastreo/${order.id}`;

  const clientDisplayName = [order.client?.nombre, order.client?.apellido].filter(Boolean).join(' ') || 'Cliente General';
  const vehicleDisplayName = [order.vehicle?.marca, order.vehicle?.modelo].filter(Boolean).join(' ') || 'Vehículo no especificado';
  const vehicleYear = order.vehicle?.año || order.vehicle?.ano;
  const displayOrderId = order.orderNumber ? `OT-${order.orderNumber}` : (order.id.length > 10 ? order.id.slice(0, 8) : order.id);
  const workshopLogo = workshop?.logoUrl || '/logo-tight.png';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const phone = order.client?.telefono;
    const norm = normalizePhoneNumber(phone);
    if (!norm.valid) {
      alert(norm.reason || 'El cliente no tiene un teléfono válido registrado.');
      return;
    }

    const docName = documentType === 'PRESUPUESTO' ? 'Presupuesto' : 'Orden de Trabajo';
    const msg = `¡Hola ${order.client?.nombre || 'Estimado Cliente'}! 👋 Adjuntamos el detalle de su *${docName} #${order.id}* de ${workshopDisplayName}.\n\n` +
      `🚗 *Vehículo:* ${order.vehicle?.marca || ''} ${order.vehicle?.modelo || ''} (${order.vehicle?.placa || ''})\n` +
      `💰 *Total:* $${totalUSD.toFixed(2)} USD (Bs ${totalVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })})\n` +
      (pendingUSD > 0 ? `⚠️ *Saldo pendiente:* $${pendingUSD.toFixed(2)} USD\n\n` : `✅ *Estado:* Totalmente cancelado\n\n`) +
      `🔍 *Puede consultar el estado y avance de su vehículo en vivo aquí:*\n${trackingUrl}`;

    openWhatsApp(norm.e164, msg);
  };

  const handleSendWhatsAppWorkshop = () => {
    if (!order) return;
    const rawPhone = workshop.phone || (workshop.paymentDetails?.pagoMovil?.telefono) || '';
    const norm = normalizePhoneNumber(rawPhone);
    if (!norm.valid) {
      alert('El taller no tiene un número de WhatsApp registrado en la configuración de la empresa (Perfil).');
      return;
    }

    const docName = documentType === 'PRESUPUESTO' ? 'Presupuesto' : 'Orden de Trabajo';
    let msg = `📋 *${docName.toUpperCase()} #${order.orderNumber ? 'OT-' + order.orderNumber : (order.id.length > 10 ? order.id.slice(0, 8) : order.id)} - ${workshopDisplayName.toUpperCase()}*\n` +
      `_Copia para Taller / Registro de Cotización_\n\n` +
      `👤 *Cliente:* ${order.client?.nombre || 'Cliente'} ${order.client?.apellido || ''} (Tel: ${order.client?.telefono || 'No registrado'})\n` +
      `🚗 *Vehículo:* ${order.vehicle?.marca || ''} ${order.vehicle?.modelo || ''} (${order.vehicle?.placa || 'Sin placa'})\n\n`;

    if (order.services && order.services.length > 0) {
      msg += `🛠️ *SERVICIOS:*\n`;
      order.services.forEach(s => {
        msg += `• ${s.name}: $${(s.price || 0).toFixed(2)}\n`;
      });
      msg += `\n`;
    }

    if (order.parts && order.parts.length > 0) {
      msg += `🔩 *REPUESTOS:*\n`;
      order.parts.forEach(p => {
        const sub = (p.price || 0) * (p.quantity || 1);
        msg += `• ${p.quantity}x ${p.name}: $${sub.toFixed(2)}\n`;
      });
      msg += `\n`;
    }

    msg += `💰 *TOTAL ESTIMADO: $${totalUSD.toFixed(2)} USD* (Bs ${totalVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })})\n` +
      `🔍 *Enlace digital:* ${trackingUrl}\n\n` +
      `_Enviado desde el sistema de taller Rumilcar._`;

    openWhatsApp(norm.e164, msg);
  };

  const typeLabels = {
    ORDEN: 'ORDEN DE TRABAJO',
    PRESUPUESTO: 'PRESUPUESTO / COTIZACIÓN',
    RECIBO: 'COMPROBANTE DE PAGO',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Impresión de Documento - ${typeLabels[documentType]}`}>
      <div className="doc-print-container">
        
        {/* Format Selector and Action Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'var(--color-bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setFormat('LETTER')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: format === 'LETTER' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: format === 'LETTER' ? 'var(--color-bg-surface)' : 'transparent',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileText size={14} /> Formato Carta (A4)
            </button>

            <button
              type="button"
              onClick={() => setFormat('TICKET')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: format === 'TICKET' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: format === 'TICKET' ? 'var(--color-bg-surface)' : 'transparent',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Receipt size={14} /> Ticket Térmico (80mm)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyTracking}
              icon={copied ? <Check size={14} color="#10b981" /> : <Link size={14} />}
            >
              {copied ? '¡Copiado!' : 'Copiar Link'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSendWhatsApp}
              icon={<Send size={14} />}
              style={{ color: '#25D366', borderColor: '#25D366' }}
              title="Enviar al WhatsApp del cliente"
            >
              WA Cliente
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSendWhatsAppWorkshop}
              icon={<Building2 size={14} />}
              style={{ color: '#2563eb', borderColor: '#93c5fd' }}
              title="Enviar presupuesto al número de WhatsApp del taller"
            >
              WA Taller
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={handlePrint}
              icon={<Printer size={14} />}
            >
              Imprimir Documento
            </Button>
          </div>
        </div>

        {/* LETTER FORMAT (A4) */}
        {format === 'LETTER' && (
          <div className="doc-paper-letter">
            
            {/* Header */}
            <div className="doc-header-row">
              <div className="doc-brand-logo">
                <img src={workshopLogo} alt={workshopDisplayName} className="doc-brand-img" />
                <div>
                  <div className="doc-brand-name">{workshopDisplayName.toUpperCase()}</div>
                  <div className="doc-brand-sub">{(workshop.legalName || 'SERVICIOS AUTOMOTRICES').toUpperCase()}</div>
                  <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                    {workshop.taxId ? `RIF: ${workshop.taxId} • ` : ''}Tel: {workshop.phone || user?.phone || 'No registrado'}{workshop.email || user?.email ? ` • ${workshop.email || user?.email}` : ''}
                  </div>
                  {workshop.address && (
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>
                      {workshop.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="doc-number-box">
                <div className="doc-type-title">{typeLabels[documentType]}</div>
                <div className="doc-number">#{displayOrderId}</div>
                <div className="doc-date">
                  Fecha: <strong>{new Date(order.date).toLocaleDateString()}</strong>
                </div>
                <div className="doc-date">
                  Tasa Oficial: <strong>Bs {rate.toFixed(2)}/USD</strong>
                </div>
              </div>
            </div>

            {/* Info Grid (Client & Vehicle) */}
            <div className="doc-info-grid">
              <div className="doc-info-col">
                <div className="doc-info-label">DATOS DEL CLIENTE</div>
                <div className="doc-info-value">{clientDisplayName}</div>
                <div>CI / RIF: <strong>{order.client?.documento || 'No registrado'}</strong></div>
                <div>Teléfono: <strong>{order.client?.telefono || 'No registrado'}</strong></div>
                <div>Dirección: {order.client?.direccion || 'No registrada'}</div>
              </div>

              <div className="doc-info-col">
                <div className="doc-info-label">DATOS DEL VEHÍCULO</div>
                <div className="doc-info-value">{vehicleDisplayName} {vehicleYear ? `(${vehicleYear})` : ''}</div>
                <div>Placa: <strong>{order.vehicle?.placa || 'No registrada'}</strong> • Color: {order.vehicle?.color || 'N/D'}</div>
                <div>Kilometraje: <strong>{order.vehicle?.kilometraje || order.vehicle?.km ? `${(order.vehicle?.kilometraje || order.vehicle?.km).toLocaleString()} KM` : 'N/D'}</strong></div>
                <div>Mecánico Responsable: <strong>{order.mechanicName || 'Jefe de Taller'}</strong></div>
              </div>
            </div>

            {/* Services & Parts Table */}
            <table className="doc-items-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Descripción del Servicio / Repuesto</th>
                  <th style={{ textAlign: 'center', width: '10%' }}>Cant.</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Precio Unit. ($)</th>
                  <th style={{ textAlign: 'right', width: '25%' }}>Subtotal ($)</th>
                </tr>
              </thead>
              <tbody>
                {/* Services */}
                {(order.services || []).map((s, idx) => (
                  <tr key={'srv-' + idx}>
                    <td>
                      <strong>Mano de Obra:</strong> {s.name || s.nombre}
                    </td>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td style={{ textAlign: 'right' }}>${(s.price || s.precio || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${(s.price || s.precio || 0).toFixed(2)}</td>
                  </tr>
                ))}

                {/* Parts */}
                {(order.parts || []).map((p, idx) => (
                  <tr key={'prt-' + idx}>
                    <td>
                      <strong>Repuesto:</strong> {p.name || p.nombre}
                    </td>
                    <td style={{ textAlign: 'center' }}>{p.quantity || p.cantidad || 1}</td>
                    <td style={{ textAlign: 'right' }}>${(p.price || p.precio || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ${((p.quantity || p.cantidad || 1) * (p.price || p.precio || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals & Payments */}
            <div className="doc-totals-box">
              <div className="doc-totals-table">
                <div className="doc-totals-row">
                  <span>Monto Total USD:</span>
                  <strong>${totalUSD.toFixed(2)}</strong>
                </div>
                <div className="doc-totals-row ves-total">
                  <span>Equivalente en Bolívares:</span>
                  <strong>Bs {totalVES.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</strong>
                </div>

                {paidUSD > 0 && (
                  <div className="doc-totals-row" style={{ color: '#10b981' }}>
                    <span>Abonos / Pagado:</span>
                    <strong>-${paidUSD.toFixed(2)}</strong>
                  </div>
                )}

                <div className="doc-totals-row grand-total">
                  <span>SALDO PENDIENTE:</span>
                  <span style={{ color: pendingUSD > 0 ? '#dc2626' : '#10b981' }}>
                    ${pendingUSD.toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>

            {/* Datos de Pago del Taller */}
            {workshop.paymentDetails && (workshop.paymentDetails.pagoMovil?.telefono || workshop.paymentDetails.transferencia?.numeroCuenta || workshop.paymentDetails.zelle?.email) && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px', fontSize: '11px', lineHeight: 1.4 }}>
                <strong style={{ display: 'block', color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                  Datos de Pago / Cuentas Bancarias:
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  {workshop.paymentDetails.pagoMovil?.telefono && (
                    <div>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>Pago Móvil: </span>
                      {workshop.paymentDetails.pagoMovil.banco ? `${workshop.paymentDetails.pagoMovil.banco} • ` : ''}
                      Tel: {workshop.paymentDetails.pagoMovil.telefono} • CI/RIF: {workshop.paymentDetails.pagoMovil.cedulaRif}
                      {workshop.paymentDetails.pagoMovil.titular ? ` (${workshop.paymentDetails.pagoMovil.titular})` : ''}
                    </div>
                  )}
                  {workshop.paymentDetails.transferencia?.numeroCuenta && (
                    <div>
                      <span style={{ fontWeight: 700, color: '#2563eb' }}>Transferencia: </span>
                      {workshop.paymentDetails.transferencia.banco ? `${workshop.paymentDetails.transferencia.banco} • ` : ''}
                      Cta: {workshop.paymentDetails.transferencia.numeroCuenta} • RIF: {workshop.paymentDetails.transferencia.cedulaRif}
                    </div>
                  )}
                  {workshop.paymentDetails.zelle?.email && (
                    <div>
                      <span style={{ fontWeight: 700, color: '#7c3aed' }}>Zelle: </span>
                      {workshop.paymentDetails.zelle.email} {workshop.paymentDetails.zelle.titular ? `(${workshop.paymentDetails.zelle.titular})` : ''}
                    </div>
                  )}
                  {workshop.paymentDetails.binanceUSDT?.payIdOrEmail && (
                    <div>
                      <span style={{ fontWeight: 700, color: '#d97706' }}>Binance USDT: </span>
                      {workshop.paymentDetails.binanceUSDT.payIdOrEmail}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms and Warranties */}
            <div className="doc-terms-box">
              <strong>TÉRMINOS Y CONDICIONES:</strong>
              <div style={{ whiteSpace: 'pre-line', marginTop: '4px', lineHeight: 1.5 }}>
                {workshop.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS}
              </div>
            </div>

            {/* Signatures */}
            <div className="doc-signatures-grid">
              <div>
                <div style={{ height: '40px' }} />
                <div className="doc-sig-line">FIRMA DEL ASESOR / TALLER</div>
              </div>
              <div>
                <div style={{ height: '40px' }} />
                <div className="doc-sig-line">FIRMA DE CONFORMIDAD DEL CLIENTE</div>
              </div>
            </div>

          </div>
        )}

        {/* TICKET FORMAT (80mm) */}
        {format === 'TICKET' && (
          <div className="doc-paper-ticket">
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
              <img src={workshopLogo} alt="Logo" style={{ maxHeight: '42px', maxWidth: '90px', objectFit: 'contain', margin: '0 auto 6px', display: 'block' }} />
              <div style={{ fontWeight: 800, fontSize: '15px' }}>{workshopDisplayName.toUpperCase()}</div>
              {workshop.taxId && <div>RIF: {workshop.taxId}</div>}
              <div>Tel: {workshop.phone || user?.phone || 'No registrado'}</div>
              <div style={{ fontWeight: 700, marginTop: '4px' }}>{typeLabels[documentType]}</div>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>#{displayOrderId}</div>
              <div>Fecha: {new Date(order.date).toLocaleDateString()}</div>
            </div>

            <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
              <div><strong>Cliente:</strong> {clientDisplayName}</div>
              <div><strong>CI/RIF:</strong> {order.client?.documento || 'No registrado'}</div>
              <div><strong>Auto:</strong> {vehicleDisplayName}</div>
              <div><strong>Placa:</strong> {order.vehicle?.placa || 'No registrada'}</div>
            </div>

            <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>DETALLE:</div>
              {(order.services || []).map((s, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{s.name || s.nombre}</span>
                  <strong>${(s.price || s.precio || 0).toFixed(2)}</strong>
                </div>
              ))}
              {(order.parts || []).map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.quantity || 1}x {p.name || p.nombre}</span>
                  <strong>${((p.quantity || 1) * (p.price || 0)).toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>TOTAL USD:</span>
                <strong>${totalUSD.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>TOTAL VES:</span>
                <strong>Bs {totalVES.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, marginTop: '4px' }}>
                <span>SALDO:</span>
                <span>${pendingUSD.toFixed(2)} USD</span>
              </div>
            </div>

            {workshop.paymentDetails?.pagoMovil?.telefono && (
              <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '6px', fontSize: '10px' }}>
                <div style={{ fontWeight: 800 }}>PAGO MÓVIL:</div>
                <div>{workshop.paymentDetails.pagoMovil.banco ? `${workshop.paymentDetails.pagoMovil.banco} | ` : ''}Tel: {workshop.paymentDetails.pagoMovil.telefono}</div>
                <div>RIF/CI: {workshop.paymentDetails.pagoMovil.cedulaRif}</div>
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '10px' }}>
              <div>Consulte el estado en vivo de su vehículo:</div>
              <div style={{ fontWeight: 700, marginTop: '2px' }}>{trackingUrl}</div>
              <div style={{ marginTop: '6px' }}>¡Gracias por su preferencia!</div>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
