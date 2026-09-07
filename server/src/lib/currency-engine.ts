/**
 * Rumilcarapp — Centralized Multi-Currency Engine
 *
 * All price conversions flow through this module.
 * Rules:
 * 1. Prices stored in anchor currency (USD) in DB
 * 2. Each transaction captures an immutable rate snapshot
 * 3. Conversion: anchor_price * rate = local_price
 * 4. USDT spread: usd_price * (1 + spread/100) = usdt_price
 * 5. Mixed payments = N payment lines, each with own currency & rate
 */

export interface CurrencyConfig {
  anchorCurrency: string;
  vesRate: number;
  usdtSpread: number;
}

export interface RateSnapshot {
  vesRate: number;
  usdtSpread: number;
  anchorCurrency: string;
}

export class CurrencyEngine {
  private config: CurrencyConfig;

  constructor(config: CurrencyConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<CurrencyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Convert from anchor (USD) to VES */
  toVes(amountAnchor: number): number {
    if (!this.config.vesRate || this.config.vesRate <= 0) {
      throw new Error('Tasa VES no configurada');
    }
    return this.round(amountAnchor * this.config.vesRate);
  }

  /** Convert from anchor (USD) to USDT (with spread) */
  toUsdt(amountAnchor: number): number {
    return this.round(amountAnchor * (1 + this.config.usdtSpread / 100));
  }

  /** Convert from VES back to anchor (USD) */
  fromVes(amountVes: number): number {
    if (!this.config.vesRate || this.config.vesRate <= 0) {
      throw new Error('Tasa VES no configurada');
    }
    return this.round(amountVes / this.config.vesRate);
  }

  /** Convert from USDT back to anchor (USD) */
  fromUsdt(amountUsdt: number): number {
    return this.round(amountUsdt / (1 + this.config.usdtSpread / 100));
  }

  /** Convert any amount to anchor currency */
  toAnchor(amount: number, fromCurrency: string): number {
    switch (fromCurrency) {
      case 'USD': return amount;
      case 'VES': return this.fromVes(amount);
      case 'USDT': return this.fromUsdt(amount);
      default: return amount;
    }
  }

  /** Convert from anchor to any currency */
  fromAnchor(amountAnchor: number, toCurrency: string): number {
    switch (toCurrency) {
      case 'USD': return amountAnchor;
      case 'VES': return this.toVes(amountAnchor);
      case 'USDT': return this.toUsdt(amountAnchor);
      default: return amountAnchor;
    }
  }

  /** Capture current rates as immutable snapshot for transaction */
  captureSnapshot(): RateSnapshot {
    return {
      vesRate: this.config.vesRate,
      usdtSpread: this.config.usdtSpread,
      anchorCurrency: this.config.anchorCurrency,
    };
  }

  /** Convert using a historical snapshot (for reports/auditing) */
  convertWithSnapshot(
    amountAnchor: number,
    toCurrency: string,
    snapshot: RateSnapshot
  ): number {
    switch (toCurrency) {
      case 'USD': return amountAnchor;
      case 'VES': return this.round(amountAnchor * snapshot.vesRate);
      case 'USDT': return this.round(amountAnchor * (1 + snapshot.usdtSpread / 100));
      default: return amountAnchor;
    }
  }

  /** Validate mixed payment covers total */
  validateMixedPayment(
    totalAnchor: number,
    payments: Array<{ amount: number; currency: string }>,
    snapshot: RateSnapshot
  ): { isValid: boolean; totalPaidAnchor: number; difference: number } {
    let totalPaidAnchor = 0;

    for (const payment of payments) {
      switch (payment.currency) {
        case 'USD':
          totalPaidAnchor += payment.amount;
          break;
        case 'VES':
          totalPaidAnchor += payment.amount / snapshot.vesRate;
          break;
        case 'USDT':
          totalPaidAnchor += payment.amount / (1 + snapshot.usdtSpread / 100);
          break;
      }
    }

    totalPaidAnchor = this.round(totalPaidAnchor);
    const difference = this.round(totalAnchor - totalPaidAnchor);

    return {
      isValid: Math.abs(difference) < 0.01,
      totalPaidAnchor,
      difference,
    };
  }

  /** Format currency for display */
  format(amount: number, currency: string): string {
    const formatted = amount.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    switch (currency) {
      case 'USD': return `$${formatted}`;
      case 'VES': return `Bs ${formatted}`;
      case 'USDT': return `${formatted} USDT`;
      default: return formatted;
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}