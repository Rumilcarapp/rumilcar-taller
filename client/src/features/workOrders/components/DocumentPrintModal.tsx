import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { WorkOrder } from '../../../store/useWorkOrderStore';
import { useCashStore } from '../../../store/useCashStore';
import { Printer, Send, Link, FileText, Receipt, Check } from 'lucide-react';
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
  const [format, setFormat] = useState<'LETTER' | 'TICKET'>('LETTER');
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const totalUSD = order.totalUSD || 0;
  const rate = exchangeRateVES || 65;
  const totalVES = totalUSD * rate;

  const paidUSD = (order.payments || []).reduce((acc, p) => acc + (p.amountUSD || 0), 0);
  const pendingUSD = Math.max(0, totalUSD - paidUSD);

  const trackingUrl = `${window.location.origin}/rastreo/${order.id}`;

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
    const msg = `¡Hola ${order.client?.nombre || 'Estimado Cliente'}! 👋 Adjuntamos el detalle de su *${docName} #${order.id}* de Rumilcar Taller Mecánico.\n\n` +
      `🚗 *Vehículo:* ${order.vehicle?.marca || ''} ${order.vehicle?.modelo || ''} (${order.vehicle?.placa || ''})\n` +
      `💰 *Total:* $${totalUSD.toFixed(2)} USD (Bs ${totalVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })})\n` +
      (pendingUSD > 0 ? `⚠️ *Saldo pendiente:* $${pendingUSD.toFixed(2)} USD\n\n` : `✅ *Estado:* Totalmente cancelado\n\n`) +
      `🔍 *Puede consultar el estado y avance de su vehículo en vivo aquí:*\n${trackingUrl}`;

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

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyTracking}
              icon={copied ? <Check size={14} color="#10b981" /> : <Link size={14} />}
            >
              {copied ? '¡Enlace Copiado!' : 'Copiar Link de Rastreo'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSendWhatsApp}
              icon={<Send size={14} />}
              style={{ color: '#25D366', borderColor: '#25D366' }}
            >
              Enviar WhatsApp
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
                <div className="doc-brand-badge">R</div>
                <div>
                  <div className="doc-brand-name">RUMILCAR</div>
                  <div className="doc-brand-sub">TALLER MECÁNICO Y SERVICIOS AUTOMOTRICES</div>
                  <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                    RIF: J-50123456-7 • Tel: (0414) 123-4567 • info@rumilcar.com
                  </div>
                  <div style={{ fontSize: '11px', color: '#4b5563' }}>
                    Av. Principal Los Talleres, Galpón #14, Valencia, Carabobo
                  </div>
                </div>
              </div>

              <div className="doc-number-box">
                <div className="doc-type-title">{typeLabels[documentType]}</div>
                <div className="doc-number">#{order.id}</div>
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
                <div className="doc-info-value">{order.client?.nombre} {order.client?.apellido}</div>
                <div>CI / RIF: <strong>{order.client?.documento || 'No registrado'}</strong></div>
                <div>Teléfono: <strong>{order.client?.telefono || 'No registrado'}</strong></div>
                <div>Dirección: {order.client?.direccion || 'Valencia'}</div>
              </div>

              <div className="doc-info-col">
                <div className="doc-info-label">DATOS DEL VEHÍCULO</div>
                <div className="doc-info-value">{order.vehicle?.marca} {order.vehicle?.modelo} ({order.vehicle?.ano || 'N/A'})</div>
                <div>Placa: <strong>{order.vehicle?.placa}</strong> • Color: {order.vehicle?.color || 'N/A'}</div>
                <div>Kilometraje: <strong>{order.vehicle?.kilometraje || 45000} KM</strong></div>
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

            {/* Terms and Warranties */}
            <div className="doc-terms-box">
              <strong>TÉRMINOS Y CONDICIONES DE GARANTÍA:</strong>
              <div>• Garantía de 30 días o 1.000 KM sobre mano de obra mecánica efectuada en nuestras instalaciones.</div>
              <div>• Repuestos eléctricos y electrónicos no poseen garantía una vez instalados, salvo defecto de fábrica comprobable.</div>
              <div>• Los presupuestos tienen una vigencia máxima de 7 días continuos sujetos a variación de repuestos.</div>
              <div>• Todo vehículo no retirado pasados 5 días hábiles luego de la notificación de entrega generará cargo por estacionamiento.</div>
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
              <div style={{ fontWeight: 800, fontSize: '15px' }}>RUMILCAR TALLER</div>
              <div>RIF: J-50123456-7</div>
              <div>Tel: 0414-1234567</div>
              <div style={{ fontWeight: 700, marginTop: '4px' }}>{typeLabels[documentType]}</div>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>#{order.id}</div>
              <div>Fecha: {new Date(order.date).toLocaleDateString()}</div>
            </div>

            <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
              <div><strong>Cliente:</strong> {order.client?.nombre} {order.client?.apellido}</div>
              <div><strong>CI/RIF:</strong> {order.client?.documento}</div>
              <div><strong>Auto:</strong> {order.vehicle?.marca} {order.vehicle?.modelo}</div>
              <div><strong>Placa:</strong> {order.vehicle?.placa}</div>
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

      </div>
    </Modal>
  );
};
