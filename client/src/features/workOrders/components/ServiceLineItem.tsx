import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, X, Search } from 'lucide-react';
import { useInventoryStore, InventoryItem } from '../../../store/useInventoryStore';
import './LineItems.css';

export interface ServiceLine {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'USD' | 'VES';
}

interface Props {
  service: ServiceLine;
  onChange: (service: ServiceLine) => void;
  onRemove: () => void;
}

export const ServiceLineItem: React.FC<Props> = ({ service, onChange, onRemove }) => {
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

  const activeCatalog = items.filter(s => s.isActive && s.tipo === 'SERVICIO');
  
  const filteredSuggestions = activeCatalog.filter(s => 
    s.nombre.toLowerCase().includes(service.name.toLowerCase())
  );

  const handleSelectSuggestion = (catService: InventoryItem) => {
    onChange({
      ...service,
      name: catService.nombre,
      description: catService.descripcion || '',
      price: catService.precio,
      currency: catService.currency === 'USDT' ? 'USD' : catService.currency as any
    });
    setShowSuggestions(false);
  };

  return (
    <div className="line-item">
      <div className="line-drag-handle">
        <GripVertical size={16} />
      </div>
      <div className="line-content">
        <div className="line-header">
          
          <div className="line-name-wrapper" ref={wrapperRef} style={{ position: 'relative', flex: 1 }}>
            <input
              className="line-name-input"
              value={service.name}
              onChange={(e) => {
                onChange({ ...service, name: e.target.value });
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Escribe para buscar un servicio o ingresa uno manual..."
              autoFocus={service.name === ''}
            />
            {showSuggestions && (filteredSuggestions.length > 0 || service.name) && (
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
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.descripcion?.substring(0, 50) || 'Sin descripción'}</div>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {s.currency === 'USD' || s.currency === 'USDT' ? '$' : 'Bs'}{s.precio.toFixed(2)}
                    </div>
                  </div>
                ))}
                {service.name && (
                  <div 
                    className="suggestion-item custom-service-item"
                    onClick={() => setShowSuggestions(false)}
                    style={{ padding: '10px 12px', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600, borderTop: filteredSuggestions.length > 0 ? '1px solid var(--color-border)' : 'none' }}
                  >
                    + Agregar como servicio personalizado: "{service.name}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="line-price-group">
            <select
              className="line-currency-select"
              value={service.currency}
              onChange={(e) => onChange({ ...service, currency: e.target.value as 'USD' | 'VES' })}
            >
              <option value="USD">$</option>
              <option value="VES">Bs</option>
            </select>
            <input
              type="number"
              className="line-price-input"
              value={service.price || ''}
              onChange={(e) => onChange({ ...service, price: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <button className="line-remove-btn" onClick={onRemove} title="Eliminar servicio">
            <X size={16} />
          </button>
        </div>
        <input
          className="line-desc-input"
          value={service.description}
          onChange={(e) => onChange({ ...service, description: e.target.value })}
          placeholder="Descripción opcional (editable)..."
        />
      </div>
    </div>
  );
};