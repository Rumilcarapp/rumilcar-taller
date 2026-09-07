import React, { useState, useEffect } from 'react';
import { CatalogService } from '../../../store/useCatalogStore';
import { Button, Input, Modal } from '../../../components/ui';

interface Props {
  onClose: () => void;
  onSave: (service: CatalogService) => void;
  initialService?: CatalogService;
}

export const ServiceModal: React.FC<Props> = ({ onClose, onSave, initialService }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [currency, setCurrency] = useState<'USD' | 'VES' | 'USDT'>('USD');
  const [estimatedTime, setEstimatedTime] = useState<number | ''>('');
  const [timeUnit, setTimeUnit] = useState<'minutes' | 'hours'>('minutes');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialService) {
      setName(initialService.name);
      setDescription(initialService.description || '');
      setBasePrice(initialService.basePrice);
      setCurrency(initialService.currency);
      setEstimatedTime(initialService.estimatedTime || '');
      setTimeUnit(initialService.timeUnit || 'minutes');
      setIsActive(initialService.isActive);
    }
  }, [initialService]);

  const handleSave = () => {
    if (!name.trim()) return alert("El nombre del servicio es obligatorio.");
    if (basePrice < 0) return alert("El precio no puede ser negativo.");

    onSave({
      id: initialService?.id || 'SRV-' + Date.now().toString().slice(-6),
      name,
      description,
      basePrice,
      currency,
      estimatedTime: estimatedTime === '' ? undefined : estimatedTime,
      timeUnit: estimatedTime === '' ? undefined : timeUnit,
      isActive
    });
  };

  return (
    <Modal isOpen={true} title={initialService ? 'Editar Servicio' : 'Nuevo Servicio'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input 
          label="Nombre del servicio" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Ej: Cambio de aceite y filtro" 
        />
        
        <div className="form-group">
          <label className="form-label">Descripción (Opcional)</label>
          <textarea 
            className="input-field" 
            style={{ minHeight: '80px', resize: 'vertical' }}
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Detalle de lo que incluye el servicio..." 
          />
        </div>

        <div className="fila-precio-tiempo" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
          <div className="form-group">
            <label className="form-label">Precio Base</label>
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value as any)}
                style={{ padding: '0 12px', border: 'none', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
              >
                <option value="USD">USD</option>
                <option value="VES">VES</option>
                <option value="USDT">USDT</option>
              </select>
              <input 
                type="number" 
                value={basePrice === 0 ? '' : basePrice} 
                onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)} 
                placeholder="0.00" 
                min="0" step="0.01"
                style={{ flex: 1, minWidth: '0', padding: '10px 12px', border: 'none', background: 'transparent', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Tiempo Estimado (Opcional)</label>
            <div className="tiempo-estimado-wrapper" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', width: '100%', overflow: 'visible' }}>
              <input 
                type="number" 
                value={estimatedTime} 
                onChange={(e) => setEstimatedTime(e.target.value ? parseInt(e.target.value) : '')} 
                placeholder="Ej: 45" 
                min="1"
                className="tiempo-estimado-input"
                style={{ flex: 1, minWidth: '60px', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--color-text-primary)' }}
              />
              <select 
                value={timeUnit} 
                onChange={(e) => setTimeUnit(e.target.value as any)}
                className="tiempo-estimado-select"
                style={{ flexShrink: 0, width: '95px', minWidth: '95px', padding: '0 8px', height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
              >
                <option value="minutes">min</option>
                <option value="hours">horas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontWeight: 500 }}>Estado del servicio</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Los servicios inactivos no aparecerán en las ordenes de trabajo.</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave}>{initialService ? 'Guardar Cambios' : 'Crear Servicio'}</Button>
      </div>
    </Modal>
  );
};