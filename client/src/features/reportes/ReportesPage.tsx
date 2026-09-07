import React, { useState } from 'react';
import { useWorkOrderStore } from '../../store/useWorkOrderStore';
import { useCashStore } from '../../store/useCashStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useClientStore } from '../../store/useClientStore';
import { usePurchaseStore } from '../../store/usePurchaseStore';
import { Button, Card, EmptyState, Badge } from '../../components/ui';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Car, 
  Package, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  Wrench, 
  PieChart, 
  Award,
  RefreshCw
} from 'lucide-react';

export const ReportesPage: React.FC = () => {
  const { workOrders } = useWorkOrderStore();
  const { exchangeRateVES, getBalances } = useCashStore();
  const { items: inventoryItems } = useInventoryStore();
  const { clients } = useClientStore();
  const { purchaseOrders } = usePurchaseStore();

  // Controls state
  const [period, setPeriod] = useState<'HOY' | 'SEMANA' | 'MES' | 'ANO' | 'TODOS'>('MES');
  const [currencyDisplay, setCurrencyDisplay] = useState<'USD' | 'VES'>('USD');
  const [activeTab, setActiveTab] = useState<'financiero' | 'operativo' | 'clientes' | 'inventario'>('financiero');

  // Rate multiplier for formatting
  const rate = exchangeRateVES || 40.0;
  const isVes = currencyDisplay === 'VES';

  const formatMoney = (amountUSD: number) => {
    if (isVes) {
      const ves = amountUSD * rate;
      return `Bs. ${ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  // -------------------------------------------------------------
  // PERIOD FILTER LOGIC
  // -------------------------------------------------------------
  const now = new Date();
  const filteredOrders = workOrders.filter(order => {
    const orderDate = new Date(order.date);
    if (period === 'TODOS') return true;

    if (period === 'HOY') {
      return orderDate.toDateString() === now.toDateString();
    }

    if (period === 'SEMANA') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= sevenDaysAgo;
    }

    if (period === 'MES') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }

    if (period === 'ANO') {
      return orderDate.getFullYear() === now.getFullYear();
    }

    return true;
  });

  // -------------------------------------------------------------
  // FINANCIAL CALCULATIONS
  // -------------------------------------------------------------
  const totalRevenueUSD = filteredOrders
    .filter(o => o.status === 'Finalizado' || o.status === 'Listo' || (o.payments && o.payments.length > 0))
    .reduce((acc, o) => {
      const collected = (o.payments || []).reduce((pAcc, p) => pAcc + p.amountUSD, 0);
      return acc + (collected > 0 ? collected : o.totalUSD);
    }, 0);

  // Revenue breakdown: Services vs Parts
  let servicesRevenueUSD = 0;
  let partsRevenueUSD = 0;

  filteredOrders.forEach(order => {
    (order.services || []).forEach(s => {
      servicesRevenueUSD += (s.price || 0);
    });
    (order.parts || []).forEach(p => {
      partsRevenueUSD += ((p.price || 0) * (p.quantity || 1));
    });
  });

  // Estimated Cost of Parts Sold & Margin
  let partsCostUSD = 0;
  filteredOrders.forEach(order => {
    (order.parts || []).forEach(p => {
      const invMatch = inventoryItems.find(i => i.nombre.toLowerCase() === p.name?.toLowerCase());
      const unitCost = invMatch ? invMatch.costo : (p.price * 0.6); // 40% margin fallback if unlisted
      partsCostUSD += (unitCost * (p.quantity || 1));
    });
  });

  const estimatedGrossProfitUSD = Math.max(0, totalRevenueUSD - partsCostUSD);
  const profitMarginPercent = totalRevenueUSD > 0 ? ((estimatedGrossProfitUSD / totalRevenueUSD) * 100) : 0;

  // Payments by Method
  const methodTotalsUSD: Record<string, number> = {
    'Efectivo': 0,
    'Pago Movil': 0,
    'USDT': 0,
    'Zelle': 0,
    'Punto de Venta': 0,
    'Transferencia': 0
  };

  filteredOrders.forEach(order => {
    (order.payments || []).forEach(p => {
      if (methodTotalsUSD[p.method] !== undefined) {
        methodTotalsUSD[p.method] += p.amountUSD;
      } else {
        methodTotalsUSD['Efectivo'] += p.amountUSD;
      }
    });
  });

  // -------------------------------------------------------------
  // OPERATIONAL CALCULATIONS
  // -------------------------------------------------------------
  const ordersByStatus = {
    Recibido: filteredOrders.filter(o => o.status === 'Recibido').length,
    EnProceso: filteredOrders.filter(o => o.status === 'En Proceso').length,
    Listo: filteredOrders.filter(o => o.status === 'Listo').length,
    Finalizado: filteredOrders.filter(o => o.status === 'Finalizado').length,
  };

  // Mechanics Performance
  const mechanicMap: Record<string, { count: number; revenueUSD: number }> = {};
  filteredOrders.forEach(o => {
    const mech = o.mechanicName || 'Sin Asignar';
    if (!mechanicMap[mech]) mechanicMap[mech] = { count: 0, revenueUSD: 0 };
    mechanicMap[mech].count += 1;
    mechanicMap[mech].revenueUSD += o.totalUSD;
  });

  // Top Services Realized
  const serviceFrequencyMap: Record<string, { count: number; revenueUSD: number }> = {};
  filteredOrders.forEach(o => {
    (o.services || []).forEach(s => {
      const sName = s.name || 'Servicio General';
      if (!serviceFrequencyMap[sName]) serviceFrequencyMap[sName] = { count: 0, revenueUSD: 0 };
      serviceFrequencyMap[sName].count += 1;
      serviceFrequencyMap[sName].revenueUSD += (s.price || 0);
    });
  });

  const topServices = Object.entries(serviceFrequencyMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // -------------------------------------------------------------
  // CLIENTS & VEHICLES CALCULATIONS
  // -------------------------------------------------------------
  const brandFrequencyMap: Record<string, number> = {};
  filteredOrders.forEach(o => {
    const brand = o.vehicle?.marca || 'Otros';
    brandFrequencyMap[brand] = (brandFrequencyMap[brand] || 0) + 1;
  });

  const topBrands = Object.entries(brandFrequencyMap)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count);

  const clientSpendMap: Record<string, { name: string; visits: number; spentUSD: number }> = {};
  filteredOrders.forEach(o => {
    const cName = `${o.client?.nombre || ''} ${o.client?.apellido || ''}`.trim() || 'Cliente';
    if (!clientSpendMap[cName]) clientSpendMap[cName] = { name: cName, visits: 0, spentUSD: 0 };
    clientSpendMap[cName].visits += 1;
    clientSpendMap[cName].spentUSD += o.totalUSD;
  });

  const topClients = Object.values(clientSpendMap)
    .sort((a, b) => b.spentUSD - a.spentUSD)
    .slice(0, 10);

  // -------------------------------------------------------------
  // INVENTORY CALCULATIONS
  // -------------------------------------------------------------
  const partsSalesMap: Record<string, { name: string; qty: number; revenueUSD: number }> = {};
  filteredOrders.forEach(o => {
    (o.parts || []).forEach(p => {
      const pName = p.name || 'Repuesto';
      if (!partsSalesMap[pName]) partsSalesMap[pName] = { name: pName, qty: 0, revenueUSD: 0 };
      partsSalesMap[pName].qty += (p.quantity || 1);
      partsSalesMap[pName].revenueUSD += ((p.price || 0) * (p.quantity || 1));
    });
  });

  const topParts = Object.values(partsSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const inventoryValueUSD = inventoryItems
    .filter(i => i.tipo === 'PRODUCTO')
    .reduce((acc, i) => acc + (i.costo * i.stock), 0);

  const lowStockItems = inventoryItems.filter(i => i.tipo === 'PRODUCTO' && i.stock <= (i.stockMinimo || 5));

  // -------------------------------------------------------------
  // PRINT / EXPORT HANDLER
  // -------------------------------------------------------------
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Top Controls Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Reportes y Estadísticas del Taller</h1>
          <p className="page-subtitle">Análisis financiero, operativo y rendimiento de servicios en USD / VES.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Period Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            {[
              { id: 'HOY', label: 'Hoy' },
              { id: 'SEMANA', label: 'Esta Semana' },
              { id: 'MES', label: 'Este Mes' },
              { id: 'ANO', label: 'Este Año' },
              { id: 'TODOS', label: 'Histórico' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                style={{
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: period === p.id ? 700 : 500,
                  background: period === p.id ? 'var(--color-primary)' : 'transparent',
                  color: period === p.id ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Currency Toggle (USD / VES) */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setCurrencyDisplay('USD')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: currencyDisplay === 'USD' ? 800 : 500,
                background: currencyDisplay === 'USD' ? 'var(--color-success)' : 'transparent',
                color: currencyDisplay === 'USD' ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
            >
              💵 USD
            </button>
            <button
              onClick={() => setCurrencyDisplay('VES')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: currencyDisplay === 'VES' ? 800 : 500,
                background: currencyDisplay === 'VES' ? 'var(--color-primary)' : 'transparent',
                color: currencyDisplay === 'VES' ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
            >
              🇻🇪 VES (Bs)
            </button>
          </div>

          <Button variant="outline" icon={<Printer size={16} />} onClick={handlePrintReport}>
            Imprimir Reporte
          </Button>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('financiero')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'financiero' ? 700 : 500,
            color: activeTab === 'financiero' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'financiero' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          📊 Financiero y Rentabilidad
        </button>
        <button
          onClick={() => setActiveTab('operativo')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'operativo' ? 700 : 500,
            color: activeTab === 'operativo' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'operativo' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          ⚙️ Operativo y Mecánicos
        </button>
        <button
          onClick={() => setActiveTab('clientes')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'clientes' ? 700 : 500,
            color: activeTab === 'clientes' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'clientes' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          🚗 Clientes y Vehículos
        </button>
        <button
          onClick={() => setActiveTab('inventario')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'inventario' ? 700 : 500,
            color: activeTab === 'inventario' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'inventario' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          📦 Inventario y Stock
        </button>
      </div>

      {/* TAB 1: FINANCIERO */}
      {activeTab === 'financiero' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Financial Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <Card>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Ingresos Totales ({period})
              </div>
              <strong style={{ fontSize: '28px', color: 'var(--color-success)', display: 'block', marginTop: '6px' }}>
                {formatMoney(totalRevenueUSD)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {filteredOrders.length} orden(es) registradas
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Margen Bruto Estimado
              </div>
              <strong style={{ fontSize: '28px', color: 'var(--color-text-primary)', display: 'block', marginTop: '6px' }}>
                {formatMoney(estimatedGrossProfitUSD)}
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600, marginTop: '4px' }}>
                {profitMarginPercent.toFixed(1)}% de margen global
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Ventas de Servicios vs Repuestos
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px' }}>
                <span>🛠️ Servicios:</span>
                <strong>{formatMoney(servicesRevenueUSD)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13px' }}>
                <span>📦 Repuestos:</span>
                <strong>{formatMoney(partsRevenueUSD)}</strong>
              </div>
            </Card>
          </div>

          {/* Methods Breakdown & Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Card title="Ingresos por Método de Pago">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(methodTotalsUSD).map(([method, amount]) => {
                  const percent = totalRevenueUSD > 0 ? ((amount / totalRevenueUSD) * 100) : 0;
                  return (
                    <div key={method}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{method}</span>
                        <span><strong>{formatMoney(amount)}</strong> ({percent.toFixed(0)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--color-bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Estructura de Costos vs Ganancia">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', height: '100%' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Costo estimado de repuestos vendidos</div>
                  <strong style={{ fontSize: '20px', color: 'var(--color-danger)' }}>{formatMoney(partsCostUSD)}</strong>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Ganancia Bruta Retenida</div>
                  <strong style={{ fontSize: '24px', color: 'var(--color-success)' }}>{formatMoney(estimatedGrossProfitUSD)}</strong>
                </div>
              </div>
            </Card>
          </div>

        </div>
      )}

      {/* TAB 2: OPERATIVO */}
      {activeTab === 'operativo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Status distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <Card>
              <div style={{ fontSize: '12px', color: 'var(--color-info)', fontWeight: 700 }}>RECIBIDAS</div>
              <strong style={{ fontSize: '32px', marginTop: '4px', display: 'block' }}>{ordersByStatus.Recibido}</strong>
            </Card>
            <Card>
              <div style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 700 }}>EN PROCESO</div>
              <strong style={{ fontSize: '32px', marginTop: '4px', display: 'block' }}>{ordersByStatus.EnProceso}</strong>
            </Card>
            <Card>
              <div style={{ fontSize: '12px', color: '#a855f7', fontWeight: 700 }}>LISTAS PARA ENTREGAR</div>
              <strong style={{ fontSize: '32px', marginTop: '4px', display: 'block' }}>{ordersByStatus.Listo}</strong>
            </Card>
            <Card>
              <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 700 }}>FINALIZADAS</div>
              <strong style={{ fontSize: '32px', marginTop: '4px', display: 'block' }}>{ordersByStatus.Finalizado}</strong>
            </Card>
          </div>

          {/* Performance by Mechanic */}
          <Card title="Rendimiento y Producción por Mecánico">
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Mecánico</th>
                    <th style={{ padding: '12px 8px' }}>Órdenes Atendidas</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Monto Total Generado</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(mechanicMap).map(([mech, data]) => (
                    <tr key={mech} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{mech}</td>
                      <td style={{ padding: '12px 8px' }}>{data.count} orden(es)</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {formatMoney(data.revenueUSD)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Ranking Top Services */}
          <Card title="Top 10 Servicios Más Realizados">
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Nombre del Servicio</th>
                    <th style={{ padding: '12px 8px' }}>Frecuencia</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Facturado</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map(s => (
                    <tr key={s.name} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '12px 8px' }}>{s.count} veces</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700 }}>
                        {formatMoney(s.revenueUSD)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

      {/* TAB 3: CLIENTES Y VEHÍCULOS */}
      {activeTab === 'clientes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Top Brands */}
          <Card title="Marcas de Vehículos Más Atendidas">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topBrands.map(b => (
                <div key={b.brand} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-bg-secondary)', borderRadius: '6px' }}>
                  <strong style={{ fontSize: '13px' }}>🚗 {b.brand}</strong>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>{b.count} servicio(s)</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Frequent Clients */}
          <Card title="Top Clientes por Facturación">
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Cliente</th>
                    <th style={{ padding: '12px 8px' }}>Visitas</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Gastado</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map(c => (
                    <tr key={c.name} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '12px 8px' }}>{c.visits} visita(s)</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                        {formatMoney(c.spentUSD)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

      {/* TAB 4: INVENTARIO Y STOCK */}
      {activeTab === 'inventario' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Valoración Total del Inventario (Costo Al Día)
              </div>
              <strong style={{ fontSize: '28px', color: 'var(--color-text-primary)', display: 'block', marginTop: '6px' }}>
                {formatMoney(inventoryValueUSD)}
              </strong>
            </Card>

            <Card>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Productos con Stock Bajo
              </div>
              <strong style={{ fontSize: '28px', color: lowStockItems.length > 0 ? 'var(--color-danger)' : 'var(--color-success)', display: 'block', marginTop: '6px' }}>
                {lowStockItems.length} ítems en alerta
              </strong>
            </Card>
          </div>

          <Card title="Ranking de Repuestos Más Vendidos">
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Repuesto / Producto</th>
                    <th style={{ padding: '12px 8px' }}>Unidades Vendidas</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Ingreso Generado</th>
                  </tr>
                </thead>
                <tbody>
                  {topParts.map(p => (
                    <tr key={p.name} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '12px 8px' }}>{p.qty} unidades</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700 }}>
                        {formatMoney(p.revenueUSD)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

    </div>
  );
};
