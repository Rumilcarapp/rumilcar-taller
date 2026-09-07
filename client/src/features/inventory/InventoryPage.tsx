import React, { useState } from 'react';
import { useInventoryStore, InventoryItem } from '../../store/useInventoryStore';
import { Button, Card, EmptyState } from '../../components/ui';
import { Plus, Search, Package, Edit2, Trash2 } from 'lucide-react';
import { InventoryItemModal } from './components/InventoryItemModal';

export const InventoryPage: React.FC = () => {
  const { items, addItem, updateItem, deleteItem } = useInventoryStore();
  const [activeTab, setActiveTab] = useState<'SERVICIO' | 'PRODUCTO' | 'TODOS'>('SERVICIO');
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);

  const handleSave = (item: InventoryItem) => {
    if (editingItem) {
      updateItem(editingItem.id, item);
    } else {
      addItem(item);
    }
    setShowModal(false);
    setEditingItem(undefined);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.codigo && item.codigo.includes(searchTerm)) ||
      (item.marca && item.marca.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'TODOS') return matchesSearch;
    return matchesSearch && item.tipo === activeTab;
  });

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Inventario de Productos y Servicios</h1>
          <p className="page-subtitle">Gestiona repuestos físicos, consumibles y mano de obra del taller en un solo lugar.</p>
        </div>
        <Button onClick={() => { setEditingItem(undefined); setShowModal(true); }} icon={<Plus size={18} />}>
          Nuevo Item
        </Button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', paddingBottom: '4px' }}>
        {[
          { id: 'SERVICIO', label: 'Servicios / Mano de Obra' },
          { id: 'PRODUCTO', label: 'Productos / Repuestos' },
          { id: 'TODOS', label: 'Todos los Items' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0 12px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, marca o codigo..." 
              style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<Package size={48} />}
            title="No se encontraron artículos"
            description="Registra repuestos físicos o mano de obra técnica para iniciar con tu inventario."
            action={{ label: "Crear primer artículo", onClick: () => { setEditingItem(undefined); setShowModal(true); } }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}>Tipo / SKU</th>
                  <th style={{ padding: '12px 8px' }}>Nombre del Item</th>
                  <th style={{ padding: '12px 8px' }}>Categoría / Marca</th>
                  <th style={{ padding: '12px 8px' }}>Costo</th>
                  <th style={{ padding: '12px 8px' }}>Precio Venta</th>
                  <th style={{ padding: '12px 8px' }}>Stock</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isLowStock = item.tipo === 'PRODUCTO' && item.stock <= (item.stockMinimo || 0);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: item.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          background: item.tipo === 'PRODUCTO' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: item.tipo === 'PRODUCTO' ? 'blue' : 'green',
                          display: 'inline-block',
                          marginBottom: '4px'
                        }}>
                          {item.tipo}
                        </span>
                        {item.codigo && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.codigo}</div>}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{item.nombre}</div>
                        {item.descripcion && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{item.descripcion}</div>}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>
                        <div>{item.categoria || '-'}</div>
                        {item.marca && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{item.marca}</div>}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>
                        ${item.costo.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                        ${item.precio.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {item.tipo === 'SERVICIO' ? (
                          <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-success)' }}>∞</span>
                        ) : (
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '12px', 
                            fontWeight: 600,
                            background: isLowStock ? 'var(--color-danger-light)' : 'var(--color-bg-secondary)',
                            color: isLowStock ? 'red' : 'inherit'
                          }}>
                            {item.stock} uds {isLowStock && '(Bajo Stock)'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="icon-btn" onClick={() => handleEdit(item)} title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-btn" onClick={() => deleteItem(item.id)} title="Eliminar">
                            <Trash2 size={16} color="var(--color-danger)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <InventoryItemModal 
          initialItem={editingItem} 
          onClose={() => { setShowModal(false); setEditingItem(undefined); }} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
};