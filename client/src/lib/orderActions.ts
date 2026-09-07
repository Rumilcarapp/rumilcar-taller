import { WorkOrder } from '../store/useWorkOrderStore';
import { 
  normalizePhoneNumber, 
  buildWhatsAppMessage, 
  openWhatsApp, 
  WhatsAppContextData 
} from './whatsapp';
import { useCashStore } from '../store/useCashStore';

export const getOrderWhatsAppContext = (order: WorkOrder): WhatsAppContextData => {
  const rate = useCashStore.getState().exchangeRateVES || 0;
  const paid = (order.payments || []).reduce((acc, p) => acc + (p.amountUSD || 0), 0);
  const pending = Math.max(0, (order.totalUSD || 0) - paid);

  return {
    clientName: order.client?.nombre,
    clientPhone: order.client?.telefono,
    vehicle: {
      marca: order.vehicle?.marca,
      modelo: order.vehicle?.modelo,
      placa: order.vehicle?.placa,
      year: order.vehicle?.año,
      color: order.vehicle?.color,
    },
    orderId: order.id,
    status: order.status,
    totalUSD: order.totalUSD || 0,
    paidUSD: paid,
    balancePendingUSD: pending,
    exchangeRateVES: rate,
    services: (order.services || []).map(s => ({ name: s.name || 'Servicio', price: s.price || 0 })),
    parts: (order.parts || []).map(p => ({ name: p.name || 'Repuesto', quantity: p.quantity || 1, price: p.price || 0 })),
    trackingUrl: `${window.location.origin}/tracking/${order.id}`,
    workshopName: 'Rumilcar Taller Mecánico'
  };
};

export const handleWhatsAppShare = (order: WorkOrder) => {
  const phone = order.client?.telefono;
  const norm = normalizePhoneNumber(phone);
  
  if (!norm.valid) {
    alert(norm.reason || "El cliente no tiene un número de teléfono válido registrado.");
    return;
  }

  const context = getOrderWhatsAppContext(order);
  const tpl = order.status === 'Presupuesto' ? 'PRESUPUESTO' : (order.status === 'Listo' || order.status === 'Finalizado' ? 'VEHICULO_LISTO' : 'AVANCE');
  const message = buildWhatsAppMessage(tpl, context);

  openWhatsApp(norm.e164, message);
};

export const handlePrintOrder = (order: WorkOrder) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>Presupuesto - ${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #dc2626; }
          .meta-info { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .meta-block { background: #f9fafb; padding: 15px; border-radius: 8px; width: 45%; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; }
          .totals { width: 300px; float: right; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .grand-total { font-size: 20px; font-weight: bold; border-top: 2px solid #333; padding-top: 12px; margin-top: 12px; color: #dc2626; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Imprimir ahora</button>
        </div>
        
        <div class="header">
          <h1>Rumilcar Taller Mecánico</h1>
          <p>Presupuesto de Servicio / Orden ${order.id}</p>
          <p>Fecha: ${new Date(order.date).toLocaleDateString()}</p>
        </div>

        <div class="meta-info">
          <div class="meta-block">
            <strong>CLIENTE:</strong><br><br>
            ${order.client?.nombre} ${order.client?.apellido}<br>
            ${order.client?.documento}<br>
            Tel: ${order.client?.telefono || 'No registrado'}
          </div>
          <div class="meta-block">
            <strong>VEHÍCULO:</strong><br><br>
            ${order.vehicle?.marca} ${order.vehicle?.modelo}<br>
            Placa: ${order.vehicle?.placa}
          </div>
        </div>

        <h3>Servicios Realizados</h3>
        <table>
          <tr><th>Descripción</th><th style="text-align: right">Precio</th></tr>
          ${order.services.map(s => `<tr><td>${s.name || 'Servicio'}</td><td style="text-align: right">$${s.price?.toFixed(2) || '0.00'}</td></tr>`).join('')}
        </table>

        <h3>Repuestos e Insumos</h3>
        <table>
          <tr><th>Descripción</th><th>Cant.</th><th style="text-align: right">Total</th></tr>
          ${order.parts.map(p => `<tr><td>${p.name || 'Repuesto'}</td><td>${p.quantity}</td><td style="text-align: right">$${(p.price * p.quantity)?.toFixed(2) || '0.00'}</td></tr>`).join('')}
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>$${order.totalUSD?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="totals-row grand-total">
            <span>TOTAL A PAGAR:</span>
            <span>$${order.totalUSD?.toFixed(2) || '0.00'}</span>
          </div>
          <div style="margin-top: 10px; font-size: 12px; color: #666; text-align: right;">
            Equivalente VES segun tasa del dia.
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for resources to load before triggering print
  setTimeout(() => {
    printWindow.print();
  }, 250);
};