import React, { useEffect, useState } from 'react';
import { ServiceLine } from './ServiceLineItem';
import { PartLine } from './PartLineItem';
import { Printer, Share2, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui';
import './OrderSummary.css';

interface Props {
  services: ServiceLine[];
  parts: PartLine[];
  onSaveOrder: (total: number) => void;
  onPrint?: (total: number) => void;
  onWhatsApp?: (total: number) => void;
  isBudget?: boolean;
  onConvertToOrder?: (total: number) => void;
}

export const OrderSummary: React.FC<Props> = ({ services, parts, onSaveOrder, onPrint, onWhatsApp, isBudget, onConvertToOrder }) => {
  const [bcvRate, setBcvRate] = useState<number>(40.00); // Fallback
  const [loadingRate, setLoadingRate] = useState(true);
  
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [applyIva, setApplyIva] = useState<boolean>(false);

  useEffect(() => {
    fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      .then(res => res.json())
      .then(data => {
        if (data && data.promedio) {
          setBcvRate(data.promedio);
        }
      })
      .catch(err => console.error("Error fetching BCV rate", err))
      .finally(() => setLoadingRate(false));
  }, []);

  // Convert everything to USD base for internal calc
  const calcSubtotalServicesUSD = () => {
    return services.reduce((acc, s) => {
      const p = s.currency === 'USD' ? s.price : s.price / bcvRate;
      return acc + p;
    }, 0);
  };

  const calcSubtotalPartsUSD = () => {
    return parts.reduce((acc, p) => {
      const price = p.currency === 'USD' ? p.price : p.price / bcvRate;
      return acc + (price * p.quantity);
    }, 0);
  };

  const subServices = calcSubtotalServicesUSD();
  const subParts = calcSubtotalPartsUSD();
  const subtotal = subServices + subParts;

  const discountVal = discountType === 'PERCENT' ? (subtotal * (discountAmount / 100)) : discountAmount;
  const afterDiscount = Math.max(0, subtotal - discountVal);
  
  const iva = applyIva ? (afterDiscount * 0.16) : 0;
  const totalUSD = afterDiscount + iva;
  const totalVES = totalUSD * bcvRate;

  return (
    <div className="order-summary-panel">
      <div className="summary-header">
        <h3>RESUMEN DE LA ORDEN</h3>
      </div>
      <div className="summary-body">
        
        <div className="summary-section">
          <h4>SERVICIOS</h4>
          {services.length === 0 && <span className="empty-text">Sin servicios</span>}
          {services.map(s => (
             <div key={s.id} className="summary-row">
               <span>{s.name || 'Servicio'}</span>
               <span>{s.currency === 'USD' ? '$' : 'Bs.'}{s.price.toFixed(2)}</span>
             </div>
          ))}
          <div className="summary-subtotal">
            <span>Subtotal servicios</span>
            <span>${subServices.toFixed(2)}</span>
          </div>
        </div>

        <div className="summary-section">
          <h4>REPUESTOS</h4>
          {parts.length === 0 && <span className="empty-text">Sin repuestos</span>}
          {parts.map(p => (
             <div key={p.id} className="summary-row">
               <span>{p.quantity}x {p.name || 'Repuesto'}</span>
               <span>{p.currency === 'USD' ? '$' : 'Bs.'}{(p.price * p.quantity).toFixed(2)}</span>
             </div>
          ))}
          <div className="summary-subtotal">
            <span>Subtotal repuestos</span>
            <span>${subParts.toFixed(2)}</span>
          </div>
        </div>

        <div className="summary-totals-box">
          <div className="summary-row strong">
            <span>SUBTOTAL</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          <div className="summary-row interactive-row">
            <span>Descuento</span>
            <div className="discount-input-group">
               <input 
                 type="number" 
                 value={discountAmount || ''} 
                 onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} 
                 min="0"
               />
               <select value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                 <option value="PERCENT">%</option>
                 <option value="FIXED">$</option>
               </select>
            </div>
            <span>-${discountVal.toFixed(2)}</span>
          </div>

          <div className="summary-row interactive-row">
            <span>IVA (16%)</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={applyIva} onChange={e => setApplyIva(e.target.checked)} />
              <span className="slider"></span>
            </label>
            <span>${iva.toFixed(2)}</span>
          </div>

          <div className="summary-grand-total">
            <span>TOTAL</span>
            <span>${totalUSD.toFixed(2)}</span>
          </div>
        </div>

        <div className="summary-equivalencia">
           <div className="eq-header">
             <span>Equivalencia</span>
             <span className="bcv-rate" title="Tasa BCV actual">
               {loadingRate ? 'Cargando BCV...' : `BCV: Bs.${bcvRate.toFixed(2)}`}
             </span>
           </div>
           <div className="eq-row">
             <span>VES</span>
             <span className="eq-ves">Bs. {totalVES.toFixed(2)}</span>
           </div>
           <div className="eq-row">
             <span>USDT</span>
             <span>${totalUSD.toFixed(2)}</span>
           </div>
        </div>

      </div>

      <div className="summary-actions">
        <Button variant="danger" icon={<CheckCircle size={18}/>} onClick={() => onSaveOrder(totalUSD)} className="btn-block">
          {isBudget ? 'GUARDAR PRESUPUESTO' : 'GUARDAR ORDEN'}
        </Button>
        {isBudget && onConvertToOrder && (
          <Button style={{ marginTop: '8px', background: 'var(--color-success)', color: 'white', borderColor: 'var(--color-success)' }} icon={<CheckCircle size={18}/>} onClick={() => onConvertToOrder(totalUSD)} className="btn-block">
            CONVERTIR A ORDEN
          </Button>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <Button variant="outline" icon={<Printer size={16}/>} className="btn-flex" onClick={() => onPrint && onPrint(totalUSD)}>Presupuesto</Button>
          <Button variant="outline" icon={<Share2 size={16}/>} className="btn-flex" onClick={() => onWhatsApp && onWhatsApp(totalUSD)}>WhatsApp</Button>
        </div>
      </div>
    </div>
  );
};