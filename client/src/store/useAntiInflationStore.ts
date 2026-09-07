import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCashStore } from './useCashStore';

export interface TasaCambio {
  id: string;
  fecha: string; // YYYY-MM-DD
  tasa_ves_usd: number;
  fuente: 'manual' | 'api_automatica';
  created_at: string;
}

export interface SaldoVES {
  monto_ves: number;
  valor_usd_ingreso: number;
  tasa_ingreso: number;
  fecha_ingreso: string; // YYYY-MM-DD
}

export interface Conversion {
  id: string;
  fecha: string; // YYYY-MM-DD
  monto_ves: number;
  tasa_usada: number;
  usdt_bruto: number;
  comision_porcentaje: number;
  usdt_neto: number;
  plataforma: 'binance_p2p' | 'reserve' | 'airtm' | 'efectivo' | 'otro';
  plataforma_personalizada?: string;
  notas?: string;
  created_at: string;
}

export interface AlertaDevaluacion {
  umbral_porcentaje: number; // default 3%
  umbral_dias: number; // default 3
  proyeccion_subida_diaria: number; // default 0.5%
  canal_notificacion: 'inapp' | 'email' | 'whatsapp';
  activa: boolean;
}

export interface CalculoPerdidaResult {
  valorOriginalUSD: number;
  valorActualUSD: number;
  perdidaUSD: number;
  perdidaPorcentaje: number;
  diasTranscurridos: number;
  urgencia: 'verde' | 'amarillo' | 'naranja' | 'rojo';
}

export interface ProyeccionPerdidaResult {
  tasaProyectada: number;
  valorProyectadoUSD: number;
  perdidaAdicionalUSD: number;
}

interface AntiInflationState {
  saldoVES: SaldoVES;
  tasasHistorial: TasaCambio[];
  conversiones: Conversion[];
  alertaConfig: AlertaDevaluacion;
  ultimaTasaVES: number;

  // Acciones
  actualizarSaldoVES: (nuevoMontoVES: number, tasaMomento?: number, fechaIngreso?: string) => void;
  incrementarSaldoVES: (montoVESAdicional: number, tasaMomento: number) => void;
  actualizarTasaHoy: (tasa: number, fuente?: 'manual' | 'api_automatica') => void;
  registrarConversion: (conversion: Omit<Conversion, 'id' | 'created_at'>) => { ok: boolean; message: string; conversion?: Conversion };
  actualizarConfigAlerta: (config: Partial<AlertaDevaluacion>) => void;
  obtenerCalculoPerdida: () => CalculoPerdidaResult;
  proyectarPerdidaFutura: (diasFuturos?: number) => ProyeccionPerdidaResult;
  obtenerTasaAyer: () => number;
}

// Generador de historial inicial de 15 días con devaluación progresiva realista para Venezuela
const getInitialRates = (): TasaCambio[] => {
  const baseRate = 97.80;
  const rates: TasaCambio[] = [];
  const today = new Date();

  // Historial de 15 días hacia atrás, desde ~89.20 hasta 97.80
  const dailyProgression = [
    89.20, 89.80, 90.40, 91.10, 91.70, 
    92.40, 92.90, 93.50, 94.20, 94.80, 
    95.50, 96.10, 96.70, 97.20, 97.80
  ];

  for (let i = 14; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const rateVal = dailyProgression[14 - i] || baseRate;
    rates.push({
      id: `RATE-${dateStr}`,
      fecha: dateStr,
      tasa_ves_usd: rateVal,
      fuente: i === 0 ? 'manual' : 'api_automatica',
      created_at: d.toISOString(),
    });
  }
  return rates;
};

// Conversiones históricas de demostración
const getInitialConversions = (): Conversion[] => {
  const d1 = new Date();
  d1.setDate(d1.getDate() - 8);
  const d2 = new Date();
  d2.setDate(d2.getDate() - 15);

  return [
    {
      id: 'CONV-1002',
      fecha: d1.toISOString().split('T')[0],
      monto_ves: 28600,
      tasa_usada: 94.20,
      usdt_bruto: 303.61,
      comision_porcentaje: 0,
      usdt_neto: 303.61,
      plataforma: 'efectivo',
      notas: 'Cambio con proveedor de repuestos en efectivo USD',
      created_at: d1.toISOString(),
    },
    {
      id: 'CONV-1001',
      fecha: d2.toISOString().split('T')[0],
      monto_ves: 42000,
      tasa_usada: 90.40,
      usdt_bruto: 464.60,
      comision_porcentaje: 1.5,
      usdt_neto: 457.63,
      plataforma: 'reserve',
      notas: 'Conversión por Pago Móvil a Reserve app',
      created_at: d2.toISOString(),
    }
  ];
};

export const useAntiInflationStore = create<AntiInflationState>()(
  persist(
    (set, get) => ({
      saldoVES: {
        monto_ves: 45200,
        valor_usd_ingreso: 489.18,
        tasa_ingreso: 92.40,
        fecha_ingreso: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 5);
          return d.toISOString().split('T')[0];
        })(),
      },
      tasasHistorial: getInitialRates(),
      conversiones: getInitialConversions(),
      alertaConfig: {
        umbral_porcentaje: 3,
        umbral_dias: 3,
        proyeccion_subida_diaria: 0.5,
        canal_notificacion: 'inapp',
        activa: true,
      },
      ultimaTasaVES: 97.80,

      actualizarSaldoVES: (nuevoMontoVES, tasaMomento, fechaIngreso) => {
        const state = get();
        const tasa = tasaMomento || state.ultimaTasaVES;
        const fecha = fechaIngreso || new Date().toISOString().split('T')[0];
        const valorUSD = nuevoMontoVES > 0 ? Number((nuevoMontoVES / tasa).toFixed(2)) : 0;

        set({
          saldoVES: {
            monto_ves: Math.max(0, nuevoMontoVES),
            valor_usd_ingreso: valorUSD,
            tasa_ingreso: tasa,
            fecha_ingreso: fecha,
          }
        });
      },

      incrementarSaldoVES: (montoVESAdicional, tasaMomento) => {
        const state = get();
        const saldoPrev = state.saldoVES;
        const nuevoMonto = saldoPrev.monto_ves + montoVESAdicional;
        const tasa = tasaMomento || state.ultimaTasaVES;
        const valorUSDAdicional = montoVESAdicional / tasa;
        const nuevoValorUSDTotal = saldoPrev.valor_usd_ingreso + valorUSDAdicional;
        const nuevaTasaPonderada = nuevoMonto > 0 ? Number((nuevoMonto / nuevoValorUSDTotal).toFixed(2)) : tasa;

        set({
          saldoVES: {
            monto_ves: nuevoMonto,
            valor_usd_ingreso: Number(nuevoValorUSDTotal.toFixed(2)),
            tasa_ingreso: nuevaTasaPonderada,
            fecha_ingreso: saldoPrev.monto_ves > 0 ? saldoPrev.fecha_ingreso : new Date().toISOString().split('T')[0],
          }
        });
      },

      actualizarTasaHoy: (tasa, fuente = 'manual') => {
        const todayStr = new Date().toISOString().split('T')[0];
        const state = get();

        const existingIdx = state.tasasHistorial.findIndex((t) => t.fecha === todayStr);
        let updatedHist = [...state.tasasHistorial];

        if (existingIdx >= 0) {
          updatedHist[existingIdx] = {
            ...updatedHist[existingIdx],
            tasa_ves_usd: tasa,
            fuente,
          };
        } else {
          updatedHist.push({
            id: `RATE-${todayStr}`,
            fecha: todayStr,
            tasa_ves_usd: tasa,
            fuente,
            created_at: new Date().toISOString(),
          });
          updatedHist.sort((a, b) => a.fecha.localeCompare(b.fecha));
        }

        set({
          ultimaTasaVES: tasa,
          tasasHistorial: updatedHist,
        });

        try {
          useCashStore.getState().setExchangeRateVES(tasa);
        } catch (e) {
          console.error('Error sincronizando tasa con useCashStore:', e);
        }
      },

      registrarConversion: (conversionData) => {
        const state = get();
        const saldo = state.saldoVES;

        if (conversionData.monto_ves <= 0) {
          return { ok: false, message: 'El monto en bolívares debe ser mayor a 0.' };
        }

        if (conversionData.monto_ves > saldo.monto_ves) {
          return {
            ok: false,
            message: `El monto a convertir (Bs. ${conversionData.monto_ves.toLocaleString('es-VE')}) supera el saldo disponible (Bs. ${saldo.monto_ves.toLocaleString('es-VE')}).`,
          };
        }

        const newId = `CONV-${Date.now().toString().slice(-4)}`;
        const nuevaConversion: Conversion = {
          ...conversionData,
          id: newId,
          created_at: new Date().toISOString(),
        };

        const saldoRestanteVES = Math.max(0, saldo.monto_ves - conversionData.monto_ves);
        let nuevoValorUSDIngreso = 0;
        let nuevaTasaIngreso = saldo.tasa_ingreso;
        let nuevaFechaIngreso = saldo.fecha_ingreso;

        if (saldoRestanteVES > 0) {
          nuevoValorUSDIngreso = Number((saldoRestanteVES / saldo.tasa_ingreso).toFixed(2));
        } else {
          nuevoValorUSDIngreso = 0;
          nuevaTasaIngreso = state.ultimaTasaVES;
          nuevaFechaIngreso = new Date().toISOString().split('T')[0];
        }

        try {
          const cashStore = useCashStore.getState();
          cashStore.addTransaction(
            'egreso',
            Number((conversionData.monto_ves / conversionData.tasa_usada).toFixed(2)),
            'Pago Movil',
            `Conversión antiinflación: Bs. ${conversionData.monto_ves.toLocaleString('es-VE')} → ${conversionData.usdt_neto} USDT (${conversionData.plataforma.toUpperCase()})`,
            {
              montoVES: conversionData.monto_ves,
              tasaCambio: conversionData.tasa_usada,
              referencia: conversionData.notas || newId,
            }
          );

          cashStore.addTransaction(
            'ingreso',
            conversionData.usdt_neto,
            'USDT',
            `Recepción conversión antiinflación: ${conversionData.usdt_neto} USDT recibidos vía ${conversionData.plataforma.toUpperCase()}`,
            {
              tasaCambio: conversionData.tasa_usada,
              referencia: conversionData.notas || newId,
            }
          );
        } catch (e) {
          console.error('Error reflejando conversión en useCashStore:', e);
        }

        set({
          saldoVES: {
            monto_ves: saldoRestanteVES,
            valor_usd_ingreso: nuevoValorUSDIngreso,
            tasa_ingreso: nuevaTasaIngreso,
            fecha_ingreso: nuevaFechaIngreso,
          },
          conversiones: [nuevaConversion, ...state.conversiones],
        });

        return {
          ok: true,
          message: `✓ Conversión registrada. Obtuviste ${conversionData.usdt_neto.toFixed(2)} USDT a tasa Bs. ${conversionData.tasa_usada.toFixed(2)}`,
          conversion: nuevaConversion,
        };
      },

      actualizarConfigAlerta: (config) => {
        set((state) => ({
          alertaConfig: {
            ...state.alertaConfig,
            ...config,
          },
        }));
      },

      obtenerCalculoPerdida: () => {
        const state = get();
        const saldo = state.saldoVES;
        const tasaActual = state.ultimaTasaVES || 97.80;

        if (saldo.monto_ves <= 0) {
          return {
            valorOriginalUSD: 0,
            valorActualUSD: 0,
            perdidaUSD: 0,
            perdidaPorcentaje: 0,
            diasTranscurridos: 0,
            urgencia: 'verde',
          };
        }

        const tasaIngreso = saldo.tasa_ingreso > 0 ? saldo.tasa_ingreso : tasaActual;
        const valorOriginalUSD = Number((saldo.monto_ves / tasaIngreso).toFixed(2));
        const valorActualUSD = Number((saldo.monto_ves / tasaActual).toFixed(2));
        const perdidaUSD = Number(Math.max(0, valorOriginalUSD - valorActualUSD).toFixed(2));
        const perdidaPorcentaje = valorOriginalUSD > 0
          ? Number(((perdidaUSD / valorOriginalUSD) * 100).toFixed(2))
          : 0;

        const fechaIngresoDate = new Date(saldo.fecha_ingreso);
        const hoyDate = new Date();
        const diffTime = Math.max(0, hoyDate.getTime() - fechaIngresoDate.getTime());
        const diasTranscurridos = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        let urgencia: 'verde' | 'amarillo' | 'naranja' | 'rojo' = 'verde';
        if (saldo.monto_ves > 0) {
          if (perdidaPorcentaje > 10) urgencia = 'rojo';
          else if (perdidaPorcentaje >= 5) urgencia = 'naranja';
          else if (perdidaPorcentaje >= 1) urgencia = 'amarillo';
          else urgencia = 'verde';
        }

        return {
          valorOriginalUSD,
          valorActualUSD,
          perdidaUSD,
          perdidaPorcentaje,
          diasTranscurridos,
          urgencia,
        };
      },

      proyectarPerdidaFutura: (diasFuturos = 30) => {
        const state = get();
        const saldo = state.saldoVES;
        const tasaActual = state.ultimaTasaVES || 97.80;
        const subidaDiaria = state.alertaConfig.proyeccion_subida_diaria || 0.5;

        if (saldo.monto_ves <= 0) {
          return {
            tasaProyectada: tasaActual,
            valorProyectadoUSD: 0,
            perdidaAdicionalUSD: 0,
          };
        }

        const factor = Math.pow(1 + subidaDiaria / 100, diasFuturos);
        const tasaProyectada = Number((tasaActual * factor).toFixed(2));
        const valorActualUSD = saldo.monto_ves / tasaActual;
        const valorProyectadoUSD = Number((saldo.monto_ves / tasaProyectada).toFixed(2));
        const perdidaAdicionalUSD = Number(Math.max(0, valorActualUSD - valorProyectadoUSD).toFixed(2));

        return {
          tasaProyectada,
          valorProyectadoUSD,
          perdidaAdicionalUSD,
        };
      },

      obtenerTasaAyer: () => {
        const state = get();
        const hist = state.tasasHistorial;
        if (hist.length >= 2) {
          return hist[hist.length - 2].tasa_ves_usd;
        }
        return state.ultimaTasaVES;
      },
    }),
    {
      name: 'rumilcar-anti-inflation-storage',
    }
  )
);
