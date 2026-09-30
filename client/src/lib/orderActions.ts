import { WorkOrder } from '../store/useWorkOrderStore';
import { 
  normalizePhoneNumber, 
  buildWhatsAppMessage, 
  openWhatsApp, 
  WhatsAppContextData 
} from './whatsapp';
import { useCashStore } from '../store/useCashStore';
import { useWorkshopStore } from '../store/useWorkshopStore';
import { useAuthStore } from '../stores/authStore';

export const getOrderWhatsAppContext = (order: WorkOrder): WhatsAppContextData => {
  const rate = useCashStore.getState().exchangeRateVES || 0;
  const paid = (order.payments || []).reduce((acc, p) => acc + (p.amountUSD || 0), 0);
  const pending = Math.max(0, (order.totalUSD || 0) - paid);
  const workshop = useWorkshopStore.getState().workshop;
  const user = useAuthStore.getState().user;
  const currentWorkshopName = workshop?.name || user?.workshopName || 'Multiservicios Rumilcar';

  const workshopPM = workshop?.paymentDetails?.pagoMovil;
  const pagoMovilConfig = workshopPM && (workshopPM.banco || workshopPM.telefono) ? {
    banco: workshopPM.banco || 'Banesco (0134)',
    telefono: workshopPM.telefono || workshop.phone || '0414-1234567',
    cedulaRif: workshopPM.cedulaRif || workshop.taxId || 'J-12345678-0',
    titular: workshopPM.titular || workshop.name || 'Multiservicios Rumilcar',
  } : undefined;

  return {
    clientName: order.client?.nombre,
    clientPhone: order.client?.telefono,
    vehicle: {
      marca: order.vehicle?.marca,
      modelo: order.vehicle?.modelo,
      placa: order.vehicle?.placa,
      year: order.vehicle?.año || order.vehicle?.ano,
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
    workshopName: currentWorkshopName,
    pagoMovil: pagoMovilConfig,
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

  const workshop = useWorkshopStore.getState().workshop;
  const user = useAuthStore.getState().user;
  const workshopName = workshop?.name || user?.workshopName || 'Multiservicios Rumilcar';
  const workshopLegalName = workshop?.legalName || '';
  const workshopTaxId = workshop?.taxId || '';
  const workshopPhone = workshop?.phone || user?.phone || '';
  const workshopAddress = workshop?.address || '';
  const workshopEmail = workshop?.email || '';

  // Clean client info (prevent undefined)
  const clientFullName = [order.client?.nombre, order.client?.apellido].filter(Boolean).join(' ') || 'Cliente General';
  const clientDoc = order.client?.documento || '';
  const clientPhone = order.client?.telefono ? `Tel: ${order.client.telefono}` : 'Tel: No registrado';
  const clientAddress = order.client?.direccion ? `Dir: ${order.client.direccion}` : '';

  // Clean vehicle info (prevent undefined)
  const vehicleFullName = [order.vehicle?.marca, order.vehicle?.modelo].filter(Boolean).join(' ') || 'Vehículo no especificado';
  const vehiclePlate = order.vehicle?.placa ? `Placa: ${order.vehicle.placa}` : 'Placa: No registrada';
  const vehicleYear = order.vehicle?.año || order.vehicle?.ano ? `Año: ${order.vehicle.año || order.vehicle.ano}` : '';
  const vehicleColor = order.vehicle?.color ? `Color: ${order.vehicle.color}` : '';

  const docTitle = order.status === 'Presupuesto' ? 'Presupuesto de Servicio' : 'Factura / Nota de Entrega';
  const orderIdentifier = order.id ? `Orden #${order.id}` : 'Orden Borrador';
  const displayDate = order.date ? new Date(order.date).toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');

  const html = `
    <html>
      <head>
        <title>${docTitle} - ${order.id || 'Borrador'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1f2937; margin: 0; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #dc2626; font-size: 26px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header-sub { margin: 4px 0; color: #4b5563; font-size: 13px; }
          .header-meta { margin-top: 10px; font-size: 14px; font-weight: 700; color: #111827; }
          .meta-info { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px; }
          .meta-block { background: #f9fafb; padding: 16px; border-radius: 8px; width: 48%; border: 1px solid #e5e7eb; box-sizing: border-box; }
          .meta-title { font-weight: 800; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 8px; }
          .meta-name { font-weight: 700; font-size: 15px; color: #111827; margin-bottom: 4px; }
          .meta-detail { font-size: 13px; color: #4b5563; line-height: 1.4; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          th { background: #f3f4f6; font-weight: 700; color: #374151; }
          h3 { font-size: 14px; text-transform: uppercase; color: #374151; margin: 20px 0 8px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          .totals { width: 320px; float: right; margin-top: 10px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
          .grand-total { font-size: 18px; font-weight: 800; border-top: 2px solid #111827; padding-top: 10px; margin-top: 8px; color: #dc2626; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 22px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">Imprimir ahora</button>
        </div>
        
        <div class="header">
          <h1>${workshopName}</h1>
          ${workshopLegalName ? `<div class="header-sub" style="font-weight: 600;">${workshopLegalName}</div>` : ''}
          ${workshopTaxId ? `<div class="header-sub">RIF: ${workshopTaxId}</div>` : ''}
          ${[workshopPhone, workshopAddress, workshopEmail].filter(Boolean).length > 0 ? `
            <div class="header-sub">${[workshopPhone, workshopAddress, workshopEmail].filter(Boolean).join(' • ')}</div>
          ` : ''}
          <div class="header-meta">
            ${docTitle} / ${orderIdentifier}
          </div>
          <div class="header-sub" style="font-size: 12px;">Fecha de Emisión: ${displayDate}</div>
        </div>

        <div class="meta-info">
          <div class="meta-block">
            <div class="meta-title">DATOS DEL CLIENTE</div>
            <div class="meta-name">${clientFullName}</div>
            ${clientDoc ? `<div class="meta-detail"><strong>Documento:</strong> ${clientDoc}</div>` : ''}
            <div class="meta-detail">${clientPhone}</div>
            ${clientAddress ? `<div class="meta-detail">${clientAddress}</div>` : ''}
          </div>
          <div class="meta-block">
            <div class="meta-title">DATOS DEL VEHÍCULO</div>
            <div class="meta-name">${vehicleFullName}</div>
            <div class="meta-detail"><strong>${vehiclePlate}</strong></div>
            ${[vehicleYear, vehicleColor].filter(Boolean).length > 0 ? `
              <div class="meta-detail">${[vehicleYear, vehicleColor].filter(Boolean).join(' | ')}</div>
            ` : ''}
          </div>
        </div>

        <h3>Servicios Realizados</h3>
        <table>
          <tr><th>Descripción</th><th style="text-align: right; width: 120px;">Precio</th></tr>
          ${(order.services && order.services.length > 0) ? order.services.map(s => `<tr><td>${s.name || 'Servicio'}</td><td style="text-align: right">$${(s.price || 0).toFixed(2)}</td></tr>`).join('') : '<tr><td colspan="2" style="color: #9ca3af; text-align: center;">Sin servicios especificados</td></tr>'}
        </table>

        <h3>Repuestos e Insumos</h3>
        <table>
          <tr><th>Descripción</th><th style="width: 70px;">Cant.</th><th style="text-align: right; width: 120px;">Total</th></tr>
          ${(order.parts && order.parts.length > 0) ? order.parts.map(p => `<tr><td>${p.name || 'Repuesto'}</td><td>${p.quantity || 1}</td><td style="text-align: right">$${((p.price || 0) * (p.quantity || 1)).toFixed(2)}</td></tr>`).join('') : '<tr><td colspan="3" style="color: #9ca3af; text-align: center;">Sin repuestos adicionales</td></tr>'}
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>$${(order.totalUSD || 0).toFixed(2)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>TOTAL A PAGAR:</span>
            <span>$${(order.totalUSD || 0).toFixed(2)} USD</span>
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #6b7280; text-align: right;">
            Equivalente en Bolívares (VES) a tasa oficial del día.
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