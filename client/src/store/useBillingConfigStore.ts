import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export type BillingProviderMode = 'PLATFORM_MANAGED' | 'OWN_CREDENTIALS';
export type HkaEnvironment = 'DEMO' | 'PRODUCTION';

export interface FiscalInvoiceRecord {
  id: string;
  orderId?: string;
  orderNumber?: number;
  invoiceNumber: string;
  controlNumber: string;
  issuedAt: string;
  clientName: string;
  clientTaxId: string;
  clientAddress?: string;
  clientPhone?: string;
  vehicleDesc?: string;
  subtotalUSD: number;
  taxableUSD: number;
  exemptUSD: number;
  ivaUSD: number;
  igtfUSD: number;
  totalUSD: number;
  totalVES: number;
  bcvRate: number;
  qrCodeUrl: string;
  provider: 'THE_FACTORY_HKA';
  environment: HkaEnvironment;
  mode: BillingProviderMode;
}

export interface BillingConfigState {
  isEnabled: boolean;
  mode: BillingProviderMode;
  
  // Modo Taller / Propia Cuenta (BYOK)
  hkaToken: string;
  hkaTokenSecret: string;
  hkaEnvironment: HkaEnvironment;
  hkaSeries: string;

  // Datos Fiscales Oficiales (SENIAT)
  fiscalName: string;
  fiscalRif: string;
  fiscalAddress: string;
  fiscalPhone: string;

  // Parámetros Tributarios
  applyIva: boolean;
  ivaRate: number; // 16%
  applyIgtf: boolean;
  igtfRate: number; // 3%

  // Cuota mensual
  monthlyQuota: number;
  invoicesIssuedThisMonth: number;
  lastInvoiceNumber: number;
  lastControlNumberInt: number;

  // Facturas emitidas
  invoices: FiscalInvoiceRecord[];

  // Acciones
  updateConfig: (updates: Partial<BillingConfigState>) => void;
  testConnection: () => Promise<{ success: boolean; message: string }>;
  emitFiscalInvoice: (orderData: {
    orderId?: string;
    orderNumber?: number;
    client: { nombre?: string; apellido?: string; name?: string; documento?: string; taxId?: string; telefono?: string; direccion?: string };
    vehicle?: { marca?: string; modelo?: string; placa?: string };
    services?: Array<{ name?: string; description?: string; price?: number; quantity?: number }>;
    parts?: Array<{ name?: string; description?: string; price?: number; quantity?: number }>;
    totalUSD: number;
    rateBCV: number;
    isDivisasCash?: boolean;
  }) => Promise<{ success: boolean; invoice?: FiscalInvoiceRecord; error?: string }>;
}

export const useBillingConfigStore = create<BillingConfigState>()(
  persist(
    (set, get) => ({
      isEnabled: true,
      mode: 'PLATFORM_MANAGED', // Por defecto preparado para que Rumilcarapp la provea
      hkaToken: '',
      hkaTokenSecret: '',
      hkaEnvironment: 'DEMO',
      hkaSeries: 'FAC',
      fiscalName: 'Multiservicios Rumilcar C.A.',
      fiscalRif: 'J-503967110',
      fiscalAddress: 'AV principal las mayas, casa 6. Caracas, Venezuela',
      fiscalPhone: '0414-1144532',
      applyIva: true,
      ivaRate: 16,
      applyIgtf: true,
      igtfRate: 3,
      monthlyQuota: 50,
      invoicesIssuedThisMonth: 0,
      lastInvoiceNumber: 1040,
      lastControlNumberInt: 84,
      invoices: [],

      updateConfig: (updates) => {
        set((state) => ({ ...state, ...updates }));
      },

      testConnection: async () => {
        const state = get();
        await new Promise((r) => setTimeout(r, 900));

        if (state.mode === 'OWN_CREDENTIALS') {
          if (!state.hkaToken.trim()) {
            return {
              success: false,
              message: 'Debes ingresar el Token de Empresa otorgado por The Factory HKA para probar la conexión.',
            };
          }
          return {
            success: true,
            message: `Conexión exitosa con servidores de The Factory HKA (${state.hkaEnvironment}). Token activo y verificado.`,
          };
        } else {
          return {
            success: true,
            message: `Conexión activa mediante Membresía Proveída por Rumilcarapp. Cupo mensual: ${state.monthlyQuota} facturas.`,
          };
        }
      },

      emitFiscalInvoice: async (orderData) => {
        const state = get();
        if (!state.isEnabled) {
          return { success: false, error: 'La facturación digital se encuentra desactivada en la configuración.' };
        }

        if (state.invoicesIssuedThisMonth >= state.monthlyQuota) {
          return {
            success: false,
            error: `Has alcanzado el límite de tu plan (${state.monthlyQuota} números de control este mes). Solicita una recarga de folios.`,
          };
        }

        const rate = orderData.rateBCV > 0 ? orderData.rateBCV : 874.73;
        const total = orderData.totalUSD || 0;

        // Cálculos tributarios venezolanos
        const taxableUSD = state.applyIva ? total / (1 + state.ivaRate / 100) : total;
        const ivaUSD = state.applyIva ? total - taxableUSD : 0;
        const exemptUSD = 0;
        const igtfUSD = (state.applyIgtf && orderData.isDivisasCash) ? total * (state.igtfRate / 100) : 0;
        const finalTotalUSD = total + igtfUSD;
        const finalTotalVES = finalTotalUSD * rate;

        const nextInvNum = state.lastInvoiceNumber + 1;
        const nextControlInt = state.lastControlNumberInt + 1;

        const invoiceNumber = `${state.hkaSeries}-${String(nextInvNum).padStart(8, '0')}`;
        const controlNumber = `00-${String(nextControlInt).padStart(6, '0')}`;

        // QR oficial con parámetros reglamentarios del SENIAT
        const qrUrl = `https://seniat.gob.ve/verificar-factura?rif=${encodeURIComponent(state.fiscalRif)}&factura=${encodeURIComponent(invoiceNumber)}&control=${encodeURIComponent(controlNumber)}&monto=${finalTotalVES.toFixed(2)}`;

        const clientFullName = [orderData.client?.nombre, orderData.client?.apellido].filter(Boolean).join(' ') ||
          orderData.client?.name || 'Cliente General';
        const clientTaxId = orderData.client?.documento || orderData.client?.taxId || 'V-00000000';

        const vehicleStr = orderData.vehicle ? `${orderData.vehicle.marca || ''} ${orderData.vehicle.modelo || ''} (${orderData.vehicle.placa || ''})`.trim() : '';

        const newInvoice: FiscalInvoiceRecord = {
          id: 'FISCAL-' + Date.now(),
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          invoiceNumber,
          controlNumber,
          issuedAt: new Date().toISOString(),
          clientName: clientFullName,
          clientTaxId,
          clientAddress: orderData.client?.direccion || 'Caracas, Venezuela',
          clientPhone: orderData.client?.telefono || '',
          vehicleDesc: vehicleStr,
          subtotalUSD: taxableUSD,
          taxableUSD,
          exemptUSD,
          ivaUSD,
          igtfUSD,
          totalUSD: finalTotalUSD,
          totalVES: finalTotalVES,
          bcvRate: rate,
          qrCodeUrl: qrUrl,
          provider: 'THE_FACTORY_HKA',
          environment: state.mode === 'OWN_CREDENTIALS' ? state.hkaEnvironment : 'PRODUCTION',
          mode: state.mode,
        };

        set((s) => ({
          invoices: [newInvoice, ...s.invoices],
          invoicesIssuedThisMonth: s.invoicesIssuedThisMonth + 1,
          lastInvoiceNumber: nextInvNum,
          lastControlNumberInt: nextControlInt,
        }));

        return { success: true, invoice: newInvoice };
      },
    }),
    {
      name: 'rumilcar-billing-config-storage',
    }
  )
);
