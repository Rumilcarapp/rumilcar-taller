import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../../../store/useInventoryStore';
import { Button, Input, Modal } from '../../../components/ui';

interface Props {
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  initialItem?: InventoryItem;
}

export const InventoryItemModal: React.FC<Props> = ({ onClose, onSave, initialItem }) => {
  const [tipo, setTipo] = useState<'PRODUCTO' | 'SERVICIO'>('PRODUCTO');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [codigo, setCodigo] = useState('');
  const [costo, setCosto] = useState<number>(0);
  const [precio, setPrecio] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [stockMinimo, setStockMinimo] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialItem) {
      setTipo(initialItem.tipo);
      setNombre(initialItem.nombre);
      setDescripcion(initialItem.descripcion || '');
      setCategoria(initialItem.categoria || '');
      setMarca(initialItem.marca || '');
      setCodigo(initialItem.codigo || '');
      setCosto(initialItem.costo);
      setPrecio(initialItem.precio);
      setStock(initialItem.stock);
      setStockMinimo(initialItem.stockMinimo || 0);
      setIsActive(initialItem.isActive);
    }
  }, [initialItem]);

  const handleSave = () => {
    if (!nombre.trim()) return alert('El nombre del item es obligatorio.');
    if (precio < 0 || costo < 0) return alert('Los precios/costos no pueden ser negativos.');
    if (tipo === 'PRODUCTO' && stock < 0) return alert('El stock inicial no puede ser negativo.');

    onSave({
      id: initialItem?.id || 'INV-' + Date.now().toString().slice(-6),
      codigo: tipo === 'PRODUCTO' && codigo.trim() ? codigo.trim() : undefined,
      tipo,
      nombre,
      descripcion,
      categoria: categoria.trim() ? categoria.trim() : undefined,
      marca: tipo === 'PRODUCTO' && marca.trim() ? marca.trim() : undefined,
      costo,
      precio,
      currency: 'USD',
      stock: tipo === 'SERVICIO' ? Infinity : stock,
      stockMinimo: tipo === 'PRODUCTO' ? stockMinimo : undefined,
      isActive
    });
  };

  return (
    <Modal 
      isOpen={true} 
      title={initialItem ? 'Editar Item de Inventario' : 'Nuevo Item de Inventario'} 
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Item Type Selector */}
        {!initialItem && (
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Tipo de Item</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setTipo('SERVICIO')}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: tipo === 'SERVICIO' ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: tipo === 'SERVICIO' ? '#fff' : 'var(--color-text-primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                SERVICIO / MANO DE OBRA
              </button>
              <button 
                onClick={() => setTipo('PRODUCTO')}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: tipo === 'PRODUCTO' ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: tipo === 'PRODUCTO' ? '#fff' : 'var(--color-text-primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                PRODUCTO / REPUESTO
              </button>
            </div>
          </div>
        )}

        <Input 
          label="Nombre del Item" 
          value={nombre} 
          onChange={(e) => setNombre(e.target.value)} 
          placeholder={tipo === 'PRODUCTO' ? 'Ej: Filtro de Aceite Purolator' : 'Ej: Limpieza de Inyectores'} 
        />
        
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea 
            className="input-field" 
            style={{ minHeight: '60px', resize: 'vertical' }}
            value={descripcion} 
            onChange={(e) => setDescripcion(e.target.value)} 
            placeholder="Breve detalle del repuesto o lo que cubre el servicio..." 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Input 
            label="Categoría" 
            value={categoria} 
            onChange={(e) => setCategoria(e.target.value)} 
            placeholder="Ej: Filtros, Frenos, Motor" 
          />
          {tipo === 'PRODUCTO' && (
            <Input 
              label="Marca" 
              value={marca} 
              onChange={(e) => setMarca(e.target.value)} 
              placeholder="Ej: Purolator, ACDelco" 
            />
          )}
        </div>

        {tipo === 'PRODUCTO' && (
          <Input 
            label="Código de Barra / SKU" 
            value={codigo} 
            onChange={(e) => setCodigo(e.target.value)} 
            placeholder="Código único del fabricante" 
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Costo (USD)</label>
            <input 
              type="number" 
              className="input-field"
              value={costo === 0 ? '' : costo} 
              onChange={(e) => setCosto(parseFloat(e.target.value) || 0)} 
              placeholder="0.00" 
              min="0" step="0.01"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Precio de Venta (USD)</label>
            <input 
              type="number" 
              className="input-field"
              value={precio === 0 ? '' : precio} 
              onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)} 
              placeholder="0.00" 
              min="0" step="0.01"
            />
          </div>
        </div>

        {tipo === 'PRODUCTO' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Stock Inicial</label>
              <input 
                type="number" 
                className="input-field"
                value={stock === 0 ? '' : stock} 
                onChange={(e) => setStock(parseInt(e.target.value) || 0)} 
                placeholder="0" 
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Stock Mínimo Alerta</label>
              <input 
                type="number" 
                className="input-field"
                value={stockMinimo === 0 ? '' : stockMinimo} 
                onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)} 
                placeholder="0" 
                min="0"
              />
            </div>
          </div>
        )}

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontWeight: 500 }}>Item Activo</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Desactiva este item para que no aparezca en las ventas ni ordenes.</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave}>{initialItem ? 'Guardar Cambios' : 'Crear Item'}</Button>
      </div>
    </Modal>
  );
};