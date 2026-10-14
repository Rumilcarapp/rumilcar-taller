import React, { useState } from 'react';
import { Card, Button, Input, Badge } from '../../../components/ui';
import { useBillingConfigStore, BillingProviderMode, HkaEnvironment } from '../../../store/useBillingConfigStore';
import { useCashStore } from '../../../store/useCashStore';
import {
  Receipt,
  Building,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  FileText,
  DollarSign,
  Percent,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
} from 'lucide-react';
import './BillingSettingsCard.css';

export const BillingSettingsCard: React.FC = () => {
  const {
    isEnabled,
    mode,
    hkaToken,
    hkaTokenSecret,
    hkaEnvironment,
    hkaSeries,
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
    updateConfig,
    testConnection,
    invoices,
  } = useBillingConfigStore();

  const { exchangeRateVES } = useCashStore();

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection();
      setTestResult(res);
    } catch {
      setTestResult({ success: false, message: 'Error de red al conectar con The Factory HKA.' });
    } finally {
      setTesting(false);
    }
  };

  const triggerFeedback = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(null), 3500);
  };

  const quotaPercent = Math.min(100, Math.round((invoicesIssuedThisMonth / monthlyQuota) * 100));

  return (
    <Card
      title="🧾 Facturación Digital SENIAT (The Factory HKA)"
      className="billing-settings-card"
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant={isEnabled ? 'success' : 'default'}>
            {isEnabled ? 'Servicio Activo' : 'Desactivado'}
          </Badge>
          {savedFeedback && (
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
              {savedFeedback}
            </span>
          )}
        </div>
      }
    >
      <div className="billing-settings-content">
        {/* Banner Explicativo */}
        <div className="billing-intro-banner">
          <div className="intro-icon">
            <Receipt size={24} />
          </div>
          <div className="intro-text">
            <strong>Emisión de Facturas Digitales Fiscales con Código QR y Número de Control SENIAT.</strong>
            <p>
              Rumilcarapp está preparado para funcionar en dos modalidades: bien sea con la membresía de facturación provista directamente por nosotros, o conectando las credenciales contratadas por tu taller.
            </p>
          </div>
        </div>

        {/* Interruptor Principal */}
        <div className="billing-toggle-row">
          <div>
            <strong style={{ fontSize: '14px' }}>Habilitar Facturación Electrónica en Órdenes y POS</strong>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
              Permite emitir facturas con timbre fiscal y código QR oficial del SENIAT al cobrar vehículos o ventas.
            </p>
          </div>
          <label className="switch-label">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => {
                updateConfig({ isEnabled: e.target.checked });
                triggerFeedback(e.target.checked ? 'Facturación habilitada' : 'Facturación deshabilitada');
              }}
            />
            <span className="switch-slider"></span>
          </label>
        </div>

        {isEnabled && (
          <>
            {/* Selector de Modalidad (Ambos Casos) */}
            <div className="billing-mode-selector">
              <label className="mode-option-label">
                <input
                  type="radio"
                  name="billingMode"
                  value="PLATFORM_MANAGED"
                  checked={mode === 'PLATFORM_MANAGED'}
                  onChange={() => {
                    updateConfig({ mode: 'PLATFORM_MANAGED' });
                    triggerFeedback('Modalidad cambiada: Proveída por Rumilcarapp');
                  }}
                />
                <div className={`mode-card ${mode === 'PLATFORM_MANAGED' ? 'active' : ''}`}>
                  <div className="mode-card-header">
                    <Sparkles size={18} className="text-primary" />
                    <strong>1. Membresía Provista por Rumilcarapp (Todo Incluido)</strong>
                  </div>
                  <p>
                    Rumilcarapp gestiona los folios y la conexión con The Factory HKA. Tu taller no debe pagar ni configurar contratos por separado; todo viene integrado en tu plan.
                  </p>
                  <span className="mode-status-tag">Recomendado para simplificar</span>
                </div>
              </label>

              <label className="mode-option-label">
                <input
                  type="radio"
                  name="billingMode"
                  value="OWN_CREDENTIALS"
                  checked={mode === 'OWN_CREDENTIALS'}
                  onChange={() => {
                    updateConfig({ mode: 'OWN_CREDENTIALS' });
                    triggerFeedback('Modalidad cambiada: Credenciales Propias del Taller');
                  }}
                />
                <div className={`mode-card ${mode === 'OWN_CREDENTIALS' ? 'active' : ''}`}>
                  <div className="mode-card-header">
                    <Key size={18} className="text-amber" />
                    <strong>2. Conectar Cuenta Propia de The Factory HKA</strong>
                  </div>
                  <p>
                    El taller contrata su propio plan directamente con The Factory HKA e ingresa su Token API. Las facturas se emiten descontando los folios de la cuenta del taller.
                  </p>
                  <span className="mode-status-tag">Gestión independiente</span>
                </div>
              </label>
            </div>

            {/* VISTA MODO 1: PROVEÍDA POR RUMILCARAPP */}
            {mode === 'PLATFORM_MANAGED' && (
              <div className="managed-quota-box">
                <div className="quota-header">
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      ESTADO DE LA MEMBRESÍA FISCAL
                    </span>
                    <h4 style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={18} color="#10b981" /> Activa por Rumilcarapp (Plan Élite)
                    </h4>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
                      {invoicesIssuedThisMonth} / {monthlyQuota}
                    </strong>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      facturas emitidas este mes
                    </span>
                  </div>
                </div>

                <div className="quota-bar-bg">
                  <div className="quota-bar-fill" style={{ width: `${quotaPercent}%` }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  <span>Cupo mensual asignado: {monthlyQuota} números de control/mes</span>
                  <span>{monthlyQuota - invoicesIssuedThisMonth} disponibles</span>
                </div>
              </div>
            )}

            {/* VISTA MODO 2: CREDENCIALES PROPIAS THE FACTORY HKA */}
            {mode === 'OWN_CREDENTIALS' && (
              <div className="own-credentials-box">
                <h4 style={{ margin: '0 0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={16} /> Credenciales de API (Entregadas por The Factory HKA)
                </h4>

                <div className="form-grid-2">
                  <Input
                    label="Token de Empresa / API Key"
                    placeholder="Ej: eyJhbGciOiJIUzI1NiIsInR5cCI..."
                    value={hkaToken}
                    type="password"
                    onChange={(e) => updateConfig({ hkaToken: e.target.value })}
                    hint="Generado en el portal de imprenta digital de The Factory HKA."
                  />
                  <Input
                    label="Token Secreto / Clave de Acceso"
                    placeholder="Clave de seguridad del Web Service"
                    value={hkaTokenSecret}
                    type="password"
                    onChange={(e) => updateConfig({ hkaTokenSecret: e.target.value })}
                  />
                </div>

                <div className="form-grid-2" style={{ marginTop: '12px' }}>
                  <div className="custom-form-field">
                    <label className="field-label">Ambiente de Operación:</label>
                    <select
                      className="custom-select"
                      value={hkaEnvironment}
                      onChange={(e) => updateConfig({ hkaEnvironment: e.target.value as HkaEnvironment })}
                    >
                      <option value="DEMO">Ambiente de Pruebas / Sandbox (Emisión Simulada)</option>
                      <option value="PRODUCTION">Ambiente Real / Producción SENIAT (Facturas Válidas)</option>
                    </select>
                    <span className="field-hint">
                      Utiliza "DEMO" para probar el sistema sin consumir números de control reales ante el SENIAT.
                    </span>
                  </div>

                  <Input
                    label="Serie o Prefijo de Factura"
                    placeholder="Ej: FAC, A, B"
                    value={hkaSeries}
                    onChange={(e) => updateConfig({ hkaSeries: e.target.value.toUpperCase() })}
                    hint="Serie fiscal asignada por el SENIAT para este punto de emisión."
                  />
                </div>

                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw size={14} className={testing ? 'spin' : ''} />}
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? 'Probando conexión...' : '🔌 Probar Conexión con The Factory HKA'}
                  </Button>
                  {testResult && (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: testResult.success ? '#10b981' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      {testResult.message}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* SECCIÓN 3: DATOS FISCALES DEL EMISOR (SENIAT) */}
            <div className="fiscal-emitter-box">
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={16} /> Datos Fiscales del Taller (Encabezado de la Factura SENIAT)
              </h4>

              <div className="form-grid-2">
                <Input
                  label="Razón Social Fiscal"
                  placeholder="Ej: Multiservicios Rumilcar C.A."
                  value={fiscalName}
                  onChange={(e) => updateConfig({ fiscalName: e.target.value })}
                />
                <Input
                  label="RIF Fiscal (con letra y guiones)"
                  placeholder="Ej: J-503967110"
                  value={fiscalRif}
                  onChange={(e) => updateConfig({ fiscalRif: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="form-grid-2" style={{ marginTop: '12px' }}>
                <Input
                  label="Dirección Fiscal Reglamentaria"
                  placeholder="Dirección registrada en el RIF del SENIAT"
                  value={fiscalAddress}
                  onChange={(e) => updateConfig({ fiscalAddress: e.target.value })}
                />
                <Input
                  label="Teléfono Fiscal de Contacto"
                  placeholder="Ej: 0414-1144532"
                  value={fiscalPhone}
                  onChange={(e) => updateConfig({ fiscalPhone: e.target.value })}
                />
              </div>
            </div>

            {/* SECCIÓN 4: PARÁMETROS TRIBUTARIOS VENEZOLANOS */}
            <div className="tax-parameters-box">
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Percent size={16} /> Configuración de Impuestos (IVA e IGTF)
              </h4>

              <div className="tax-switches-grid">
                <div className="tax-switch-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>IVA General (16%)</strong>
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        checked={applyIva}
                        onChange={(e) => updateConfig({ applyIva: e.target.checked })}
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                    Calcula y desglosa automáticamente la Base Imponible y el 16% de IVA en la factura.
                  </p>
                </div>

                <div className="tax-switch-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>IGTF Divisas (3%)</strong>
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        checked={applyIgtf}
                        onChange={(e) => updateConfig({ applyIgtf: e.target.checked })}
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                    Aplica la alícuota del 3% de IGTF cuando el cliente cancela en dólares en efectivo.
                  </p>
                </div>

                <div className="tax-switch-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>Tasa BCV del Día</strong>
                    <Badge variant="info">Bs {Number(exchangeRateVES).toFixed(2)}</Badge>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                    Sincroniza la conversión dual obligatoria a Bolívares con la tasa oficial del BCV.
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: HISTORIAL RÁPIDO DE FACTURAS EMITIDAS */}
            {invoices.length > 0 && (
              <div className="recent-invoices-box">
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} /> Últimas Facturas Emitidas ({invoices.length})
                </h4>
                <div className="invoices-mini-table">
                  {invoices.slice(0, 5).map((inv) => (
                    <div key={inv.id} className="invoice-mini-row">
                      <div>
                        <strong>{inv.invoiceNumber}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                          Control: {inv.controlNumber}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px' }}>{inv.clientName} ({inv.clientTaxId})</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        ${inv.totalUSD.toFixed(2)} USD
                      </div>
                      <span className="mini-badge-issued">Timbrada SENIAT</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
