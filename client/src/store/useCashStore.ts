import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PaymentMethod = 'Efectivo' | 'Pago Movil' | 'Transferencia' | 'Zelle' | 'USDT' | 'Punto de Venta';

export interface CashTransaction {
  id: string;
  tipo: 'ingreso' | 'egreso';
  montoUSD: number;
  montoVES?: number;
  tasaCambio?: number;
  metodo: PaymentMethod;
  referencia?: string;
  descripcion: string;
  fecha: string;
  orderId?: string;
}

export interface BalancesSummary {
  efectivoUSD: number;
  pagoMovilUSD: number;
  pagoMovilVES: number;
  transferenciaUSD: number;
  zelleUSD: number;
  usdtUSD: number;
  puntoVentaUSD: number;
  totalUSD: number;
}

export interface CierreCajaRegistro {
  id: string;
  openedAt: string;
  closedAt: string;
  openingBalanceUSD: number;
  closingBalanceUSD: number;
  expectedBalances: BalancesSummary;
  reportedBalances: Record<PaymentMethod, number>;
  differencesUSD: Record<PaymentMethod, number>;
  totalDifferenceUSD: number;
  notes?: string;
}

interface CashState {
  isOpened: boolean;
  openedAt: string | null;
  openingBalanceUSD: number;
  currentBalanceUSD: number;
  transactions: CashTransaction[];
  exchangeRateVES: number;
  closureHistory: CierreCajaRegistro[];
  setExchangeRateVES: (rate: number) => void;
  openBox: (initialBalance: number) => void;
  closeBox: () => void;
  closeBoxWithAudit: (reportedBalances: Record<PaymentMethod, number>, notes?: string) => CierreCajaRegistro;
  addTransaction: (
    tipo: 'ingreso' | 'egreso',
    montoUSD: number,
    metodo: PaymentMethod,
    descripcion: string,
    options?: {
      montoVES?: number;
      tasaCambio?: number;
      referencia?: string;
      orderId?: string;
    }
  ) => void;
  getBalances: () => BalancesSummary;
}

export const useCashStore = create<CashState>()(
  persist(
    (set, get) => ({
      isOpened: false,
      openedAt: null,
      openingBalanceUSD: 0,
      currentBalanceUSD: 0,
      transactions: [],
      exchangeRateVES: 40.00,
      closureHistory: [],
      setExchangeRateVES: (rate) => set({ exchangeRateVES: rate }),
      openBox: (initialBalance) => set({
        isOpened: true,
        openedAt: new Date().toISOString(),
        openingBalanceUSD: initialBalance,
        currentBalanceUSD: initialBalance,
        transactions: [
          {
            id: 'TX-' + Date.now().toString().slice(-6),
            tipo: 'ingreso',
            montoUSD: initialBalance,
            metodo: 'Efectivo',
            descripcion: 'Apertura de caja registradora inicial (Efectivo en gaveta)',
            fecha: new Date().toISOString()
          }
        ]
      }),
      closeBox: () => set(() => ({
        isOpened: false,
        openedAt: null,
        openingBalanceUSD: 0,
        currentBalanceUSD: 0,
        transactions: []
      })),
      closeBoxWithAudit: (reportedBalances, notes) => {
        const state = get();
        const expected = state.getBalances();

        const differencesUSD: Record<PaymentMethod, number> = {
          'Efectivo': (reportedBalances['Efectivo'] || 0) - expected.efectivoUSD,
          'Pago Movil': (reportedBalances['Pago Movil'] || 0) - expected.pagoMovilUSD,
          'Transferencia': (reportedBalances['Transferencia'] || 0) - expected.transferenciaUSD,
          'Zelle': (reportedBalances['Zelle'] || 0) - expected.zelleUSD,
          'USDT': (reportedBalances['USDT'] || 0) - expected.usdtUSD,
          'Punto de Venta': (reportedBalances['Punto de Venta'] || 0) - expected.puntoVentaUSD,
        };

        const totalDiffUSD = Object.values(differencesUSD).reduce((acc, v) => acc + v, 0);

        const closureRecord: CierreCajaRegistro = {
          id: 'CIERRE-' + Date.now().toString().slice(-6),
          openedAt: state.openedAt || new Date().toISOString(),
          closedAt: new Date().toISOString(),
          openingBalanceUSD: state.openingBalanceUSD,
          closingBalanceUSD: expected.totalUSD,
          expectedBalances: expected,
          reportedBalances,
          differencesUSD,
          totalDifferenceUSD: totalDiffUSD,
          notes
        };

        set({
          isOpened: false,
          openedAt: null,
          openingBalanceUSD: 0,
          currentBalanceUSD: 0,
          transactions: [],
          closureHistory: [closureRecord, ...state.closureHistory]
        });

        return closureRecord;
      },
      addTransaction: (tipo, montoUSD, metodo, descripcion, options = {}) => set((state) => {
        if (!state.isOpened) {
          return state;
        }
        const delta = tipo === 'ingreso' ? montoUSD : -montoUSD;
        const newTx: CashTransaction = {
          id: 'TX-' + Date.now().toString().slice(-6),
          tipo,
          montoUSD,
          montoVES: options.montoVES,
          tasaCambio: options.tasaCambio || state.exchangeRateVES,
          metodo,
          referencia: options.referencia,
          descripcion,
          fecha: new Date().toISOString(),
          orderId: options.orderId
        };
        return {
          currentBalanceUSD: Math.max(0, state.currentBalanceUSD + delta),
          transactions: [newTx, ...state.transactions]
        };
      }),
      getBalances: () => {
        const state = get();
        let efectivoUSD = 0;
        let pagoMovilUSD = 0;
        let pagoMovilVES = 0;
        let transferenciaUSD = 0;
        let zelleUSD = 0;
        let usdtUSD = 0;
        let puntoVentaUSD = 0;

        state.transactions.forEach(tx => {
          const factor = tx.tipo === 'ingreso' ? 1 : -1;
          const amt = tx.montoUSD * factor;
          const amtVES = (tx.montoVES || (tx.montoUSD * (tx.tasaCambio || state.exchangeRateVES))) * factor;

          switch (tx.metodo) {
            case 'Efectivo':
              efectivoUSD += amt;
              break;
            case 'Pago Movil':
              pagoMovilUSD += amt;
              pagoMovilVES += amtVES;
              break;
            case 'Transferencia':
              transferenciaUSD += amt;
              break;
            case 'Zelle':
              zelleUSD += amt;
              break;
            case 'USDT':
              usdtUSD += amt;
              break;
            case 'Punto de Venta':
              puntoVentaUSD += amt;
              pagoMovilVES += amtVES;
              break;
            default:
              efectivoUSD += amt;
          }
        });

        const totalUSD = efectivoUSD + pagoMovilUSD + transferenciaUSD + zelleUSD + usdtUSD + puntoVentaUSD;

        return {
          efectivoUSD: Math.max(0, efectivoUSD),
          pagoMovilUSD: Math.max(0, pagoMovilUSD),
          pagoMovilVES: Math.max(0, pagoMovilVES),
          transferenciaUSD: Math.max(0, transferenciaUSD),
          zelleUSD: Math.max(0, zelleUSD),
          usdtUSD: Math.max(0, usdtUSD),
          puntoVentaUSD: Math.max(0, puntoVentaUSD),
          totalUSD: Math.max(0, totalUSD)
        };
      }
    }),
    {
      name: 'rumilcar-cash-register-storage'
    }
  )
);