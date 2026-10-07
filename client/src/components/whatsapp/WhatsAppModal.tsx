import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  Car, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink 
} from 'lucide-react';
import { 
  WhatsAppTemplateType, 
  WhatsAppContextData, 
  normalizePhoneNumber, 
  buildWhatsAppMessage, 
  openWhatsApp, 
  copyToClipboard 
} from '../../lib/whatsapp';
import './WhatsAppModal.css';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: WhatsAppContextData;
  initialTemplate?: WhatsAppTemplateType;
  initialRecipient?: 'client' | 'workshop';
}

const TEMPLATE_OPTIONS: { id: WhatsAppTemplateType; label: string; icon: string }[] = [
  { id: 'PRESUPUESTO', label: '📋 Presupuesto (Cliente)', icon: '📋' },
  { id: 'PRESUPUESTO_TALLER', label: '🏢 Presupuesto para Taller', icon: '🏢' },
  { id: 'VEHICULO_LISTO', label: '🚗 Vehículo Listo', icon: '🚗' },
  { id: 'COBRANZA', label: '💵 Cobro & Pago Móvil', icon: '💵' },
  { id: 'AVANCE', label: '🔧 Avance de Trabajo', icon: '🔧' },
  { id: 'POST_VENTA', label: '🛡️ Garantía / Saludo', icon: '🛡️' },
  { id: 'LIBRE', label: '✏️ Mensaje Libre', icon: '✏️' },
];

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  contextData,
  initialTemplate,
  initialRecipient = 'client'
}) => {
  const [recipient, setRecipient] = useState<'client' | 'workshop'>(initialRecipient);

  // Determine best default template based on context status if not provided
  const getDefaultTemplate = (targetRec: 'client' | 'workshop'): WhatsAppTemplateType => {
    if (initialTemplate) return initialTemplate;
    if (contextData.status === 'Presupuesto') {
      return targetRec === 'workshop' ? 'PRESUPUESTO_TALLER' : 'PRESUPUESTO';
    }
    if (targetRec === 'workshop') {
      return 'PRESUPUESTO_TALLER';
    }
    if (contextData.status === 'Listo' || contextData.status === 'Finalizado') {
      return 'VEHICULO_LISTO';
    }
    if ((contextData.balancePendingUSD || 0) > 0) {
      return 'COBRANZA';
    }
    return 'VEHICULO_LISTO';
  };

  const [activeTemplate, setActiveTemplate] = useState<WhatsAppTemplateType>(getDefaultTemplate(initialRecipient));
  const [phoneNumber, setPhoneNumber] = useState<string>(
    initialRecipient === 'workshop' ? (contextData.workshopPhone || '') : (contextData.clientPhone || '')
  );
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [preferWeb, setPreferWeb] = useState<boolean>(false);

  // Sync state whenever modal opens or context changes
  useEffect(() => {
    if (isOpen) {
      const rec = initialRecipient || 'client';
      setRecipient(rec);
      const tpl = getDefaultTemplate(rec);
      setActiveTemplate(tpl);
      setPhoneNumber(rec === 'workshop' ? (contextData.workshopPhone || '') : (contextData.clientPhone || ''));
      const initialText = buildWhatsAppMessage(tpl, contextData);
      setMessage(initialText);
      setCopied(false);
    }
  }, [isOpen, contextData, initialTemplate, initialRecipient]);

  // Handle switching recipient
  const handleSwitchRecipient = (target: 'client' | 'workshop') => {
    setRecipient(target);
    const targetPhone = target === 'workshop' ? (contextData.workshopPhone || '') : (contextData.clientPhone || '');
    setPhoneNumber(targetPhone);

    let nextTemplate = activeTemplate;
    if (target === 'workshop' && activeTemplate === 'PRESUPUESTO') {
      nextTemplate = 'PRESUPUESTO_TALLER';
    } else if (target === 'client' && activeTemplate === 'PRESUPUESTO_TALLER') {
      nextTemplate = 'PRESUPUESTO';
    }
    setActiveTemplate(nextTemplate);
    const newText = buildWhatsAppMessage(nextTemplate, contextData);
    setMessage(newText);
  };

  // Handle template switch
  const handleSelectTemplate = (tpl: WhatsAppTemplateType) => {
    setActiveTemplate(tpl);
    const newText = buildWhatsAppMessage(tpl, contextData);
    setMessage(newText);
  };

  // Phone normalization
  const phoneValidation = normalizePhoneNumber(phoneNumber);

  const handleCopy = async () => {
    const ok = await copyToClipboard(message);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSend = () => {
    if (!phoneValidation.valid) {
      alert(`Por favor verifica el número de teléfono: ${phoneValidation.reason || 'inválido'}`);
      return;
    }
    openWhatsApp(phoneValidation.e164, message, preferWeb);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enviar Mensaje por WhatsApp (Oficial wa.me)"
      size="lg"
    >
      <div className="wa-modal-container">
        
        {/* Safe notice banner */}
        <div className="wa-notice-safe">
          <ShieldCheck size={16} />
          <span>
            <strong>Método 100% Seguro:</strong> Comunicación oficial vía <code>wa.me</code> asistida por clic. 
            Cero riesgo de suspensión o baneo de la línea del taller.
          </span>
        </div>

        {/* Client & Vehicle summary */}
        <div className="wa-header-summary">
          <div className="wa-client-info">
            <span className="wa-client-name">
              {contextData.clientName || 'Cliente sin nombre'}
            </span>
            <div className="wa-vehicle-badge">
              <Car size={13} />
              <span>
                {contextData.vehicle?.marca || 'Vehículo'} {contextData.vehicle?.modelo || ''} 
                {contextData.vehicle?.placa ? ` • Placa: ${contextData.vehicle.placa}` : ''}
              </span>
              {contextData.orderId && <strong>• #{contextData.orderId}</strong>}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Saldo / Total:</span>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-success, #16a34a)' }}>
              ${(contextData.balancePendingUSD !== undefined ? contextData.balancePendingUSD : (contextData.totalUSD || 0)).toFixed(2)} USD
            </div>
            {contextData.exchangeRateVES && contextData.exchangeRateVES > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Tasa: {contextData.exchangeRateVES} Bs
              </span>
            )}
          </div>
        </div>

        {/* Recipient Selector */}
        <div className="wa-recipient-section">
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '6px', display: 'block' }}>
            Destinatario del WhatsApp:
          </label>
          <div className="wa-recipient-selector">
            <button
              type="button"
              className={`wa-recipient-btn ${recipient === 'client' ? 'active' : ''}`}
              onClick={() => handleSwitchRecipient('client')}
            >
              <span>👤 Cliente: {contextData.clientName || 'Cliente'}</span>
              <span className="wa-recipient-phone-tag">{contextData.clientPhone || 'Sin número'}</span>
            </button>
            <button
              type="button"
              className={`wa-recipient-btn ${recipient === 'workshop' ? 'active' : ''}`}
              onClick={() => handleSwitchRecipient('workshop')}
            >
              <span>🏢 Taller: {contextData.workshopName || 'Taller'}</span>
              <span className="wa-recipient-phone-tag">{contextData.workshopPhone || 'Sin número'}</span>
            </button>
          </div>
          {recipient === 'workshop' && !contextData.workshopPhone && (
            <div style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: '6px', marginTop: '6px' }}>
              ⚠️ El taller no tiene un teléfono configurado en el Perfil de la Empresa. Puedes escribirlo directamente a continuación.
            </div>
          )}
        </div>

        {/* Phone number input & status */}
        <div className="wa-phone-row">
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)' }}>
            {recipient === 'workshop' ? 'Número de WhatsApp del Taller:' : 'Número de WhatsApp del Cliente:'}
          </label>
          <div className="wa-phone-input-group">
            <input
              type="text"
              className="wa-phone-input"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ej: 0414-1234567 o +58 412..."
            />
            {phoneValidation.valid ? (
              <span className="wa-phone-badge-valid" title={`wa.me/${phoneValidation.e164}`}>
                <Check size={12} /> {phoneValidation.display}
              </span>
            ) : (
              <span className="wa-phone-badge-invalid" title={phoneValidation.reason}>
                <AlertCircle size={12} /> Número Inválido
              </span>
            )}
          </div>
        </div>

        {/* Template Selector */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px', display: 'block' }}>
            Seleccionar Plantilla Rápida:
          </label>
          <div className="wa-templates-bar">
            {TEMPLATE_OPTIONS.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={`wa-tpl-chip ${activeTemplate === tpl.id ? 'active' : ''}`}
                onClick={() => handleSelectTemplate(tpl.id)}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text editor */}
        <div className="wa-editor-area">
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)' }}>
            Mensaje (puedes personalizarlo antes de enviar):
          </label>
          <textarea
            className="wa-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            placeholder="Escribe el mensaje..."
          />
          <div className="wa-editor-footer">
            <span>Formato WhatsApp: *negrita*, _cursiva_, ~tachado~</span>
            <span>{message.length} caracteres</span>
          </div>
        </div>

        {/* Options and Action buttons */}
        <div className="wa-footer-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={preferWeb}
                onChange={(e) => setPreferWeb(e.target.checked)}
              />
              <span>Forzar WhatsApp Web en pestaña nueva</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              icon={copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
            >
              {copied ? '¡Texto Copiado!' : 'Copiar Texto'}
            </Button>

            <button
              type="button"
              className="wa-btn-send"
              onClick={handleSend}
              disabled={!phoneValidation.valid}
            >
              <Send size={16} />
              <span>Abrir WhatsApp</span>
              <ExternalLink size={14} style={{ opacity: 0.8 }} />
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
