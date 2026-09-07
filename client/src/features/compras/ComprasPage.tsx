import React, { useState } from 'react';
import { usePurchaseStore, Supplier, PurchaseOrder, PurchaseItem, PurchaseOrderStatus } from '../../store/usePurchaseStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useCashStore } from '../../store/useCashStore';
import { Button, Card, EmptyState, Modal } from '../../components/ui';
import { 
  ShoppingBag, 
  Truck, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Edit2, 
  Package, 
  Calendar, 
  DollarSign, 
  FileText,
  XCircle,
  Clock
} from 'lucide-react';

export const ComprasPage: React.FC = () => {
  const { 
    suppliers, 
    purchaseOrders, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier,
    addPurchaseOrder, 
    receivePurchaseOrder,
    cancelPurchaseOrder
  } = usePurchaseStore();

  const { items: inventoryItems } = useInventoryStore();
  const { exchangeRateVES } = useCashStore();

  const [activeTab, setActiveTab] = useState<'ordenes' | 'proveedores'>('ordenes');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  // Supplier Modal state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [suppNombre, setSuppNombre] = useState('');
  const [suppRif, setSuppRif] = useState('J-');
  const [suppTelefono, setSuppTelefono] = useState('');
  const [suppDireccion, setSuppDireccion] = useState('');
  const [suppCategorias, setSuppCategorias] = useState('');
  const [suppNotas, setSuppNotas] = useState('');

  // Purchase Order Modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [orderItems, setOrderItems] = useState<PurchaseItem[]>([]);
  const [applyIva, setApplyIva] = useState(true);
  const [estimatedDate, setEstimatedDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Inventory search in Order Modal
  const [invSearch, setInvSearch] = useState('');

  // Receive Order Modal state
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [updateInvCheck, setUpdateInvCheck] = useState(true);
  const [partialQtyMap, setPartialQtyMap] = useState<Record<string, number>>({});

  // -------------------------------------------------------------
  // SUPPLIER HANDLERS
  // -------------------------------------------------------------
  const handleOpenSupplierModal = (supp?: Supplier) => {
    if (supp) {
      setEditingSupplier(supp);
      setSuppNombre(supp.nombre);
      setSuppRif(supp.rif);
      setSuppTelefono(supp.telefono);
      setSuppDireccion(supp.direccion || '');
      setSuppCategorias(supp.categorias.join(', '));
      setSuppNotas(supp.notas || '');
    } else {
      setEditingSupplier(null);
      setSuppNombre('');
      setSuppRif('J-');
      setSuppTelefono('');
      setSuppDireccion('');
      setSuppCategorias('Repuestos, Lubricantes');
      setSuppNotas('');
    }
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = () => {
    if (!suppNombre.trim()) return alert('El nombre o razón social es obligatorio');
    if (!suppRif.trim()) return alert('El RIF es obligatorio');

    const cats = suppCategorias.split(',').map(c => c.trim()).filter(Boolean);

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        nombre: suppNombre,
        rif: suppRif,
        telefono: suppTelefono,
        direccion: suppDireccion,
        categorias: cats,
        notas: suppNotas
      });
    } else {
      addSupplier({
        id: 'SUP-' + Date.now().toString().slice(-4),
        nombre: suppNombre,
        rif: suppRif,
        telefono: suppTelefono,
        direccion: suppDireccion,
        categorias: cats,
        notas: suppNotas,
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }
    setShowSupplierModal(false);
  };

  // -------------------------------------------------------------
  // ORDER HANDLERS
  // -------------------------------------------------------------
  const handleOpenOrderModal = () => {
    if (suppliers.length === 0) {
      alert('Debes agregar al menos un proveedor antes de crear una orden de compra.');
      handleOpenSupplierModal();
      return;
    }
    setSelectedSupplierId(suppliers[0].id);
    setOrderItems([]);
    setApplyIva(true);
    setEstimatedDate('');
    setOrderNotes('');
    setShowOrderModal(true);
  };

  const handleAddInvItemToOrder = (invItem: any) => {
    const existing = orderItems.find(i => i.inventoryItemId === invItem.id);
    if (existing) {
      setOrderItems(orderItems.map(i => i.inventoryItemId === invItem.id ? { ...i, cantidad: i.cantidad + 1, subtotalUSD: (i.cantidad + 1) * i.costoUnitarioUSD } : i));
    } else {
      setOrderItems([
        ...orderItems,
        {
          id: Math.random().toString(),
          inventoryItemId: invItem.id,
          nombre: invItem.nombre,
          cantidad: 1,
          cantidadRecibida: 0,
          costoUnitarioUSD: invItem.costo || 0,
          currency: 'USD',
          subtotalUSD: invItem.costo || 0
        }
      ]);
    }
    setInvSearch('');
  };

  const handleAddManualItemToOrder = () => {
    setOrderItems([
      ...orderItems,
      {
        id: Math.random().toString(),
        nombre: 'Nuevo Repuesto / Insumo',
        cantidad: 1,
        cantidadRecibida: 0,
        costoUnitarioUSD: 10.00,
        currency: 'USD',
        subtotalUSD: 10.00
      }
    ]);
  };

  const handleUpdateOrderItem = (id: string, field: string, val: any) => {
    setOrderItems(orderItems.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      if (field === 'cantidad' || field === 'costoUnitarioUSD') {
        updated.subtotalUSD = updated.cantidad * updated.costoUnitarioUSD;
      }
      return updated;
    }));
  };

  const handleRemoveOrderItem = (id: string) => {
    setOrderItems(orderItems.filter(i => i.id !== id));
  };

  const subtotalOrderUSD = orderItems.reduce((acc, i) => acc + i.subtotalUSD, 0);
  const ivaOrderUSD = applyIva ? subtotalOrderUSD * 0.16 : 0;
  const totalOrderUSD = subtotalOrderUSD + ivaOrderUSD;

  const handleSaveOrder = () => {
    if (!selectedSupplierId) return alert('Selecciona un proveedor');
    if (orderItems.length === 0) return alert('Agrega al menos un producto a la orden de compra');

    const supp = suppliers.find(s => s.id === selectedSupplierId);

    addPurchaseOrder({
      id: 'OC-2026-' + Math.floor(100 + Math.random() * 900).toString(),
      supplierId: selectedSupplierId,
      supplierName: supp?.nombre || 'Proveedor',
      supplierRif: supp?.rif,
      date: new Date().toISOString(),
      estimatedArrivalDate: estimatedDate || undefined,
      items: orderItems,
      applyIva,
      subtotalUSD: subtotalOrderUSD,
      ivaUSD: ivaOrderUSD,
      totalUSD: totalOrderUSD,
      status: 'Pendiente',
      notes: orderNotes
    });

    setShowOrderModal(false);
    alert('¡Orden de compra creada exitosamente!');
  };

  // -------------------------------------------------------------
  // RECEIVE ORDER HANDLERS
  // -------------------------------------------------------------
  const handleOpenReceiveModal = (po: PurchaseOrder) => {
    setReceivingOrder(po);
    setUpdateInvCheck(true);
    const initialMap: Record<string, number> = {};
    po.items.forEach(i => {
      const remaining = i.cantidad - (i.cantidadRecibida || 0);
      initialMap[i.id] = remaining > 0 ? remaining : 0;
    });
    setPartialQtyMap(initialMap);
  };

  const handleConfirmReceive = () => {
    if (!receivingOrder) return;

    const receivedItems = receivingOrder.items.map(item => ({
      itemId: item.id,
      qtyReceived: partialQtyMap[item.id] || 0
    }));

    receivePurchaseOrder(receivingOrder.id, updateInvCheck, receivedItems);
    setReceivingOrder(null);
    alert('¡Recepción registrada con éxito! El inventario ha sido actualizado.');
  };

  // Low stock inventory suggestions for purchase orders
  const lowStockItems = inventoryItems.filter(i => i.tipo === 'PRODUCTO' && i.stock <= (i.stockMinimo || 5));

  // Filtered lists
  const filteredOrders = purchaseOrders.filter(po => {
    const matchesSearch = po.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'TODOS' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rif.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.categorias.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Gestión de Compras y Proveedores</h1>
          <p className="page-subtitle">Abastecimiento de repuestos, insumos y control de inventarios de entrada.</p>
        </div>

        <div>
          {activeTab === 'ordenes' ? (
            <Button onClick={handleOpenOrderModal} icon={<Plus size={18} />}>
              Nueva Orden de Compra
            </Button>
          ) : (
            <Button onClick={() => handleOpenSupplierModal()} icon={<Plus size={18} />}>
              Agregar Proveedor
            </Button>
          )}
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', marginBottom: '24px', color: 'var(--color-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={22} />
            <div>
              <strong style={{ fontSize: '14px' }}>¡Alerta de Inventario! Hay {lowStockItems.length} productos con stock bajo o agotado.</strong>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                {lowStockItems.slice(0, 3).map(i => `${i.nombre} (${i.stock} uds)`).join(' · ')}
                {lowStockItems.length > 3 ? '...' : ''}
              </div>
            </div>
          </div>
          <Button size="sm" onClick={handleOpenOrderModal} icon={<ShoppingBag size={14} />}>
            Reponer Stock
          </Button>
        </div>
      )}

      {/* Tabs Header */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('ordenes')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'ordenes' ? 700 : 500,
            color: activeTab === 'ordenes' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'ordenes' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Órdenes de Compra ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('proveedores')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === 'proveedores' ? 700 : 500,
            color: activeTab === 'proveedores' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'proveedores' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Directorio de Proveedores ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: ÓRDENES DE COMPRA */}
      {activeTab === 'ordenes' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: '260px', display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px' }}>
              <Search size={16} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Buscar orden o proveedor..." 
                style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)', fontSize: '13px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status filters */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px' }}>
              {['TODOS', 'Pendiente', 'Recibida', 'Parcial', 'Cancelada'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: statusFilter === st ? 700 : 500,
                    background: statusFilter === st ? 'var(--color-primary)' : 'transparent',
                    color: statusFilter === st ? '#fff' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <EmptyState 
              icon={<ShoppingBag size={48} />}
              title="Sin órdenes de compra registradas"
              description="Crea órdenes de compra para reponer tu inventario de repuestos y lubricantes."
              action={{ label: "Crear primera orden de compra", onClick: handleOpenOrderModal }}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}># Orden / Fecha</th>
                    <th style={{ padding: '12px 8px' }}>Proveedor</th>
                    <th style={{ padding: '12px 8px' }}># Ítems</th>
                    <th style={{ padding: '12px 8px' }}>Monto Total</th>
                    <th style={{ padding: '12px 8px' }}>Estado</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(po => (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <strong style={{ color: 'var(--color-primary)' }}>{po.id}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(po.date).toLocaleDateString()}</div>
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{po.supplierName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{po.supplierRif || 'Sin RIF'}</div>
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ fontWeight: 600 }}>{po.items.length} productos</span>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {po.items.reduce((acc, i) => acc + i.cantidad, 0)} unidades
                        </div>
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <strong style={{ fontSize: '15px' }}>${po.totalUSD.toFixed(2)} USD</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          ≈ Bs. {(po.totalUSD * exchangeRateVES).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: 700,
                          background: po.status === 'Recibida' ? 'rgba(16, 185, 129, 0.1)' : po.status === 'Parcial' ? 'rgba(245, 158, 11, 0.1)' : po.status === 'Pendiente' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                          color: po.status === 'Recibida' ? 'var(--color-success)' : po.status === 'Parcial' ? 'var(--color-warning)' : po.status === 'Pendiente' ? 'var(--color-info)' : 'var(--color-text-muted)',
                          display: 'inline-block'
                        }}>
                          {po.status}
                        </span>
                      </td>

                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {po.status !== 'Recibida' && po.status !== 'Cancelada' && (
                            <Button 
                              size="sm" 
                              style={{ background: 'var(--color-success)', color: '#fff', borderColor: 'var(--color-success)' }} 
                              onClick={() => handleOpenReceiveModal(po)}
                              icon={<CheckCircle size={14} />}
                            >
                              Recibir
                            </Button>
                          )}
                          {po.status === 'Pendiente' && (
                            <button 
                              className="icon-btn" 
                              onClick={() => cancelPurchaseOrder(po.id)} 
                              title="Cancelar Orden"
                              style={{ color: 'var(--color-danger)' }}
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: PROVEEDORES */}
      {activeTab === 'proveedores' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ flex: 1, maxWidth: '400px', display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px' }}>
              <Search size={16} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Buscar por nombre, RIF o categoría..." 
                style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)', fontSize: '13px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredSuppliers.length === 0 ? (
            <EmptyState 
              icon={<Truck size={48} />}
              title="Sin proveedores registrados"
              description="Registra tus proveedores de repuestos, lubricantes y accesorios."
              action={{ label: "Agregar primer proveedor", onClick: () => handleOpenSupplierModal() }}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Nombre / Razón Social</th>
                    <th style={{ padding: '12px 8px' }}>RIF</th>
                    <th style={{ padding: '12px 8px' }}>Teléfono</th>
                    <th style={{ padding: '12px 8px' }}>Categorías</th>
                    <th style={{ padding: '12px 8px' }}>Notas / Condiciones</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{s.nombre}</strong>
                        {s.direccion && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.direccion}</div>}
                      </td>

                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                        {s.rif}
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        {s.telefono}
                      </td>

                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {s.categorias.map(cat => (
                            <span key={cat} style={{ padding: '2px 6px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '11px' }}>
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {s.notas || '-'}
                      </td>

                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="icon-btn" onClick={() => handleOpenSupplierModal(s)} title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-btn" onClick={() => deleteSupplier(s.id)} title="Eliminar" style={{ color: 'var(--color-danger)' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* MODAL PROVEEDOR */}
      {showSupplierModal && (
        <Modal 
          isOpen={true} 
          title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'} 
          onClose={() => setShowSupplierModal(false)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowSupplierModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveSupplier}>Guardar Proveedor</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Nombre o Razón Social</label>
              <input 
                type="text" 
                className="input-field" 
                value={suppNombre} 
                onChange={e => setSuppNombre(e.target.value)} 
                placeholder="Ej: Repuestos Caroní C.A." 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>RIF / Cédula</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={suppRif} 
                  onChange={e => setSuppRif(e.target.value)} 
                  placeholder="J-12345678-9" 
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Teléfono de Contacto</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={suppTelefono} 
                  onChange={e => setSuppTelefono(e.target.value)} 
                  placeholder="04141234567" 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Dirección Física</label>
              <input 
                type="text" 
                className="input-field" 
                value={suppDireccion} 
                onChange={e => setSuppDireccion(e.target.value)} 
                placeholder="Zona Industrial / Zona Comercial..." 
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Categorías de Productos (separadas por coma)</label>
              <input 
                type="text" 
                className="input-field" 
                value={suppCategorias} 
                onChange={e => setSuppCategorias(e.target.value)} 
                placeholder="Repuestos, Lubricantes, Frenos, Baterías" 
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Notas Internas / Condiciones de Pago</label>
              <textarea 
                className="input-field" 
                style={{ minHeight: '60px' }}
                value={suppNotas} 
                onChange={e => setSuppNotas(e.target.value)} 
                placeholder="Días de crédito, métodos de pago aceptados, vendedor asignado..." 
              />
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL NUEVA ORDEN DE COMPRA */}
      {showOrderModal && (
        <Modal 
          isOpen={true} 
          title="Nueva Orden de Compra de Inventario" 
          onClose={() => setShowOrderModal(false)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowOrderModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveOrder} icon={<CheckCircle size={16} />}>Crear Orden de Compra</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Supplier Selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Seleccionar Proveedor</label>
              <select 
                className="input-field" 
                value={selectedSupplierId} 
                onChange={e => setSelectedSupplierId(e.target.value)}
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre} ({s.rif})</option>
                ))}
              </select>
            </div>

            {/* Inventory Item Search Helper */}
            <div className="form-group" style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                🔍 Buscar producto del inventario para reponer:
              </label>
              <input 
                type="text"
                className="input-field"
                placeholder="Escribe el nombre del repuesto..."
                value={invSearch}
                onChange={e => setInvSearch(e.target.value)}
              />

              {invSearch.trim() && (
                <div style={{ marginTop: '8px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {inventoryItems
                    .filter(i => i.nombre.toLowerCase().includes(invSearch.toLowerCase()))
                    .map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => handleAddInvItemToOrder(item)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}
                      >
                        <span>{item.nombre} (Stock actual: {item.stock})</span>
                        <strong style={{ color: 'var(--color-primary)' }}>+ Agregar (${item.costo.toFixed(2)})</strong>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Items Table in Order */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Ítems en la Orden de Compra</label>
                <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={handleAddManualItemToOrder}>
                  + Ítem Manual
                </Button>
              </div>

              {orderItems.length === 0 ? (
                <div style={{ padding: '20px', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
                  Agrega productos del inventario o presiona "+ Ítem Manual".
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orderItems.map(item => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 32px', gap: '8px', alignItems: 'center', background: 'var(--color-bg-secondary)', padding: '8px 12px', borderRadius: '8px' }}>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={item.nombre} 
                        onChange={e => handleUpdateOrderItem(item.id, 'nombre', e.target.value)} 
                        placeholder="Nombre repuesto"
                        style={{ fontSize: '12px' }}
                      />
                      <input 
                        type="number" 
                        className="input-field" 
                        value={item.cantidad === 0 ? '' : item.cantidad} 
                        onChange={e => handleUpdateOrderItem(item.id, 'cantidad', parseInt(e.target.value) || 0)} 
                        placeholder="Cant."
                        min="1"
                        style={{ fontSize: '12px' }}
                      />
                      <input 
                        type="number" 
                        step="0.01"
                        className="input-field" 
                        value={item.costoUnitarioUSD === 0 ? '' : item.costoUnitarioUSD} 
                        onChange={e => handleUpdateOrderItem(item.id, 'costoUnitarioUSD', parseFloat(e.target.value) || 0)} 
                        placeholder="Costo ($)"
                        min="0"
                        style={{ fontSize: '12px' }}
                      />
                      <button className="icon-btn" onClick={() => handleRemoveOrderItem(item.id)} style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals Summary */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Subtotal:</span>
                <strong>${subtotalOrderUSD.toFixed(2)} USD</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Aplica IVA (16%):
                  <input type="checkbox" checked={applyIva} onChange={e => setApplyIva(e.target.checked)} />
                </span>
                <span>${ivaOrderUSD.toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '6px', fontSize: '16px', fontWeight: 800 }}>
                <span>TOTAL ORDEN DE COMPRA:</span>
                <span style={{ color: 'var(--color-primary)' }}>${totalOrderUSD.toFixed(2)} USD</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                Equivalente: Bs. {(totalOrderUSD * exchangeRateVES).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* MODAL RECIBIR ORDEN DE COMPRA */}
      {receivingOrder && (
        <Modal 
          isOpen={true} 
          title={`Recepción de Compra - Orden ${receivingOrder.id}`} 
          onClose={() => setReceivingOrder(null)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setReceivingOrder(null)}>Cancelar</Button>
              <Button onClick={handleConfirmReceive} icon={<CheckCircle size={16} />}>Confirmar Recepción</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
              <strong style={{ fontSize: '14px' }}>Proveedor: {receivingOrder.supplierName}</strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Monto total: ${receivingOrder.totalUSD.toFixed(2)} USD</div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <input 
                type="checkbox" 
                id="updateInv" 
                checked={updateInvCheck} 
                onChange={e => setUpdateInvCheck(e.target.checked)} 
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <label htmlFor="updateInv" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-success)' }}>
                Actualizar inventario automáticamente (sumar stock y actualizar precio de costo)
              </label>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Cantidad de ítems recibidos hoy:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {receivingOrder.items.map(item => {
                  const already = item.cantidadRecibida || 0;
                  const remaining = item.cantidad - already;
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '13px' }}>
                      <div>
                        <strong>{item.nombre}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Ordenado: {item.cantidad} | Ya recibido: {already}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Llegaron:</span>
                        <input 
                          type="number"
                          min="0"
                          max={remaining}
                          value={partialQtyMap[item.id] ?? remaining}
                          onChange={e => setPartialQtyMap({ ...partialQtyMap, [item.id]: parseInt(e.target.value) || 0 })}
                          style={{ width: '60px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--color-border)', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
