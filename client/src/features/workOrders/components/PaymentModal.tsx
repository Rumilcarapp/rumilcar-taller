import React, { useState, useEffect } from 'react';
import { WorkOrder, PaymentRecord, useWorkOrderStore } from '../../../store/useWorkOrderStore';
import { useCashStore, PaymentMethod } from '../../../store/useCashStore';
import { Modal, Button } from '../../../components/ui';
import { 
  DollarSign, 
  Smartphone, 
  Coins, 
  Building2, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Printer, 
  Share2 
} from 'lucide-react';
import { handlePrintOrder, handleWhatsAppShare } from '../../../lib/orderActions';

interface Props {
  order: WorkOrder;
  onClose: () => void;
  onSuccess?: () => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: any; color: string; currency: 'USD' | 'VES' }[] = [
  { id: 'Efectivo', label: 'Efectivo USD (Gaveta)', icon: DollarSign, color: '#10b981', currency: 'USD' },
  { id: 'Pago Movil', label: 'Pago Móvil (Bs)', icon: Smartphone, color: '#3b82f6', currency: 'VES' },
  { id: 'USDT', label: 'USDT (Binance / Cripto)', icon: Coins, color: '#f59e0b', currency: 'USD' },
  { id: 'Zelle', label: 'Zelle (Dólares)', icon: Building2, color: '#8b5cf6', currency: 'USD' },
  { id: 'Punto de Venta', label: 'Punto de Venta (Tarjeta Bs)', icon: CreditCard, color: '#06b6d4', currency: 'VES' },
  { id: 'Transferencia', label: 'Transferencia Bancaria', icon: Building2, color: '#64748b', currency: 'USD' },
];

export const PaymentModal: React.FC<Props> = ({ order, onClose, onSuccess }) => {
  const { payAndFinalizeOrder } = useWorkOrderStore();
  const { isOpened, openBox, exchangeRateVES, setExchangeRateVES } = useCashStore();

  const [rate, setRate] = useState<number>(exchangeRateVES || 40.0);
  const [isMixed, setIsMixed] = useState(false);
  
  // Single payment mode state
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Efectivo');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  // Mixed payment mode state
  const [mixedPayments, setMixedPayments] = useState<{ id: string; method: PaymentMethod; amountUSD: number; reference: string }[]>([
    { id: '1', method: 'Efectivo', amountUSD: Math.round(order.totalUSD / 2), reference: '' },
    { id: '2', method: 'Pago Movil', amountUSD: order.totalUSD - Math.round(order.totalUSD / 2), reference: '' }
  ]);

  const [completed, setCompleted] = useState(false);

  // Auto fetch BCV rate if available
  useEffect(() => {
    fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      .then(res => res.json())
      .then(data => {
        if (data?.promedio) {
          setRate(data.promedio);
          setExchangeRateVES(data.promedio);
        }
      })
      .catch(() => {});
  }, [setExchangeRateVES]);

  const totalUSD = order.totalUSD || 0;
  const totalVES = totalUSD * rate;

  const mixedTotalUSD = mixedPayments.reduce((acc, p) => acc + (p.amountUSD || 0), 0);
  const remainingUSD = totalUSD - mixedTotalUSD;

  const handleConfirmPayment = () => {
    if (!isOpened) {
      if (confirm('La caja registradora está cerrada. ¿Deseas abrirla ahora con $0.00 para procesar el cobro?')) {
        openBox(0);
      } else {
        return;
      }
    }

    const records: PaymentRecord[] = [];

    if (!isMixed) {
      records.push({
        method: selectedMethod,
        amountUSD: totalUSD,
        amountVES: (selectedMethod === 'Pago Movil' || selectedMethod === 'Punto de Venta') ? totalVES : undefined,
        rate: rate,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
        date: new Date().toISOString()
      });
    } else {
      if (Math.abs(remainingUSD) > 0.01) {
        alert(`El total de los pagos divididos ($${mixedTotalUSD.toFixed(2)}) debe coincidir con el total de la orden ($${totalUSD.toFixed(2)}). Diferencia: $${remainingUSD.toFixed(2)}`);
        return;
      }

      mixedPayments.forEach(p => {
        const isVes = p.method === 'Pago Movil' || p.method === 'Punto de Venta';
        records.push({
          method: p.method,
          amountUSD: p.amountUSD,
          amountVES: isVes ? p.amountUSD * rate : undefined,
          rate: rate,
          reference: p.reference.trim() || undefined,
          date: new Date().toISOString()
        });
      });
    }

    payAndFinalizeOrder(order.id, records);
    setCompleted(true);
    if (onSuccess) onSuccess();
  };

  const addMixedRow = () => {
    const defaultAmt = remainingUSD > 0 ? remainingUSD : 0;
    setMixedPayments([
      ...mixedPayments,
      { id: Math.random().toString(), method: 'Pago Movil', amountUSD: defaultAmt, reference: '' }
    ]);
  };

  const removeMixedRow = (id: string) => {
    if (mixedPayments.length <= 1) return;
    setMixedPayments(mixedPayments.filter(p => p.id !== id));
  };

  const updateMixedRow = (id: string, field: string, value: any) => {
    setMixedPayments(mixedPayments.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <Modal 
      isOpen={true} 
      title={completed ? "Cobro Procesado Exitosamente" : `Cobrar y Finalizar Orden ${order.id}`}
      onClose={onClose}
    >
      {completed ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={36} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>¡Orden Cobrada y Entregada!</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            El ingreso de <strong>${totalUSD.toFixed(2)}</strong> fue cargado en la <strong>Caja Registradora</strong> según el método seleccionado y el inventario fue actualizado.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="outline" icon={<Printer size={16} />} onClick={() => handlePrintOrder(order)}>
              Imprimir Recibo
            </Button>
            <Button variant="outline" icon={<Share2 size={16} />} onClick={() => handleWhatsAppShare(order)}>
              Enviar WhatsApp
            </Button>
            <Button onClick={onClose}>
              Finalizar
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Box Warning if Closed */}
          {!isOpened && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '13px' }}>
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong>Caja Cerrada:</strong> Al confirmar, la caja se abrirá automáticamente para registrar este ingreso.
              </div>
            </div>
          )}

          {/* Amount Header Banner */}
          <div style={{ 
            background: 'var(--color-bg-secondary)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '12px', 
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total a Cobrar</span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                ${totalUSD.toFixed(2)} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)' }}>USD</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '2px' }}>
                ≈ Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Tasa de Cambio (Bs/$)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Bs.</span>
                <input 
                  type="number"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '80px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'right'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Single vs Mixed Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
            <button
              onClick={() => setIsMixed(false)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: !isMixed ? 700 : 500,
                color: !isMixed ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: !isMixed ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              Pago Único
            </button>
            <button
              onClick={() => setIsMixed(true)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: isMixed ? 700 : 500,
                color: isMixed ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: isMixed ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              Pago Mixto / Combinado
            </button>
          </div>

          {/* SINGLE PAYMENT MODE */}
          {!isMixed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  const isSelected = selectedMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px',
                        borderRadius: '10px',
                        border: `1.5px solid ${isSelected ? m.color : 'var(--color-border)'}`,
                        background: isSelected ? `${m.color}15` : 'var(--color-bg-secondary)',
                        color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '8px', 
                        background: `${m.color}20`, 
                        color: m.color, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px' }}>{m.label}</div>
                        {m.currency === 'VES' && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Reference number for electronic methods */}
              {selectedMethod !== 'Efectivo' && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                    {selectedMethod === 'Pago Movil' || selectedMethod === 'Transferencia' ? 'Número de Referencia / Comprobante (4 o 6 dígitos)' : 
                     selectedMethod === 'Zelle' ? 'Nombre del Titular / Correo Zelle' : 
                     'ID de Transacción / Hash / Teléfono'}
                  </label>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Ej: 123456"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '13px' }}>Nota u observación (opcional)</label>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Ej: Pagó billetes de $20 / Cambio devuelto..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          ) : (
            /* MIXED PAYMENT MODE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span>Define los montos que el cliente cancela en cada método:</span>
                <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={addMixedRow}>
                  Agregar método
                </Button>
              </div>

              {mixedPayments.map((p, idx) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 36px', gap: '8px', alignItems: 'center', background: 'var(--color-bg-secondary)', padding: '8px 12px', borderRadius: '8px' }}>
                  <select
                    className="input-field"
                    value={p.method}
                    onChange={(e) => updateMixedRow(p.id, 'method', e.target.value)}
                    style={{ fontSize: '12px' }}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>

                  <div style={{ position: 'relative' }}>
                    <input 
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="USD"
                      value={p.amountUSD === 0 ? '' : p.amountUSD}
                      onChange={(e) => updateMixedRow(p.id, 'amountUSD', parseFloat(e.target.value) || 0)}
                      style={{ fontSize: '12px', paddingRight: '28px' }}
                    />
                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--color-text-muted)' }}>$</span>
                  </div>

                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Ref / Comprobante"
                    value={p.reference}
                    onChange={(e) => updateMixedRow(p.id, 'reference', e.target.value)}
                    style={{ fontSize: '12px' }}
                  />

                  <button 
                    type="button" 
                    className="icon-btn" 
                    onClick={() => removeMixedRow(p.id)}
                    style={{ color: 'var(--color-danger)' }}
                    title="Eliminar línea"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: remainingUSD === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                <span>Total Asignado: ${mixedTotalUSD.toFixed(2)} / ${totalUSD.toFixed(2)}</span>
                <span style={{ color: remainingUSD === 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {remainingUSD === 0 ? '✓ Monto Completo' : `Resta por asignar: $${remainingUSD.toFixed(2)}`}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button 
              onClick={handleConfirmPayment}
              disabled={isMixed && Math.abs(remainingUSD) > 0.01}
              icon={<CheckCircle size={18} />}
            >
              Registrar Cobro y Entregar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
