import React, { useState, useEffect } from 'react';
import { useSubscriptionStore, SubscriptionPlanKey, PaymentMethodKey } from '../../store/useSubscriptionStore';
import { useAuthStore } from '../../stores/authStore';
import { useCashStore } from '../../store/useCashStore';
import { Card, Badge, Button, Input } from '../../components/ui';
import {
  Check,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Phone,
  Coins,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import './SubscriptionPage.css';

export const SubscriptionPage: React.FC = () => {
  const { user } = useAuthStore();
  const { subscription, paymentInfo, fetchSubscription, reportPayment, isLoading } = useSubscriptionStore();
  const { exchangeRateVES } = useCashStore();

  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlanKey | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('PAGO_MOVIL');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amountUSD, setAmountUSD] = useState<number>(39);
  const [notes, setNotes] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSubscription(user?.workshopId);
  }, []);

  const openPaymentModal = (planKey: SubscriptionPlanKey) => {
    setSelectedPlanForPayment(planKey);
    const plan = paymentInfo.plans.find((p) => p.id === planKey);
    if (plan) {
      const price = billingCycle === 'YEARLY' ? plan.yearlyUSD : plan.priceUSD;
      setAmountUSD(price);
    }
    setSubmitSuccess('');
    setSubmitError('');
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim()) {
      setSubmitError('Por favor ingresa el número de referencia de la transacción bancaria.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    const amountVES = amountUSD * (exchangeRateVES || 40);

    const res = await reportPayment({
      amountUSD,
      amountVES,
      paymentMethod,
      referenceNumber: referenceNumber.trim(),
      plan: selectedPlanForPayment || 'PRO',
      billingCycle,
      notes: notes || `Membresía ${selectedPlanForPayment} (${billingCycle})`,
    });

    setIsSubmitting(false);
    if (res.success) {
      setSubmitSuccess(res.message);
      setReferenceNumber('');
      setNotes('');
      setTimeout(() => {
        setShowPaymentModal(false);
        setSubmitSuccess('');
      }, 3000);
    } else {
      setSubmitError('Error al enviar el comprobante. Intenta nuevamente.');
    }
  };

  const calculatedVES = (amountUSD * (exchangeRateVES || 40)).toLocaleString('es-VE', {
    maximumFractionDigits: 2,
  });

  return (
    <div className="subscription-page animate-fade-in">
      {/* Header Banner */}
      <div className="subscription-header">
        <div className="subscription-header-info">
          <span className="subscription-eyebrow">
            <Sparkles size={16} /> Membresías Rumilcarapp SaaS
          </span>
          <h1 className="subscription-title">Elige el Plan Ideal para tu Taller</h1>
          <p className="subscription-subtitle">
            Herramientas diseñadas para maximizar la rentabilidad, digitalizar tus órdenes y fidelizar clientes en Venezuela.
          </p>
        </div>

        {/* Current Status Box */}
        {subscription && (
          <div className="current-status-card">
            <div className="status-badge-row">
              <span className="status-label">Tu Estado Actual:</span>
              <Badge variant={subscription.status === 'ACTIVE' ? 'success' : 'warning'}>
                {subscription.status === 'ACTIVE'
                  ? 'Membresía Activa'
                  : subscription.isTrial
                  ? 'Prueba 15 Días Gratis'
                  : 'Pendiente de Renovación'}
              </Badge>
            </div>
            <div className="status-plan-name">
              Plan:{' '}
              <strong>
                {subscription.plan === 'TRIAL'
                  ? 'Prueba Gratuita'
                  : subscription.plan === 'BASIC'
                  ? 'Taller Emprendedor'
                  : subscription.plan === 'PRO'
                  ? 'Taller Profesional'
                  : 'Taller Élite'}
              </strong>
            </div>
            <div className="status-days-left">
              <Clock size={16} />
              <span>
                {subscription.isExpired
                  ? 'Tu membresía ha vencido'
                  : `Te quedan ${subscription.daysRemaining} días de servicio`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cycle Switcher: Mensual / Anual */}
      <div className="billing-cycle-switch-container">
        <div className="billing-cycle-switch">
          <button
            type="button"
            className={`cycle-btn ${billingCycle === 'MONTHLY' ? 'active' : ''}`}
            onClick={() => setBillingCycle('MONTHLY')}
          >
            Facturación Mensual
          </button>
          <button
            type="button"
            className={`cycle-btn ${billingCycle === 'YEARLY' ? 'active' : ''}`}
            onClick={() => setBillingCycle('YEARLY')}
          >
            Facturación Anual
            <span className="save-pill">🎁 2 Meses Gratis</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="pricing-cards-grid">
        {paymentInfo.plans
          .filter((p) => p.id !== 'TRIAL')
          .map((plan) => {
            const isCurrent = subscription?.plan === plan.id && subscription?.status === 'ACTIVE';
            const price = billingCycle === 'YEARLY' ? plan.yearlyUSD : plan.priceUSD;
            const periodLabel = billingCycle === 'YEARLY' ? '/año' : '/mes';

            return (
              <div
                key={plan.id}
                className={`pricing-card ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}
              >
                {plan.popular && <div className="popular-ribbon">⭐ Más Recomendado</div>}

                <div className="pricing-card-header">
                  <div className="plan-badge-tag">{plan.badge}</div>
                  <h3 className="plan-name">{plan.name}</h3>
                  <div className="plan-price-wrap">
                    <span className="currency-symbol">$</span>
                    <span className="price-number">{price}</span>
                    <span className="price-period">{periodLabel}</span>
                  </div>
                  {billingCycle === 'YEARLY' && (
                    <div className="price-equivalent">
                      Equivalente a ${(price / 12).toFixed(1)}/mes
                    </div>
                  )}
                </div>

                <div className="pricing-features-list">
                  <div className="features-title">Incluye:</div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="feature-item">
                      <div className="check-icon">
                        <Check size={14} />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pricing-card-footer">
                  <Button
                    variant={plan.popular ? 'primary' : 'secondary'}
                    className="select-plan-btn"
                    onClick={() => openPaymentModal(plan.id)}
                  >
                    {isCurrent ? 'Renovar Este Plan' : `Elegir ${plan.name}`}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Official Payment Accounts Section */}
      <div className="official-accounts-section">
        <h2 className="section-title">
          <ShieldCheck size={22} color="#3b82f6" /> Cuentas Oficiales para Reportar Pagos
        </h2>
        <p className="section-desc">
          Aceptamos pagos directos y sin comisiones ocultas en Bolívares a tasa oficial, Zinli o USDT Binance Pay:
        </p>

        <div className="accounts-grid">
          {/* 1. Pago Móvil */}
          <div className="account-box">
            <div className="account-box-header">
              <Phone className="account-icon text-amber" size={24} />
              <div>
                <h4 className="account-name">Pago Móvil (Bolívares)</h4>
                <span className="account-sub">Tasa oficial BCV del día</span>
              </div>
            </div>
            <div className="account-details">
              <div className="detail-row">
                <span className="label">Teléfono:</span>
                <strong className="copyable">{paymentInfo.pagoMovil.phone}</strong>
              </div>
              <div className="detail-row">
                <span className="label">Banco:</span>
                <span>Banco Mercantil</span>
              </div>
              <div className="detail-row">
                <span className="label">Titular:</span>
                <span>{paymentInfo.pagoMovil.holder}</span>
              </div>
              <div className="detail-row">
                <span className="label">Cédula:</span>
                <span>V-24.317.195</span>
              </div>
            </div>
          </div>

          {/* 2. Zinli */}
          <div className="account-box">
            <div className="account-box-header">
              <CreditCard className="account-icon text-purple" size={24} />
              <div>
                <h4 className="account-name">Zinli (USD)</h4>
                <span className="account-sub">Envío directo de billetera a billetera</span>
              </div>
            </div>
            <div className="account-details">
              <div className="detail-row">
                <span className="label">Correo Zinli:</span>
                <strong className="copyable">luarkpadilla@gmail.com</strong>
              </div>
              <div className="detail-row">
                <span className="label">Titular:</span>
                <span>Luark Padilla</span>
              </div>
              <div className="detail-row">
                <span className="label">Moneda:</span>
                <span>Dólares (USD)</span>
              </div>
            </div>
          </div>

          {/* 3. USDT Binance Pay */}
          <div className="account-box">
            <div className="account-box-header">
              <Coins className="account-icon text-emerald" size={24} />
              <div>
                <h4 className="account-name">USDT (Solo Binance Pay)</h4>
                <span className="account-sub">Cero comisión con Binance Pay</span>
              </div>
            </div>
            <div className="account-details">
              <div className="detail-row">
                <span className="label">Correo Binance Pay:</span>
                <strong className="copyable">luarkpadilla@gmail.com</strong>
              </div>
              <div className="detail-row">
                <span className="label">Modalidad:</span>
                <span>Solo Binance Pay</span>
              </div>
              <div className="detail-row">
                <span className="label">Titular:</span>
                <span>Luark Padilla</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Report Modal */}
      {showPaymentModal && (
        <div className="payment-modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <div>
                <h3 className="modal-title">Reportar Pago de Membresía</h3>
                <span className="modal-subtitle">
                  Plan seleccionado:{' '}
                  <strong>
                    {selectedPlanForPayment === 'BASIC'
                      ? 'Taller Emprendedor'
                      : selectedPlanForPayment === 'PRO'
                      ? 'Taller Profesional'
                      : 'Taller Élite'}{' '}
                    ({billingCycle === 'YEARLY' ? 'Anual' : 'Mensual'})
                  </strong>
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowPaymentModal(false)}>
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="submit-success-box">
                <CheckCircle2 size={42} color="#10b981" />
                <h4>¡Comprobante Enviado con Éxito!</h4>
                <p>{submitSuccess}</p>
                <span className="small-text">Esta ventana se cerrará automáticamente...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment} className="payment-modal-form">
                {submitError && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Method selector */}
                <div className="form-group">
                  <label className="form-label">Método Utilizado para el Pago:</label>
                  <div className="method-selector-grid">
                    <button
                      type="button"
                      className={`method-option-btn ${paymentMethod === 'PAGO_MOVIL' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('PAGO_MOVIL')}
                    >
                      <Phone size={16} />
                      <span>Pago Móvil</span>
                    </button>
                    <button
                      type="button"
                      className={`method-option-btn ${paymentMethod === 'ZINLI' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('ZINLI')}
                    >
                      <CreditCard size={16} />
                      <span>Zinli</span>
                    </button>
                    <button
                      type="button"
                      className={`method-option-btn ${paymentMethod === 'USDT_BINANCE' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('USDT_BINANCE')}
                    >
                      <Coins size={16} />
                      <span>USDT Binance</span>
                    </button>
                  </div>
                </div>

                {/* Amount preview */}
                <div className="amount-preview-card">
                  <div className="amount-col">
                    <span className="label">Monto a pagar:</span>
                    <strong className="usd-text">${amountUSD} USD</strong>
                  </div>
                  {paymentMethod === 'PAGO_MOVIL' && (
                    <div className="amount-col">
                      <span className="label">Equivalente en Bs:</span>
                      <strong className="ves-text">Bs {calculatedVES}</strong>
                      <span className="rate-hint">Tasa: Bs {exchangeRateVES || 40} / $</span>
                    </div>
                  )}
                </div>

                {/* Reference number */}
                <div className="form-group">
                  <label className="form-label">
                    Número de Referencia Bancaria / ID de Transacción *
                  </label>
                  <Input
                    placeholder="Ej: 00984567 o Hash Binance Pay"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    required
                  />
                  <small className="field-hint">
                    Ingresa los últimos 6 a 8 dígitos de la confirmación bancaria.
                  </small>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notas Adicionales (Opcional):</label>
                  <Input
                    placeholder="Banco emisor, nombre del titular o comentario"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPaymentModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" loading={isSubmitting}>
                    <Send size={16} />
                    <span>Confirmar y Enviar Comprobante</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reported Payments History */}
      {subscription && subscription.payments.length > 0 && (
        <div className="payments-history-section">
          <h3 className="section-title">Historial de Pagos Reportados</h3>
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {subscription.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.createdAt).toLocaleDateString('es-VE')}</td>
                    <td>
                      <span className="method-pill">
                        {p.paymentMethod === 'PAGO_MOVIL'
                          ? 'Pago Móvil'
                          : p.paymentMethod === 'ZINLI'
                          ? 'Zinli'
                          : 'USDT Binance'}
                      </span>
                    </td>
                    <td>
                      <code>{p.referenceNumber}</code>
                    </td>
                    <td>
                      <strong>${p.amountUSD} USD</strong>
                      {p.amountVES && (
                        <span className="sub-ves"> (Bs {p.amountVES.toLocaleString('es-VE')})</span>
                      )}
                    </td>
                    <td>
                      {p.status === 'APPROVED' ? (
                        <span className="badge-approved">✅ Aprobado</span>
                      ) : p.status === 'REJECTED' ? (
                        <span className="badge-rejected">❌ Rechazado</span>
                      ) : (
                        <span className="badge-pending">⏳ En Verificación</span>
                      )}
                    </td>
                    <td>
                      <span className="notes-text">
                        {p.status === 'REJECTED'
                          ? p.rejectionReason || 'Referencia no encontrada'
                          : p.notes || 'Verificación en proceso'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
