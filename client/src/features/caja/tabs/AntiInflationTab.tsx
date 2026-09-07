import React, { useState, useId, useRef } from 'react';
import { 
  useAntiInflationStore, 
  Conversion 
} from '../../../store/useAntiInflationStore';
import { Card, Button, Modal, Badge } from '../../../components/ui';
import { 
  ShieldAlert, 
  ShieldCheck, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  RefreshCw, 
  ArrowRight, 
  Settings, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  History, 
  Sliders, 
  ArrowUpRight, 
  Zap, 
  HelpCircle,
  PlusCircle
} from 'lucide-react';

export const AntiInflationTab: React.FC = () => {
  const {
    saldoVES,
    tasasHistorial,
    conversiones,
    alertaConfig,
    ultimaTasaVES,
    registrarConversion,
    actualizarConfigAlerta,
    actualizarTasaHoy,
    actualizarSaldoVES,
    obtenerCalculoPerdida,
    proyectarPerdidaFutura,
    obtenerTasaAyer,
  } = useAntiInflationStore();

  const calc = obtenerCalculoPerdida();
  const proy = proyectarPerdidaFutura(30);
  const tasaAyer = obtenerTasaAyer();
  const tasaDiff = Number((ultimaTasaVES - tasaAyer).toFixed(2));

  // Referencia para scroll a la calculadora
  const calcSectionRef = useRef<HTMLDivElement>(null);

  // Estados de la calculadora de conversión
  const [montoVESInput, setMontoVESInput] = useState<number>(saldoVES.monto_ves);
  const [tasaUsadaInput, setTasaUsadaInput] = useState<number>(ultimaTasaVES);
  const [plataforma, setPlataforma] = useState<'binance_p2p' | 'reserve' | 'airtm' | 'efectivo' | 'otro'>('binance_p2p');
  const [comisionPorc, setComisionPorc] = useState<number>(0);
  const [fechaConversion, setFechaConversion] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notasConversion, setNotasConversion] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados de Modales
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [showAddVESModal, setShowAddVESModal] = useState(false);

  // Formulario configuración alertas
  const [tempUmbralPorc, setTempUmbralPorc] = useState(alertaConfig.umbral_porcentaje);
  const [tempUmbralDias, setTempUmbralDias] = useState(alertaConfig.umbral_dias);
  const [tempSubidaDiaria, setTempSubidaDiaria] = useState(alertaConfig.proyeccion_subida_diaria);
  const [tempCanal, setTempCanal] = useState(alertaConfig.canal_notificacion);

  // Formulario nueva tasa manual
  const [nuevaTasaInput, setNuevaTasaInput] = useState<number>(ultimaTasaVES);

  // Formulario saldo VES manual
  const [nuevoSaldoVESInput, setNuevoSaldoVESInput] = useState<number>(saldoVES.monto_ves);
  const [tasaIngresoVESInput, setTasaIngresoVESInput] = useState<number>(saldoVES.tasa_ingreso);

  // Actualizar comisiones sugeridas por plataforma
  const handlePlataformaChange = (plat: 'binance_p2p' | 'reserve' | 'airtm' | 'efectivo' | 'otro') => {
    setPlataforma(plat);
    if (plat === 'binance_p2p') setComisionPorc(0);
    else if (plat === 'reserve') setComisionPorc(1.5);
    else if (plat === 'airtm') setComisionPorc(5);
    else if (plat === 'efectivo') setComisionPorc(0);
  };

  // Cálculo en tiempo real de la calculadora
  const vesValid = Math.max(0, montoVESInput || 0);
  const tasaValid = tasaUsadaInput > 0 ? tasaUsadaInput : ultimaTasaVES;
  const usdtBruto = tasaValid > 0 ? vesValid / tasaValid : 0;
  const montoComisionUSDT = (usdtBruto * (comisionPorc || 0)) / 100;
  const usdtNeto = Math.max(0, usdtBruto - montoComisionUSDT);

  // Sincronizar campo de VES si cambia el saldo
  React.useEffect(() => {
    if (montoVESInput > saldoVES.monto_ves || montoVESInput === 0) {
      setMontoVESInput(saldoVES.monto_ves);
    }
  }, [saldoVES.monto_ves]);

  const handleScrollToCalc = () => {
    calcSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setMontoVESInput(saldoVES.monto_ves);
    setTasaUsadaInput(ultimaTasaVES);
  };

  const handleRegistrarConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (vesValid <= 0) {
      alert('Por favor introduce un monto de Bolívares válido a convertir.');
      return;
    }
    if (vesValid > saldoVES.monto_ves) {
      alert(`El monto no puede superar los Bs. ${saldoVES.monto_ves.toLocaleString('es-VE')} disponibles en caja.`);
      return;
    }

    const res = registrarConversion({
      fecha: fechaConversion,
      monto_ves: vesValid,
      tasa_usada: tasaValid,
      usdt_bruto: Number(usdtBruto.toFixed(2)),
      comision_porcentaje: comisionPorc,
      usdt_neto: Number(usdtNeto.toFixed(2)),
      plataforma,
      notas: notasConversion || undefined,
    });

    if (res.ok) {
      setToastMessage(res.message);
      setNotasConversion('');
      setTimeout(() => setToastMessage(null), 6000);
    } else {
      alert(res.message);
    }
  };

  const handleGuardarConfig = () => {
    actualizarConfigAlerta({
      umbral_porcentaje: tempUmbralPorc,
      umbral_dias: tempUmbralDias,
      proyeccion_subida_diaria: tempSubidaDiaria,
      canal_notificacion: tempCanal,
    });
    setShowConfigModal(false);
    setToastMessage('✓ Configuración de alertas antiinflación guardada exitosamente.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleGuardarNuevaTasa = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaTasaInput <= 0) return alert('Ingresa una tasa válida.');
    actualizarTasaHoy(nuevaTasaInput, 'manual');
    setTasaUsadaInput(nuevaTasaInput);
    setShowRatesModal(false);
    setToastMessage(`✓ Tasa del día actualizada a Bs. ${nuevaTasaInput.toFixed(2)} / $1 USD`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleGuardarSaldoVES = (e: React.FormEvent) => {
    e.preventDefault();
    actualizarSaldoVES(nuevoSaldoVESInput, tasaIngresoVESInput);
    setShowAddVESModal(false);
    setMontoVESInput(nuevoSaldoVESInput);
    setToastMessage(`✓ Saldo en caja actualizado a Bs. ${nuevoSaldoVESInput.toLocaleString('es-VE')}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // KPIs de conversiones del mes
  const hoyMes = new Date().getMonth();
  const hoyAno = new Date().getFullYear();
  const conversionesMes = conversiones.filter((c) => {
    const d = new Date(c.fecha);
    return d.getMonth() === hoyMes && d.getFullYear() === hoyAno;
  });

  const totalUSDTConvertidoMes = conversionesMes.reduce((acc, c) => acc + c.usdt_neto, 0);
  const totalVESConvertidoMes = conversionesMes.reduce((acc, c) => acc + c.monto_ves, 0);
  const tasaPromedioPonderada = totalUSDTConvertidoMes > 0 ? (totalVESConvertidoMes / totalUSDTConvertidoMes) : 0;
  const mejorTasa = conversionesMes.length > 0 
    ? [...conversionesMes].sort((a, b) => b.tasa_usada - a.tasa_usada)[0]
    : null;
  const totalComisionesPagadasUSD = conversionesMes.reduce((acc, c) => acc + (c.usdt_bruto - c.usdt_neto), 0);

  // Configuración de estilo según urgencia de la Card Principal
  const getUrgencyStyles = () => {
    if (saldoVES.monto_ves <= 0 || calc.urgencia === 'verde') {
      return {
        bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.18) 100%)',
        border: '1px solid #10b981',
        iconColor: '#10b981',
        title: '✅ SIN BOLÍVARES PENDIENTES DE CONVERSIÓN',
        badgeColor: '#10b981',
        badgeText: 'Protegido 100%',
      };
    }
    if (calc.urgencia === 'amarillo') {
      return {
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.18) 100%)',
        border: '1px solid #f59e0b',
        iconColor: '#f59e0b',
        title: `⚠️ TIENES Bs. ${saldoVES.monto_ves.toLocaleString('es-VE')} SIN CONVERTIR`,
        badgeColor: '#f59e0b',
        badgeText: `Pérdida Leve (${calc.perdidaPorcentaje}%)`,
      };
    }
    if (calc.urgencia === 'naranja') {
      return {
        bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.22) 100%)',
        border: '1px solid #f97316',
        iconColor: '#f97316',
        title: `⚠️ TIENES Bs. ${saldoVES.monto_ves.toLocaleString('es-VE')} SIN CONVERTIR`,
        badgeColor: '#f97316',
        badgeText: `Pérdida Moderada (${calc.perdidaPorcentaje}%)`,
      };
    }
    // Rojo
    return {
      bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.25) 100%)',
      border: '2px solid #ef4444',
      iconColor: '#ef4444',
      title: `🚨 TIENES Bs. ${saldoVES.monto_ves.toLocaleString('es-VE')} SIN CONVERTIR`,
      badgeColor: '#ef4444',
      badgeText: `¡Devaluación Crítica! (${calc.perdidaPorcentaje}%)`,
    };
  };

  const urgencyStyle = getUrgencyStyles();

  // Generar puntos para el SVG del Gráfico de Devaluación
  // Tomamos los últimos 15 días del historial de tasas
  const chartPoints = tasasHistorial.slice(-15).map((t, index, arr) => {
    const rateVal = t.tasa_ves_usd;
    const usdVal = saldoVES.monto_ves > 0 ? saldoVES.monto_ves / rateVal : 0;
    const originalVal = calc.valorOriginalUSD;
    const loss = originalVal > 0 ? Math.max(0, originalVal - usdVal) : 0;
    return {
      fecha: t.fecha,
      rate: rateVal,
      usdVal: Number(usdVal.toFixed(2)),
      originalVal: Number(originalVal.toFixed(2)),
      loss: Number(loss.toFixed(2)),
      x: (index / Math.max(1, arr.length - 1)) * 500, // ancho 500
    };
  });

  // Escala Y para el gráfico SVG
  const minVal = Math.min(...chartPoints.map((p) => p.usdVal), calc.valorActualUSD * 0.9);
  const maxVal = Math.max(...chartPoints.map((p) => p.originalVal), calc.valorOriginalUSD * 1.05);
  const yRange = maxVal - minVal > 0 ? maxVal - minVal : 1;

  const getY = (val: number) => {
    const norm = (val - minVal) / yRange;
    return 160 - norm * 120; // alto 180, margen 20 a 160
  };

  const redPath = chartPoints.reduce((acc, p, idx) => {
    const y = getY(p.usdVal);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${y.toFixed(1)}`;
  }, '');

  const greyPath = chartPoints.reduce((acc, p, idx) => {
    const y = getY(p.originalVal);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${y.toFixed(1)}`;
  }, '');

  // Área sombreada de pérdida
  const areaPath = chartPoints.length > 0
    ? `${chartPoints.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${getY(p.usdVal).toFixed(1)}`, '')} ${chartPoints.slice().reverse().reduce((acc, p) => `${acc} L ${p.x.toFixed(1)},${getY(p.originalVal).toFixed(1)}`, '')} Z`
    : '';

  // Estado hover para el tooltip del gráfico
  const [hoveredPoint, setHoveredPoint] = useState<typeof chartPoints[0] | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Notificación flotante */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: 'var(--color-bg-surface, #1e1e1e)',
            color: 'var(--color-text, #fff)',
            border: '1px solid #10b981',
            borderRadius: '10px',
            padding: '14px 20px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.3s ease-in-out',
            maxWidth: '440px'
          }}
        >
          <CheckCircle2 color="#10b981" size={22} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1.1 — CARD DE ALERTA PRINCIPAL (Full Width)                           */}
      {/* ===================================================================== */}
      <div
        style={{
          background: urgencyStyle.bg,
          border: urgencyStyle.border,
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {saldoVES.monto_ves > 0 ? (
              <ShieldAlert size={32} color={urgencyStyle.iconColor} />
            ) : (
              <ShieldCheck size={32} color={urgencyStyle.iconColor} />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                  {urgencyStyle.title}
                </h2>
                <span
                  style={{
                    backgroundColor: urgencyStyle.badgeColor,
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    letterSpacing: '0.5px'
                  }}
                >
                  {urgencyStyle.badgeText}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary, #a1a1aa)' }}>
                {saldoVES.monto_ves > 0
                  ? 'El poder adquisitivo de este dinero se está devaluando en tiempo real frente al dólar/USDT.'
                  : '¡Excelente! Todos tus ingresos en bolívares han sido asegurados o convertidos a divisa fuerte.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="outline"
              size="sm"
              icon={<PlusCircle size={15} />}
              onClick={() => setShowAddVESModal(true)}
              title="Ajustar o cargar saldo en Bs."
            >
              Ajustar Saldo VES
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<History size={15} />}
              onClick={() => setShowRatesModal(true)}
            >
              Historial Tasas
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Settings size={15} />}
              onClick={() => setShowConfigModal(true)}
            >
              Configurar alerta
            </Button>
          </div>
        </div>

        {saldoVES.monto_ves > 0 ? (
          <>
            {/* Comparativa Tasa & Valor */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                background: 'rgba(0, 0, 0, 0.15)',
                padding: '16px',
                borderRadius: '10px'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Tasa cuando ingresaron:
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                  Bs. {saldoVES.tasa_ingreso.toFixed(2)} / $1 USD
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)' }}>
                  hace {calc.diasTranscurridos} día(s) ({saldoVES.fecha_ingreso})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Tasa actual de mercado:
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px', color: '#f59e0b' }}>
                  Bs. {ultimaTasaVES.toFixed(2)} / $1 USD
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)' }}>
                  actualizada hoy ({new Date().toISOString().split('T')[0]})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Valor al ingresar:
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                  ${calc.valorOriginalUSD.toFixed(2)} USD
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)' }}>
                  Poder de compra inicial
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Valor real actual:
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px', color: urgencyStyle.iconColor }}>
                  ${calc.valorActualUSD.toFixed(2)} USD
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)' }}>
                  Equivalente a la tasa de hoy
                </div>
              </div>
            </div>

            {/* Resumen de Pérdida & Proyección */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 800, color: urgencyStyle.iconColor }}>
                <TrendingDown size={20} />
                <span>
                  📉 HAS PERDIDO ${calc.perdidaUSD.toFixed(2)} USD ({calc.perdidaPorcentaje.toFixed(2)}%) en {calc.diasTranscurridos} día(s)
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, #d4d4d8)', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px' }}>
                💡 <strong>Si esperas 30 días más</strong> (tasa proyectada estimada: <strong>Bs. {proy.tasaProyectada.toFixed(2)} / $1</strong> con subida de {alertaConfig.proyeccion_subida_diaria}% diario):
                <span style={{ color: '#ef4444', fontWeight: 700, marginLeft: '6px' }}>
                  Pérdida proyectada adicional: ~${proy.perdidaAdicionalUSD.toFixed(2)} USD más.
                </span>
                <span style={{ fontSize: '10px', display: 'block', color: 'var(--color-text-muted, #a1a1aa)', marginTop: '2px' }}>
                  * Estimación referencial calculada con el modelo exponencial de subida diaria.
                </span>
              </div>
            </div>

            {/* Botón CTA Principal */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
              <Button
                variant="primary"
                size="md"
                onClick={handleScrollToCalc}
                icon={<ArrowRight size={18} />}
                style={{ 
                  backgroundColor: '#D32F2F', 
                  borderColor: '#D32F2F', 
                  fontWeight: 800, 
                  padding: '12px 24px', 
                  fontSize: '14px',
                  boxShadow: '0 4px 14px rgba(211, 47, 47, 0.4)'
                }}
              >
                CONVERTIR AHORA →
              </Button>
            </div>
          </>
        ) : (
          <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
              Caja blindada contra inflación. Cualquier nuevo cobro en Bolívares (Pago Móvil, Transferencia o POS) activará automáticamente el monitoreo.
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Zap size={15} />}
              onClick={() => {
                actualizarSaldoVES(45200, 92.40);
                setMontoVESInput(45200);
              }}
            >
              Simular Bs. 45,200 en caja
            </Button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 1.2 — MÉTRICAS DEL PANEL (Fila de 4 KPIs)                             */}
      {/* ===================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* KPI 1: VES EN CAJA */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
              VES en Caja
            </span>
            <span style={{ fontSize: '16px' }}>🇻🇪</span>
          </div>
          <strong style={{ fontSize: '24px', display: 'block', marginTop: '6px' }}>
            Bs. {saldoVES.monto_ves.toLocaleString('es-VE')}
          </strong>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #a1a1aa)', marginTop: '4px' }}>
            ≈ ${calc.valorActualUSD.toFixed(2)} USD hoy
          </div>
        </Card>

        {/* KPI 2: PÉRDIDA ACUMULADA */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
              Pérdida Acumulada
            </span>
            <TrendingDown size={16} color={calc.perdidaUSD > 0 ? '#ef4444' : '#10b981'} />
          </div>
          <strong style={{ fontSize: '24px', display: 'block', marginTop: '6px', color: calc.perdidaUSD > 0 ? '#ef4444' : '#10b981' }}>
            ${calc.perdidaUSD.toFixed(2)} USD
          </strong>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #a1a1aa)', marginTop: '4px' }}>
            {calc.perdidaUSD > 0 ? `en ${calc.diasTranscurridos} día(s) (-${calc.perdidaPorcentaje}%)` : '0% devaluación'}
          </div>
        </Card>

        {/* KPI 3: CONVERTIDO ESTE MES */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
              Convertido este Mes
            </span>
            <ShieldCheck size={16} color="#10b981" />
          </div>
          <strong style={{ fontSize: '24px', display: 'block', marginTop: '6px', color: '#10b981' }}>
            ${totalUSDTConvertidoMes.toFixed(2)} USDT
          </strong>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #a1a1aa)', marginTop: '4px' }}>
            {conversionesMes.length} conversión(es) completada(s)
          </div>
        </Card>

        {/* KPI 4: TASA HOY */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
              Tasa Hoy (USD / VES)
            </span>
            <TrendingUp size={16} color="#f59e0b" />
          </div>
          <strong style={{ fontSize: '24px', display: 'block', marginTop: '6px', color: '#f59e0b' }}>
            Bs. {ultimaTasaVES.toFixed(2)} / $1
          </strong>
          <div style={{ fontSize: '12px', color: tasaDiff >= 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
            {tasaDiff >= 0 ? `↑ Bs. +${tasaDiff.toFixed(2)} hoy` : `↓ Bs. ${tasaDiff.toFixed(2)} hoy`}
          </div>
        </Card>

      </div>

      {/* ===================================================================== */}
      {/* 1.3 — GRÁFICO DE DEVALUACIÓN INTERACTIVO (SVG)                        */}
      {/* ===================================================================== */}
      <Card
        title="Curva de Devaluación del Saldo en Caja"
        subtitle="Visualización del poder de compra del saldo en Bolívares vs. Valor original en USD"
      >
        <div style={{ width: '100%', overflowX: 'auto', padding: '8px 0' }}>
          
          {/* Leyenda superior del gráfico */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', fontSize: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '3px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
              <span><strong>Línea roja:</strong> Valor real en USD del saldo con la tasa histórica diaria</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '3px', borderTop: '2px dashed #a1a1aa' }} />
              <span><strong>Línea gris punteada:</strong> Valor original al ingresar los bolívares</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', backgroundColor: 'rgba(239, 68, 68, 0.18)', borderRadius: '3px', border: '1px solid #ef4444' }} />
              <span><strong>Brecha sombreada:</strong> Pérdida de capital acumulada</span>
            </div>
          </div>

          {/* Canvas SVG Interactivo */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <svg
              viewBox="0 0 520 200"
              style={{ width: '100%', height: '220px', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.04" />
                </linearGradient>
              </defs>

              {/* Cuadrícula horizontal referencial */}
              <line x1="10" y1="40" x2="510" y2="40" stroke="var(--color-border, #3f3f46)" strokeDasharray="3,3" opacity="0.4" />
              <line x1="10" y1="100" x2="510" y2="100" stroke="var(--color-border, #3f3f46)" strokeDasharray="3,3" opacity="0.4" />
              <line x1="10" y1="160" x2="510" y2="160" stroke="var(--color-border, #3f3f46)" strokeDasharray="3,3" opacity="0.4" />

              {/* Etiquetas Y */}
              <text x="12" y="36" fill="var(--color-text-muted, #71717a)" fontSize="10">${maxVal.toFixed(0)} USD</text>
              <text x="12" y="96" fill="var(--color-text-muted, #71717a)" fontSize="10">${((maxVal + minVal) / 2).toFixed(0)} USD</text>
              <text x="12" y="156" fill="var(--color-text-muted, #71717a)" fontSize="10">${minVal.toFixed(0)} USD</text>

              {/* Área de pérdida sombreada */}
              {areaPath && (
                <path d={areaPath} fill="url(#lossGradient)" />
              )}

              {/* Línea gris punteada (valor original) */}
              <path
                d={greyPath}
                fill="none"
                stroke="#a1a1aa"
                strokeWidth="2"
                strokeDasharray="4,4"
              />

              {/* Línea roja (valor devaluado) */}
              <path
                d={redPath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Puntos de datos interactivos */}
              {chartPoints.map((pt, i) => {
                const cy = getY(pt.usdVal);
                const isHover = hoveredPoint?.fecha === pt.fecha;
                return (
                  <g key={pt.fecha}>
                    <circle
                      cx={pt.x}
                      cy={cy}
                      r={isHover ? 6 : 4}
                      fill={isHover ? '#ffffff' : '#ef4444'}
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* Etiquetas eje X (cada 3 puntos) */}
                    {i % 3 === 0 && (
                      <text
                        x={pt.x}
                        y="182"
                        textAnchor="middle"
                        fill="var(--color-text-muted, #71717a)"
                        fontSize="9"
                      >
                        {pt.fecha.slice(5)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Tooltip flotante interactivo */}
            {hoveredPoint && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'var(--color-bg-surface, #18181b)',
                  border: '1px solid var(--color-border, #3f3f46)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  fontSize: '12px',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--color-text, #fff)', borderBottom: '1px solid var(--color-border, #3f3f46)', paddingBottom: '4px', marginBottom: '6px' }}>
                  📅 Fecha: {hoveredPoint.fecha}
                </div>
                <div>Tasa del día: <strong>Bs. {hoveredPoint.rate.toFixed(2)}</strong></div>
                <div>Valor ese día: <strong style={{ color: '#ef4444' }}>${hoveredPoint.usdVal.toFixed(2)} USD</strong></div>
                <div>Valor original: <strong>${hoveredPoint.originalVal.toFixed(2)} USD</strong></div>
                <div style={{ color: '#ef4444', fontWeight: 800, marginTop: '4px' }}>
                  📉 Pérdida acumulada: -${hoveredPoint.loss.toFixed(2)} USD
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* 2.1 — CALCULADORA DE CONVERSIÓN VES → USDT (Inline)                   */}
      {/* ===================================================================== */}
      <div ref={calcSectionRef}>
        <Card
          title="⚡ Calculadora y Registro de Conversión VES → USDT"
          subtitle="Convierte tus bolívares a divisa digital o efectivo para frenar la pérdida en caja"
        >
          <form onSubmit={handleRegistrarConversion} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              
              {/* Campo 1: Bolívares a convertir */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bolívares a convertir (VES):</span>
                  <span style={{ color: 'var(--color-primary, #d32f2f)', cursor: 'pointer', fontSize: '11px' }} onClick={() => setMontoVESInput(saldoVES.monto_ves)}>
                    (Max: Bs. {saldoVES.monto_ves.toLocaleString('es-VE')})
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={saldoVES.monto_ves > 0 ? saldoVES.monto_ves : undefined}
                  step="any"
                  value={montoVESInput || ''}
                  onChange={(e) => setMontoVESInput(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #3f3f46)',
                    background: 'var(--color-bg-secondary, #27272a)',
                    color: 'var(--color-text, #fff)',
                    fontSize: '15px',
                    fontWeight: 700,
                    marginTop: '6px'
                  }}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)' }}>
                  Puedes convertir el total o una fracción según tu necesidad.
                </span>
              </div>

              {/* Campo 2: Tasa de conversión usada */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tasa de conversión usada (Bs. / $1 USDT):</span>
                  <span style={{ color: 'var(--color-text-muted, #71717a)', fontSize: '11px' }}>
                    Referencia actual: Bs. {ultimaTasaVES.toFixed(2)}
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tasaUsadaInput || ''}
                  onChange={(e) => setTasaUsadaInput(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #3f3f46)',
                    background: 'var(--color-bg-secondary, #27272a)',
                    color: 'var(--color-text, #fff)',
                    fontSize: '15px',
                    fontWeight: 700,
                    marginTop: '6px'
                  }}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)' }}>
                  Editable si la tasa P2P pactada varía levemente de la referencia.
                </span>
              </div>

            </div>

            {/* Recuadro de Cálculo en Tiempo Real */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '10px',
                padding: '18px 22px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Recibirás (Bruto):
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text, #fff)', marginTop: '2px' }}>
                  {usdtBruto.toFixed(2)} USDT
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Comisión Exchange ({comisionPorc}%):
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
                  - {montoComisionUSDT.toFixed(2)} USDT
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>
                  USDT NETO FINAL:
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                  {usdtNeto.toFixed(2)} USDT
                </div>
              </div>
            </div>

            {/* Fila 2: Plataforma y Comisión */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>
                  Exchange / Plataforma destino:
                </label>
                <select
                  value={plataforma}
                  onChange={(e) => handlePlataformaChange(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #3f3f46)',
                    background: 'var(--color-bg-secondary, #27272a)',
                    color: 'var(--color-text, #fff)',
                    fontSize: '14px',
                    marginTop: '6px'
                  }}
                >
                  <option value="binance_p2p">Binance P2P (Típico 0%)</option>
                  <option value="reserve">Reserve App (~1.5%)</option>
                  <option value="airtm">AirTM (~5%)</option>
                  <option value="efectivo">Efectivo USD (0%)</option>
                  <option value="otro">Otro / Personalizado</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>
                  % Comisión de la plataforma:
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={comisionPorc}
                  onChange={(e) => setComisionPorc(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #3f3f46)',
                    background: 'var(--color-bg-secondary, #27272a)',
                    color: 'var(--color-text, #fff)',
                    fontSize: '14px',
                    marginTop: '6px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700 }}>
                  Fecha de conversión:
                </label>
                <input
                  type="date"
                  value={fechaConversion}
                  onChange={(e) => setFechaConversion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #3f3f46)',
                    background: 'var(--color-bg-secondary, #27272a)',
                    color: 'var(--color-text, #fff)',
                    fontSize: '14px',
                    marginTop: '6px'
                  }}
                  required
                />
              </div>

            </div>

            {/* Notas / Referencia */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700 }}>
                Notas / Referencia de la operación:
              </label>
              <input
                type="text"
                placeholder="Ej: Orden Binance P2P #2059384, transferido desde Mercantil a comerciante verificado"
                value={notasConversion}
                onChange={(e) => setNotasConversion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #3f3f46)',
                  background: 'var(--color-bg-secondary, #27272a)',
                  color: 'var(--color-text, #fff)',
                  fontSize: '14px',
                  marginTop: '6px'
                }}
              />
            </div>

            {/* Acciones de Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--color-border, #3f3f46)', paddingTop: '16px' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMontoVESInput(saldoVES.monto_ves);
                  setTasaUsadaInput(ultimaTasaVES);
                }}
              >
                Restablecer
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={<CheckCircle2 size={18} />}
                style={{ 
                  backgroundColor: '#10b981', 
                  borderColor: '#10b981', 
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '10px 24px'
                }}
              >
                ✓ REGISTRAR CONVERSIÓN
              </Button>
            </div>

          </form>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* 3.1 — HISTORIAL DE CONVERSIONES                                       */}
      {/* ===================================================================== */}
      <Card
        title="Historial y Auditoría de Conversiones"
        subtitle="Registro histórico de blindaje de bolívares hacia USDT o efectivo con sus tasas efectivas"
      >
        {/* Métricas del Historial */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
            background: 'var(--color-bg-secondary, #27272a)',
            padding: '14px',
            borderRadius: '8px'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Convertido (Mes)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
              ${totalUSDTConvertidoMes.toFixed(2)} USDT
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
              Tasa Promedio Ponderada
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
              Bs. {tasaPromedioPonderada > 0 ? tasaPromedioPonderada.toFixed(2) : ultimaTasaVES.toFixed(2)} / $1
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
              Mejor Tasa Lograda
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              {mejorTasa ? `Bs. ${mejorTasa.tasa_usada.toFixed(2)} (${mejorTasa.fecha.slice(5)})` : 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #71717a)', fontWeight: 700, textTransform: 'uppercase' }}>
              Comisiones Pagadas
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
              ${totalComisionesPagadasUSD.toFixed(2)} USD
            </div>
          </div>
        </div>

        {/* Tabla de Conversiones */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border, #3f3f46)', color: 'var(--color-text-muted, #71717a)' }}>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Fecha</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>VES Convertidos</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Tasa Usada</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>USDT Obtenidos</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Comisión</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Plataforma</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {conversiones.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted, #71717a)' }}>
                    No hay conversiones registradas todavía.
                  </td>
                </tr>
              ) : (
                conversiones.map((c) => {
                  const getPlatBadge = () => {
                    switch (c.plataforma) {
                      case 'binance_p2p':
                        return <span style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>Binance P2P</span>;
                      case 'reserve':
                        return <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>Reserve</span>;
                      case 'airtm':
                        return <span style={{ background: '#8b5cf6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>AirTM</span>;
                      case 'efectivo':
                        return <span style={{ background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>Efectivo USD</span>;
                      default:
                        return <span style={{ background: '#71717a', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>Otro</span>;
                    }
                  };

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border, #3f3f46)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{c.fecha}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 700 }}>Bs. {c.monto_ves.toLocaleString('es-VE')}</td>
                      <td style={{ padding: '12px 10px', color: '#f59e0b', fontWeight: 600 }}>Bs. {c.tasa_usada.toFixed(2)}</td>
                      <td style={{ padding: '12px 10px', color: '#10b981', fontWeight: 800 }}>+{c.usdt_neto.toFixed(2)} USDT</td>
                      <td style={{ padding: '12px 10px', color: 'var(--color-text-muted, #71717a)' }}>{c.comision_porcentaje}%</td>
                      <td style={{ padding: '12px 10px' }}>{getPlatBadge()}</td>
                      <td style={{ padding: '12px 10px', color: 'var(--color-text-secondary, #a1a1aa)', fontSize: '12px', maxWidth: '240px' }}>
                        {c.notas || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* MODAL 1: CONFIGURACIÓN DE ALERTAS DE DEVALUACIÓN                      */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="⚙️ Configurar Alertas de Devaluación"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary, #a1a1aa)', margin: 0 }}>
            Establece los parámetros con los que el sistema disparará advertencias en el Dashboard y la campanita de notificaciones.
          </p>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              Alertar cuando la pérdida supere (% sobre el saldo):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min="0.5"
                max="25"
                step="0.5"
                value={tempUmbralPorc}
                onChange={(e) => setTempUmbralPorc(parseFloat(e.target.value) || 3)}
                style={{
                  width: '100px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #3f3f46)',
                  background: 'var(--color-bg-secondary, #27272a)',
                  color: 'var(--color-text, #fff)'
                }}
              />
              <span style={{ fontSize: '13px' }}>% (Por defecto: 3%)</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              Alertar si llevo más de X días sin convertir bolívares:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min="1"
                max="30"
                value={tempUmbralDias}
                onChange={(e) => setTempUmbralDias(parseInt(e.target.value) || 3)}
                style={{
                  width: '100px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #3f3f46)',
                  background: 'var(--color-bg-secondary, #27272a)',
                  color: 'var(--color-text, #fff)'
                }}
              />
              <span style={{ fontSize: '13px' }}>días en caja (Por defecto: 3 días)</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              Proyección de tasa (% de subida diaria estimada):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                value={tempSubidaDiaria}
                onChange={(e) => setTempSubidaDiaria(parseFloat(e.target.value) || 0.5)}
                style={{
                  width: '100px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #3f3f46)',
                  background: 'var(--color-bg-secondary, #27272a)',
                  color: 'var(--color-text, #fff)'
                }}
              />
              <span style={{ fontSize: '13px' }}>% diario para cálculos a 30 días (Por defecto: 0.5%)</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              Canal preferido de notificación:
            </label>
            <select
              value={tempCanal}
              onChange={(e) => setTempCanal(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border, #3f3f46)',
                background: 'var(--color-bg-secondary, #27272a)',
                color: 'var(--color-text, #fff)'
              }}
            >
              <option value="inapp">Campanita In-App y Dashboard (Recomendado)</option>
              <option value="whatsapp">WhatsApp al número del dueño (+58)</option>
              <option value="email">Correo Electrónico del Taller</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleGuardarConfig}>
              Guardar Configuración
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 2: HISTORIAL Y REGISTRO DE TASAS                                */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showRatesModal}
        onClose={() => setShowRatesModal(false)}
        title="📈 Historial y Registro de Tasas de Cambio"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Formulario rápido para actualizar tasa de hoy */}
          <form onSubmit={handleGuardarNuevaTasa} style={{ background: 'var(--color-bg-secondary, #27272a)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              Registrar / Actualizar Tasa de Hoy:
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                step="0.01"
                min="1"
                value={nuevaTasaInput}
                onChange={(e) => setNuevaTasaInput(parseFloat(e.target.value) || 0)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #3f3f46)',
                  background: 'var(--color-bg-surface, #18181b)',
                  color: 'var(--color-text, #fff)',
                  fontSize: '15px',
                  fontWeight: 700
                }}
                required
              />
              <Button type="submit" variant="primary" size="sm">
                Guardar Tasa
              </Button>
            </div>
          </form>

          {/* Tabla de tasas */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border, #3f3f46)', color: 'var(--color-text-muted, #71717a)' }}>
                  <th style={{ padding: '8px' }}>Fecha</th>
                  <th style={{ padding: '8px' }}>Tasa (Bs. / $1)</th>
                  <th style={{ padding: '8px' }}>Fuente</th>
                </tr>
              </thead>
              <tbody>
                {tasasHistorial.slice().reverse().map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border, #27272a)' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{t.fecha}</td>
                    <td style={{ padding: '8px', fontWeight: 800, color: '#f59e0b' }}>Bs. {t.tasa_ves_usd.toFixed(2)}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                        {t.fuente === 'api_automatica' ? 'API Monitor' : 'Manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowRatesModal(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 3: AJUSTAR SALDO EN BOLÍVARES MANUALMENTE                       */}
      {/* ===================================================================== */}
      <Modal
        isOpen={showAddVESModal}
        onClose={() => setShowAddVESModal(false)}
        title="🇻🇪 Ajustar Saldo de Bolívares en Caja"
      >
        <form onSubmit={handleGuardarSaldoVES} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary, #a1a1aa)', margin: 0 }}>
            Puedes definir el monto en Bolívares existente en gaveta o bancos y la tasa a la que ingresó para calibrar las alertas.
          </p>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              Monto en Bolívares (VES):
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={nuevoSaldoVESInput}
              onChange={(e) => setNuevoSaldoVESInput(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border, #3f3f46)',
                background: 'var(--color-bg-secondary, #27272a)',
                color: 'var(--color-text, #fff)',
                fontSize: '15px',
                fontWeight: 700
              }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              Tasa de ingreso de referencia (Bs. / $1 USD):
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={tasaIngresoVESInput}
              onChange={(e) => setTasaIngresoVESInput(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border, #3f3f46)',
                background: 'var(--color-bg-secondary, #27272a)',
                color: 'var(--color-text, #fff)',
                fontSize: '15px',
                fontWeight: 700
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="outline" onClick={() => setShowAddVESModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Saldo
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
