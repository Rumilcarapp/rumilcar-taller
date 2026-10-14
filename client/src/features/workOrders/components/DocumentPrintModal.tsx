import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { WorkOrder } from '../../../store/useWorkOrderStore';
import { useCashStore } from '../../../store/useCashStore';
import { useWorkshopStore, DEFAULT_TERMS_AND_CONDITIONS } from '../../../store/useWorkshopStore';
import { useAuthStore } from '../../../stores/authStore';
import { useBillingConfigStore, FiscalInvoiceRecord } from '../../../store/useBillingConfigStore';
import { Printer, Send, Link, FileText, Receipt, Check, Building2, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { normalizePhoneNumber, openWhatsApp } from '../../../lib/whatsapp';
import './DocumentPrint.css';

interface DocumentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: WorkOrder | null;
  documentType?: 'ORDEN' | 'PRESUPUESTO' | 'RECIBO' | 'FACTURA_FISCAL';
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
  
  // Billing Store for digital invoicing (Both cases: Platform managed vs Own credentials)
  const {
    isEnabled: isBillingEnabled,
    mode: billingMode,
    fiscalName,
    fiscalRif,
    fiscalAddress,
    fiscalPhone,
    applyIva,
    ivaRate,
    applyIgtf,
    igtfRate,
    monthlyQuota,
    invoicesIssuedThisMonth,
    lastInvoiceNumber,
    lastControlNumberInt,
    invoices,
    emitFiscalInvoice,
  } = useBillingConfigStore();

  const workshopDisplayName = (workshop?.name || user?.workshopName || 'Taller Mecánico').trim();
  const [format, setFormat] = useState<'LETTER' | 'TICKET'>('LETTER');
  const [activeTab, setActiveTab] = useState<'INTERNAL' | 'FISCAL'>(
    documentType === 'FACTURA_FISCAL' ? 'FISCAL' : 'INTERNAL'
  );
  const [copied, setCopied] = useState(false);
  const [isDivisasCash, setIsDivisasCash] = useState(true);
  const [isEmitting, setIsEmitting] = useState(false);
  const [emitError, setEmitError] = useState<string | null>(null);

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
  const clientDocumento = order.client?.documento || (order.client as any)?.taxId || (order.client as any)?.cedula || 'V-00000000';
  const vehicleDisplayName = [order.vehicle?.marca, order.vehicle?.modelo].filter(Boolean).join(' ') || 'Vehículo no especificado';
  const vehicleYear = order.vehicle?.año || order.vehicle?.ano;
  const displayOrderId = order.orderNumber ? `OT-${order.orderNumber}` : (order.id.length > 10 ? order.id.slice(0, 8) : order.id);
  const workshopLogo = workshop?.logoUrl || '/logo-tight.png';

  // Check if a fiscal invoice already exists for this order
  const existingInvoice = invoices.find(
    (inv) => inv.orderId === order.id || (order.orderNumber && inv.orderNumber === order.orderNumber)
  );

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

  const handleSendFiscalWhatsApp = (inv: FiscalInvoiceRecord) => {
    const phone = order.client?.telefono;
    const norm = normalizePhoneNumber(phone);
    if (!norm.valid) {
      alert(norm.reason || 'El cliente no tiene un teléfono válido registrado.');
      return;
    }

    const msg = `🏛️ *FACTURA FISCAL DIGITAL - ${fiscalName.toUpperCase()}*\n` +
      `*RIF:* ${fiscalRif} • *Taller:* ${workshopDisplayName}\n\n` +
      `Estimado(a) *${inv.clientName}* (RIF/CI: ${inv.clientTaxId}), le enviamos su comprobante fiscal oficial:\n\n` +
      `🧾 *Factura N°:* ${inv.invoiceNumber}\n` +
      `🔒 *N° de Control SENIAT:* ${inv.controlNumber}\n` +
      `📅 *Fecha de Emisión:* ${new Date(inv.issuedAt).toLocaleString('es-VE')}\n` +
      `🚗 *Vehículo:* ${inv.vehicleDesc || 'Servicios automotrices'}\n\n` +
      `💵 *Base Imponible (G 16%):* $${inv.taxableUSD.toFixed(2)} USD\n` +
      `📊 *IVA (16%):* $${inv.ivaUSD.toFixed(2)} USD\n` +
      (inv.igtfUSD > 0 ? `💰 *IGTF (3% Divisas):* $${inv.igtfUSD.toFixed(2)} USD\n` : '') +
      `💳 *TOTAL FACTURA:* $${inv.totalUSD.toFixed(2)} USD\n` +
      `🇻🇪 *Total en Bolívares (Tasa BCV Bs ${inv.bcvRate.toFixed(2)}):*\n` +
      `👉 *Bs ${inv.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}*\n\n` +
      `🔍 *Verificación oficial SENIAT / Providencia HKA:*\n${inv.qrCodeUrl}\n\n` +
      `_Emisión autorizada vía The Factory HKA C.A. Providencia SNAT/2018/0141._`;

    openWhatsApp(norm.e164, msg);
  };

  const handleEmitInvoice = async () => {
    setIsEmitting(true);
    setEmitError(null);
    try {
      const res = await emitFiscalInvoice({
        orderId: order.id,
        orderNumber: order.orderNumber,
        client: {
          nombre: order.client?.nombre,
          apellido: order.client?.apellido,
          documento: clientDocumento,
          telefono: order.client?.telefono,
          direccion: order.client?.direccion,
        },
        vehicle: {
          marca: order.vehicle?.marca,
          modelo: order.vehicle?.modelo,
          placa: order.vehicle?.placa,
        },
        services: order.services,
        parts: order.parts,
        totalUSD,
        rateBCV: rate,
        isDivisasCash,
      });

      if (!res.success) {
        setEmitError(res.error || 'No se pudo emitir la factura fiscal.');
      }
    } catch (err: any) {
      setEmitError(err.message || 'Error al conectar con el servidor de facturación.');
    } finally {
      setIsEmitting(false);
    }
  };

  const typeLabels = {
    ORDEN: 'ORDEN DE TRABAJO',
    PRESUPUESTO: 'PRESUPUESTO / COTIZACIÓN',
    RECIBO: 'COMPROBANTE DE PAGO',
    FACTURA_FISCAL: 'FACTURA FISCAL DIGITAL',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Documento - #${displayOrderId} (${workshopDisplayName})`} size="lg">
      <div className="doc-print-container">
        
        {/* Navigation & Mode Bar (Hidden on print) */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Main Document Switcher Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`fiscal-type-tab ${activeTab === 'INTERNAL' ? 'active' : ''}`}
                onClick={() => setActiveTab('INTERNAL')}
              >
                <FileText size={16} />
                <span>{typeLabels[documentType] || 'DOCUMENTO DE TALLER'}</span>
              </button>

              <button
                type="button"
                className={`fiscal-type-tab ${activeTab === 'FISCAL' ? 'fiscal-active' : ''}`}
                onClick={() => setActiveTab('FISCAL')}
              >
                <ShieldCheck size={16} />
                <span>FACTURA FISCAL SENIAT</span>
                {existingInvoice ? (
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: '10px' }}>
                    N° {existingInvoice.invoiceNumber}
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>
                    Disponible
                  </span>
                )}
              </button>
            </div>

            {/* Provider Mode Pill */}
            <div className="fiscal-hka-badge" title="Estado de la integración con The Factory HKA">
              <Sparkles size={12} />
              <span>
                {billingMode === 'PLATFORM_MANAGED'
                  ? 'Membresía Rumilcar (Folios Incluidos)'
                  : 'Cuenta Propia HKA del Taller'}
              </span>
            </div>
          </div>

          {/* Format and Action Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            background: 'var(--color-bg-subtle)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
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
              {activeTab === 'INTERNAL' ? (
                <>
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
                    title="Enviar al WhatsApp del taller"
                  >
                    WA Taller
                  </Button>
                </>
              ) : existingInvoice ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendFiscalWhatsApp(existingInvoice)}
                  icon={<Send size={14} />}
                  style={{ color: '#059669', borderColor: '#059669', fontWeight: 700 }}
                  title="Enviar comprobante fiscal oficial al cliente"
                >
                  WA Factura Fiscal
                </Button>
              ) : null}

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
        </div>

        {/* ========================================================================= */}
        {/* VIEW A: INTERNAL WORKSHOP DOCUMENT (ORDEN / PRESUPUESTO / RECIBO)          */}
        {/* ========================================================================= */}
        {activeTab === 'INTERNAL' && (
          <>
            {/* LETTER FORMAT (A4) */}
            {format === 'LETTER' && (
              <div className="doc-paper-letter">
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
                    {(order.services || []).map((s, idx) => (
                      <tr key={'srv-' + idx}>
                        <td><strong>Mano de Obra:</strong> {s.name || s.nombre}</td>
                        <td style={{ textAlign: 'center' }}>1</td>
                        <td style={{ textAlign: 'right' }}>${(s.price || s.precio || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${(s.price || s.precio || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {(order.parts || []).map((p, idx) => (
                      <tr key={'prt-' + idx}>
                        <td><strong>Repuesto:</strong> {p.name || p.nombre}</td>
                        <td style={{ textAlign: 'center' }}>{p.quantity || p.cantidad || 1}</td>
                        <td style={{ textAlign: 'right' }}>${(p.price || p.precio || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ${((p.quantity || p.cantidad || 1) * (p.price || p.precio || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

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
                    </div>
                  </div>
                )}

                <div className="doc-terms-box">
                  <strong>TÉRMINOS Y CONDICIONES:</strong>
                  <div style={{ whiteSpace: 'pre-line', marginTop: '4px', lineHeight: 1.5 }}>
                    {workshop.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS}
                  </div>
                </div>

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

                <div style={{ textAlign: 'center', fontSize: '10px' }}>
                  <div>Consulte el estado en vivo de su vehículo:</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>{trackingUrl}</div>
                  <div style={{ marginTop: '6px' }}>¡Gracias por su preferencia!</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: FACTURA FISCAL DIGITAL SENIAT (THE FACTORY HKA INTEGRATION)       */}
        {/* ========================================================================= */}
        {activeTab === 'FISCAL' && (
          <>
            {/* If NOT emitted yet: Show Emission Control Box */}
            {!existingInvoice ? (
              <div className="fiscal-emit-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(5, 150, 105, 0.12)',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                      Emitir Factura Fiscal Digital (SENIAT)
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      Genera el comprobante electrónico con Número de Control fiscal válido ante el SENIAT.
                    </p>
                  </div>
                </div>

                {/* Configuration Summary Card */}
                <div style={{
                  background: 'var(--color-bg-subtle)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  fontSize: '12px'
                }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Emisor Fiscal (RIF):</span>
                    <strong style={{ fontSize: '13px' }}>{fiscalRif}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{fiscalName}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Modelo Operativo:</span>
                    <strong style={{ color: billingMode === 'PLATFORM_MANAGED' ? '#2563eb' : '#059669' }}>
                      {billingMode === 'PLATFORM_MANAGED' ? 'Membresía Proveída por Rumilcar' : 'Cuenta Propia HKA del Taller'}
                    </strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {billingMode === 'PLATFORM_MANAGED'
                        ? `Consumo: ${invoicesIssuedThisMonth} de ${monthlyQuota} facturas`
                        : 'Conexión Directa API HKA'}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Próximos Identificadores:</span>
                    <div>Factura: <strong>FAC-{String(lastInvoiceNumber + 1).padStart(8, '0')}</strong></div>
                    <div>Control: <strong>00-{String(lastControlNumberInt + 1).padStart(6, '0')}</strong></div>
                  </div>
                </div>

                {/* Tributary options */}
                <div style={{
                  background: 'rgba(37, 99, 235, 0.05)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={isDivisasCash}
                      onChange={(e) => setIsDivisasCash(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>
                      ¿El pago fue o será recibido en <strong>Divisas en Efectivo</strong>?
                    </span>
                  </label>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', marginLeft: '26px' }}>
                    {isDivisasCash
                      ? 'Se calculará el 3% de IGTF Percibido reglamentario exigido por la ley venezolana.'
                      : 'No aplica recargo de IGTF (Pago por transferencia, Pago Móvil o Bolívares).'}
                  </div>
                </div>

                {/* Calculation Breakdown */}
                {(() => {
                  const baseTaxable = applyIva ? totalUSD / (1 + ivaRate / 100) : totalUSD;
                  const calculatedIva = applyIva ? totalUSD - baseTaxable : 0;
                  const calculatedIgtf = (applyIgtf && isDivisasCash) ? totalUSD * (igtfRate / 100) : 0;
                  const grandTotalUSD = totalUSD + calculatedIgtf;
                  const grandTotalVES = grandTotalUSD * rate;

                  return (
                    <div style={{
                      background: 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '18px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>Base Imponible (Gravable 16%):</span>
                        <strong>${baseTaxable.toFixed(2)} USD (Bs {(baseTaxable * rate).toLocaleString('es-VE', { maximumFractionDigits: 2 })})</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>IVA (16% General):</span>
                        <strong>${calculatedIva.toFixed(2)} USD (Bs {(calculatedIva * rate).toLocaleString('es-VE', { maximumFractionDigits: 2 })})</strong>
                      </div>
                      {calculatedIgtf > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#d97706' }}>
                          <span>IGTF Percibido (3%):</span>
                          <strong>+${calculatedIgtf.toFixed(2)} USD (Bs {(calculatedIgtf * rate).toLocaleString('es-VE', { maximumFractionDigits: 2 })})</strong>
                        </div>
                      )}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--color-border)',
                        fontWeight: 800,
                        fontSize: '15px'
                      }}>
                        <span>Total Factura Fiscal:</span>
                        <span style={{ color: '#059669' }}>
                          ${grandTotalUSD.toFixed(2)} USD • Bs {grandTotalVES.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {emitError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    <AlertCircle size={16} />
                    <span>{emitError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleEmitInvoice}
                    disabled={isEmitting || !isBillingEnabled}
                    icon={<ShieldCheck size={18} />}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      border: 'none',
                      fontWeight: 700,
                      padding: '10px 24px',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                    }}
                  >
                    {isEmitting ? 'Emitiendo ante The Factory HKA...' : '⚡ Emitir Factura Fiscal y Asignar N° Control'}
                  </Button>
                </div>
              </div>
            ) : (
              /* Already Emitted: Render Official Printable SENIAT Document */
              <>
                {/* LETTER FORMAT (A4) - SENIAT FISCAL */}
                {format === 'LETTER' && (
                  <div className="doc-paper-letter" style={{ border: '2px solid #059669' }}>
                    
                    {/* Official Fiscal Header */}
                    <div className="doc-header-row" style={{ borderBottom: '2px solid #059669' }}>
                      <div className="doc-brand-logo">
                        <img src={workshopLogo} alt={workshopDisplayName} className="doc-brand-img" />
                        <div>
                          <div className="doc-brand-name" style={{ color: '#059669' }}>
                            {fiscalName.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginTop: '1px' }}>
                            RIF: {fiscalRif}
                          </div>
                          <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px', maxWidth: '380px' }}>
                            {fiscalAddress} • Tel: {fiscalPhone}
                          </div>
                          <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>
                            Proveedor Autorizado: The Factory HKA C.A. • Prov. SENIAT/SNAT/2018/0141
                          </div>
                        </div>
                      </div>

                      <div className="doc-number-box">
                        <div style={{
                          background: '#059669',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginBottom: '4px'
                        }}>
                          FACTURA ELECTRÓNICA
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                          N°: {existingInvoice.invoiceNumber}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                          CONTROL N°: {existingInvoice.controlNumber}
                        </div>
                        <div className="doc-date" style={{ marginTop: '3px' }}>
                          Fecha: <strong>{new Date(existingInvoice.issuedAt).toLocaleString('es-VE')}</strong>
                        </div>
                        <div className="doc-date">
                          Tasa Oficial BCV: <strong>Bs {existingInvoice.bcvRate.toFixed(2)}/USD</strong>
                        </div>
                      </div>
                    </div>

                    {/* Fiscal Mode Sub-banner */}
                    <div style={{
                      background: 'rgba(5, 150, 105, 0.08)',
                      border: '1px solid rgba(5, 150, 105, 0.2)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>
                        <strong>Modalidad:</strong> {existingInvoice.mode === 'PLATFORM_MANAGED' ? 'Folios Provistos por Rumilcar' : 'Cuenta Propia HKA'}
                      </span>
                      <span>
                        <strong>Ambiente:</strong> {existingInvoice.environment}
                      </span>
                    </div>

                    {/* Client & Vehicle Fiscal Grid */}
                    <div className="doc-info-grid">
                      <div className="doc-info-col">
                        <div className="doc-info-label">DATOS DEL ADQUIRIENTE / CLIENTE</div>
                        <div className="doc-info-value">{existingInvoice.clientName}</div>
                        <div>RIF / CI: <strong>{existingInvoice.clientTaxId}</strong></div>
                        <div>Teléfono: <strong>{existingInvoice.clientPhone || 'No registrado'}</strong></div>
                        <div>Dirección: {existingInvoice.clientAddress || 'Caracas, Venezuela'}</div>
                      </div>

                      <div className="doc-info-col">
                        <div className="doc-info-label">VEHÍCULO / REFERENCIA DE SERVICIO</div>
                        <div className="doc-info-value">{existingInvoice.vehicleDesc || vehicleDisplayName}</div>
                        <div>Orden de Taller: <strong>OT-#{displayOrderId}</strong></div>
                        <div>Condición de Pago: <strong>De Contado</strong></div>
                      </div>
                    </div>

                    {/* Items table */}
                    <table className="doc-items-table">
                      <thead>
                        <tr>
                          <th style={{ width: '45%' }}>Descripción del Concepto / Servicio</th>
                          <th style={{ textAlign: 'center', width: '10%' }}>Cant.</th>
                          <th style={{ textAlign: 'right', width: '15%' }}>Precio ($)</th>
                          <th style={{ textAlign: 'center', width: '10%' }}>Alícuota</th>
                          <th style={{ textAlign: 'right', width: '20%' }}>Subtotal ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(order.services || []).map((s, idx) => (
                          <tr key={'srv-' + idx}>
                            <td><strong>Mano de Obra:</strong> {s.name || s.nombre}</td>
                            <td style={{ textAlign: 'center' }}>1</td>
                            <td style={{ textAlign: 'right' }}>${(s.price || s.precio || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: '#059669' }}>G (16%)</span></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>${(s.price || s.precio || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                        {(order.parts || []).map((p, idx) => (
                          <tr key={'prt-' + idx}>
                            <td><strong>Repuesto:</strong> {p.name || p.nombre}</td>
                            <td style={{ textAlign: 'center' }}>{p.quantity || p.cantidad || 1}</td>
                            <td style={{ textAlign: 'right' }}>${(p.price || p.precio || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: '#059669' }}>G (16%)</span></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              ${((p.quantity || p.cantidad || 1) * (p.price || p.precio || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Fiscal Totals Box */}
                    <div className="doc-totals-box">
                      <div className="doc-totals-table" style={{ width: '310px' }}>
                        <div className="doc-totals-row">
                          <span>Base Imponible (G 16%):</span>
                          <strong>${existingInvoice.taxableUSD.toFixed(2)}</strong>
                        </div>
                        <div className="doc-totals-row">
                          <span>Base Imponible (Bs):</span>
                          <strong>Bs {(existingInvoice.taxableUSD * existingInvoice.bcvRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="doc-totals-row" style={{ color: '#059669' }}>
                          <span>IVA 16%:</span>
                          <strong>${existingInvoice.ivaUSD.toFixed(2)} (Bs {(existingInvoice.ivaUSD * existingInvoice.bcvRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })})</strong>
                        </div>
                        {existingInvoice.igtfUSD > 0 && (
                          <div className="doc-totals-row" style={{ color: '#d97706' }}>
                            <span>IGTF Percibido (3%):</span>
                            <strong>+${existingInvoice.igtfUSD.toFixed(2)} USD</strong>
                          </div>
                        )}
                        <div className="doc-totals-row grand-total" style={{ borderTop: '2px solid #059669' }}>
                          <span>TOTAL FACTURA:</span>
                          <span style={{ color: '#059669' }}>
                            ${existingInvoice.totalUSD.toFixed(2)} USD
                          </span>
                        </div>
                        <div className="doc-totals-row ves-total" style={{ fontSize: '13px' }}>
                          <span>TOTAL EN BOLÍVARES:</span>
                          <span>Bs {existingInvoice.totalVES.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* SENIAT QR Code & Legal Footnote */}
                    <div className="fiscal-qr-container">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(existingInvoice.qrCodeUrl)}`}
                        alt="QR SENIAT"
                        className="fiscal-qr-img"
                      />
                      <div style={{ fontSize: '10px', color: '#4b5563', lineHeight: 1.45 }}>
                        <strong style={{ color: '#111827', display: 'block', marginBottom: '2px' }}>
                          DOCUMENTO FISCAL ELECTRÓNICO HOMOLOGADO POR EL SENIAT
                        </strong>
                        Factura emitida conforme a las disposiciones técnicas y legales de la Providencia Administrativa N° SNAT/2018/0141. Para verificar la autenticidad de este documento escanee el código QR o acceda al portal de consulta del SENIAT.
                        <div style={{ marginTop: '4px', fontSize: '9px', color: '#6b7280', wordBreak: 'break-all' }}>
                          URL: {existingInvoice.qrCodeUrl}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TICKET FORMAT (80mm) - SENIAT FISCAL */}
                {format === 'TICKET' && (
                  <div className="doc-paper-ticket" style={{ border: '2px dashed #059669' }}>
                    <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
                      <img src={workshopLogo} alt="Logo" style={{ maxHeight: '42px', maxWidth: '90px', objectFit: 'contain', margin: '0 auto 6px', display: 'block' }} />
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>{fiscalName.toUpperCase()}</div>
                      <div style={{ fontWeight: 800 }}>RIF: {fiscalRif}</div>
                      <div style={{ fontSize: '9px' }}>{fiscalAddress}</div>
                      <div style={{ fontWeight: 800, marginTop: '6px', fontSize: '12px' }}>FACTURA ELECTRÓNICA</div>
                      <div style={{ fontWeight: 800, fontSize: '13px' }}>FACTURA: {existingInvoice.invoiceNumber}</div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#dc2626' }}>CONTROL: {existingInvoice.controlNumber}</div>
                      <div>Fecha: {new Date(existingInvoice.issuedAt).toLocaleString('es-VE')}</div>
                      <div>Tasa BCV: Bs {existingInvoice.bcvRate.toFixed(2)}/USD</div>
                    </div>

                    <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
                      <div><strong>Cliente:</strong> {existingInvoice.clientName}</div>
                      <div><strong>RIF/CI:</strong> {existingInvoice.clientTaxId}</div>
                      <div><strong>Vehículo:</strong> {existingInvoice.vehicleDesc || vehicleDisplayName}</div>
                    </div>

                    <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '4px' }}>CONCEPTOS FACTURADOS:</div>
                      {(order.services || []).map((s, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{s.name || s.nombre} (G)</span>
                          <strong>${(s.price || s.precio || 0).toFixed(2)}</strong>
                        </div>
                      ))}
                      {(order.parts || []).map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{p.quantity || 1}x {p.name || p.nombre} (G)</span>
                          <strong>${((p.quantity || 1) * (p.price || 0)).toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Base Gravable 16%:</span>
                        <strong>${existingInvoice.taxableUSD.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>IVA 16%:</span>
                        <strong>${existingInvoice.ivaUSD.toFixed(2)}</strong>
                      </div>
                      {existingInvoice.igtfUSD > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>IGTF 3%:</span>
                          <strong>${existingInvoice.igtfUSD.toFixed(2)}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, marginTop: '4px' }}>
                        <span>TOTAL USD:</span>
                        <span>${existingInvoice.totalUSD.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800 }}>
                        <span>TOTAL VES:</span>
                        <span>Bs {existingInvoice.totalVES.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '6px 0' }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(existingInvoice.qrCodeUrl)}`}
                        alt="QR SENIAT"
                        style={{ width: '90px', height: '90px', margin: '0 auto 6px', display: 'block' }}
                      />
                      <div style={{ fontSize: '9px' }}>The Factory HKA C.A. • Prov. SNAT/2018/0141</div>
                      <div style={{ fontSize: '8px', marginTop: '2px' }}>Consulte validez escaneando el código QR</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </Modal>
  );
};
