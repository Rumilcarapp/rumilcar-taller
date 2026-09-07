import React, { useState, useRef, useEffect } from 'react';
import { Box, X } from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../../../store/useInventoryStore';
import './LineItems.css';

export interface PartLine {
  id: string;
  name: string;
  quantity: number;
  price: number;
  currency: 'USD' | 'VES';
  isManual: boolean;
}

interface Props {
  part: PartLine;
  onChange: (part: PartLine) => void;
  onRemove: () => void;
}

export const PartLineItem: React.FC<Props> = ({ part, onChange, onRemove }) => {
  const { items } = useInventoryStore();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeCatalog = items.filter(i => i.isActive && i.tipo === 'PRODUCTO');
  
  const filteredSuggestions = activeCatalog.filter(i => 
    i.nombre.toLowerCase().includes(part.name.toLowerCase()) ||
    (i.codigo && i.codigo.includes(part.name))
  );

  const handleSelectSuggestion = (inventoryItem: InventoryItem) => {
    onChange({
      ...part,
      name: inventoryItem.nombre,
      price: inventoryItem.precio,
      currency: inventoryItem.currency === 'USDT' ? 'USD' : inventoryItem.currency as any,
      isManual: false
    });
    setShowSuggestions(false);
  };

  const total = (part.quantity * part.price).toFixed(2);

  return (
    <div className="line-item">
      <div className="line-drag-handle" style={{ cursor: 'default' }}>
        <Box size={16} color="var(--color-text-muted)" />
      </div>
      <div className="line-content">
        <div className="line-header">
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }} ref={wrapperRef}>
             <input
               className="line-name-input"
               value={part.name}
               onChange={(e) => {
                 onChange({ ...part, name: e.target.value });
                 setShowSuggestions(true);
               }}
               onFocus={() => setShowSuggestions(true)}
               placeholder="Buscar repuesto en inventario..."
             />
             
             {showSuggestions && (filteredSuggestions.length > 0 || part.name) && (
               <div className="suggestions-dropdown" style={{ 
                 position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, 
                 background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
                 borderRadius: '6px', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                 maxHeight: '200px', overflowY: 'auto'
               }}>
                 {filteredSuggestions.map(s => (
                   <div 
                     key={s.id} 
                     className="suggestion-item"
                     onClick={() => handleSelectSuggestion(s)}
                     style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                   >
                     <div>
                       <div style={{ fontWeight: 500 }}>{s.nombre}</div>
                       <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Marca: {s.marca || 'S/M'} · Stock: {s.stock} uds</div>
                     </div>
                     <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                       ${s.precio.toFixed(2)}
                     </div>
                   </div>
                 ))}
                 {part.name && (
                   <div 
                     className="suggestion-item custom-service-item"
                     onClick={() => {
                       onChange({ ...part, isManual: true });
                       setShowSuggestions(false);
                     }}
                     style={{ padding: '10px 12px', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600, borderTop: filteredSuggestions.length > 0 ? '1px solid var(--color-border)' : 'none' }}
                   >
                     + Agregar como repuesto manual: "{part.name}"
                   </div>
                 )}
               </div>
             )}

             <div style={{ paddingLeft: '8px', marginTop: '4px' }}>
                <span className={part.isManual ? 'badge-manual' : 'badge-inventory'}>
                  {part.isManual ? 'Manual' : 'En inventario'}
                </span>
             </div>
          </div>
          
          <div className="part-quantity-group">
            <span>Cant:</span>
            <input
              type="number"
              className="part-qty-input"
              value={part.quantity || ''}
              onChange={(e) => onChange({ ...part, quantity: parseInt(e.target.value) || 1 })}
              min="1"
            />
          </div>

          <div className="line-price-group">
            <select
              className="line-currency-select"
              value={part.currency}
              onChange={(e) => onChange({ ...part, currency: e.target.value as 'USD' | 'VES' })}
            >
              <option value="USD">$</option>
              <option value="VES">Bs</option>
            </select>
            <input
              type="number"
              className="line-price-input"
              value={part.price || ''}
              onChange={(e) => onChange({ ...part, price: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="part-total">
             {part.currency === 'USD' ? '$' : 'Bs.'}{total}
          </div>

          <button className="line-remove-btn" onClick={onRemove} title="Eliminar repuesto">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};