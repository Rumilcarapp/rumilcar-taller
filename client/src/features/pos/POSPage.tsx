import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore, InventoryItem } from '../../store/useInventoryStore';
import { useCashStore } from '../../store/useCashStore';
import { Button, Card, EmptyState, Modal } from '../../components/ui';
import { ShoppingCart, Search, Trash2, Tag, CircleCheck, Info } from 'lucide-react';

interface CartItem {
  item: InventoryItem;
  quantity: number;
}

export const POSPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, adjustStock } = useInventoryStore();
  const { isOpened, addTransaction, exchangeRateVES } = useCashStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0); // Direct dollar discount
  const [taxRate, setTaxRate] = useState<number>(0.16); // 16% IVA

  // Payment state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<'Efectivo' | 'Pago Movil' | 'Transferencia' | 'Zelle' | 'USDT'>('Efectivo');
  const [clientPaid, setClientPaid] = useState<number>(0);

  const categories: string[] = ['TODAS', ...Array.from(new Set(items.map(i => i.categoria).filter((c): c is string => Boolean(c))))];

  const addToCart = (item: InventoryItem) => {
    if (item.tipo === 'PRODUCTO' && item.stock <= 0) return alert('El articulo no tiene stock disponible.');
    
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        // For products, check if we exceed stock
        if (item.tipo === 'PRODUCTO' && existing.quantity >= item.stock) {
          alert('No puedes vender mas de la cantidad disponible en stock.');
          return prev;
        }
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(cartItem => {
      if (cartItem.item.id !== itemId) return cartItem;
      const newQty = cartItem.quantity + delta;
      
      if (newQty <= 0) return null;
      
      // For products, limit to stock
      if (cartItem.item.tipo === 'PRODUCTO' && newQty > cartItem.item.stock) {
        alert('Stock maximo alcanzado.');
        return cartItem;
      }
      return { ...cartItem, quantity: newQty };
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  // Calculations
  const subtotal = cart.reduce((acc, c) => acc + (c.item.precio * c.quantity), 0);
  const discountAmount = Math.min(subtotal, discount);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount;
  const totalVES = total * (exchangeRateVES || 40.0);

  const handleCheckout = () => {
    if (!isOpened) {
      alert('La caja registradora esta cerrada. Dirigete al modulo de Caja para abrirla antes de cobrar.');
      navigate('/caja');
      return;
    }
    setShowPayModal(true);
  };

  const confirmPayment = () => {
    // 1. Record transaction in Cash Register
    const itemNames = cart.map(c => `${c.quantity}x ${c.item.nombre}`).join(', ');
    const isVes = payMethod === 'Pago Movil';
    addTransaction('ingreso', total, payMethod, `Venta POS: ${itemNames}`, {
      montoVES: isVes ? totalVES : undefined,
      tasaCambio: exchangeRateVES
    });

    // 2. Adjust inventory stocks
    cart.forEach(c => {
      if (c.item.tipo === 'PRODUCTO') {
        adjustStock(c.item.id, -c.quantity);
      }
    });

    // 3. Clear cart & close modal
    setCart([]);
    setDiscount(0);
    setShowPayModal(false);
    alert('Venta procesada con exito y cargada en caja!');
  };

  const filteredItems = items.filter(i => {
    if (!i.isActive) return false;
    const matchesSearch = i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.codigo && i.codigo.includes(searchTerm));
    const matchesCategory = selectedCategory === 'TODAS' || i.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        
        {/* LEFT COLUMN: Catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h1 className="page-title">Punto de Venta (POS)</h1>
            <p className="page-subtitle">Facturación directa y rápida al mostrador de repuestos y mano de obra.</p>
          </div>

          {/* Search and Categories */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0 12px', minWidth: '250px' }}>
              <Search size={16} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o codigo de barras..." 
                style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: selectedCategory === cat ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: selectedCategory === cat ? '#fff' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat === 'TODAS' ? 'Todas' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid list */}
          {filteredItems.length === 0 ? (
            <EmptyState 
              icon={<Info size={48} />}
              title="No hay articulos disponibles"
              description="No hay articulos que coincidan con la busqueda o categoria."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {filteredItems.map(item => {
                const isOutOfStock = item.tipo === 'PRODUCTO' && item.stock <= 0;
                return (
                  <div 
                    key={item.id}
                    onClick={() => !isOutOfStock && addToCart(item)}
                    style={{ 
                      padding: '16px', 
                      background: 'var(--color-bg-secondary)', 
                      border: '1px solid var(--color-border)', 
                      borderRadius: '8px', 
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.5 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      minHeight: '140px'
                    }}
                    className={isOutOfStock ? '' : 'hover-card'}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 6px', background: 'var(--color-bg-primary)', borderRadius: '4px', textTransform: 'uppercase' }}>
                          {item.tipo}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{item.categoria}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.nombre}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                      <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>${item.precio.toFixed(2)}</strong>
                      
                      {item.tipo === 'PRODUCTO' ? (
                        <span style={{ fontSize: '11px', color: isOutOfStock ? 'red' : 'var(--color-text-muted)' }}>
                          {isOutOfStock ? 'Agotado' : `${item.stock} uds`}
                        </span>
                      ) : (
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-success)' }}>∞</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Shopping Cart */}
        <div>
          <Card style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', position: 'sticky', top: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <ShoppingCart size={18} />
              Carrito de Compras ({cart.reduce((sum, c) => sum + c.quantity, 0)})
            </h3>

            {cart.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>
                <ShoppingCart size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <div>El carrito esta vacio.</div>
                <div style={{ fontSize: '12px' }}>Selecciona repuestos o servicios a la izquierda.</div>
              </div>
            ) : (
              <>
                {/* Cart list */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0' }}>
                  {cart.map(c => (
                    <div key={c.item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ flex: 1, marginRight: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.item.nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>${c.item.precio.toFixed(2)} c/u</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <button onClick={() => updateQuantity(c.item.id, -1)} style={{ border: 'none', background: 'var(--color-bg-secondary)', padding: '4px 8px', cursor: 'pointer' }}>-</button>
                          <span style={{ padding: '0 8px', fontSize: '13px', fontWeight: 600 }}>{c.quantity}</span>
                          <button onClick={() => updateQuantity(c.item.id, 1)} style={{ border: 'none', background: 'var(--color-bg-secondary)', padding: '4px 8px', cursor: 'pointer' }}>+</button>
                        </div>
                        <button onClick={() => removeFromCart(c.item.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotals & Taxes */}
                <div style={{ borderTop: '2px dashed var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Tag size={13} /> Descuento (USD)</span>
                    <input 
                      type="number" 
                      value={discount || ''} 
                      onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: '60px', padding: '2px 6px', border: '1px solid var(--color-border)', borderRadius: '4px', textAlign: 'right' }}
                      placeholder="0"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>IVA (16%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '8px', fontSize: '16px', fontWeight: 700 }}>
                    <span>Total USD</span>
                    <span style={{ color: 'var(--color-primary)' }}>${total.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    <span>Total VES (tasa 36.0)</span>
                    <span>Bs.{totalVES.toFixed(2)}</span>
                  </div>
                </div>

                <Button onClick={handleCheckout} style={{ width: '100%', marginTop: '16px' }} icon={<CircleCheck size={16} />}>
                  Proceder al Pago
                </Button>
              </>
            )}
          </Card>
        </div>

      </div>

      {/* PAYMENT MODAL */}
      {showPayModal && (
        <Modal 
          isOpen={true} 
          title="Procesar Pago POS" 
          onClose={() => setShowPayModal(false)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowPayModal(false)}>Cancelar</Button>
              <Button onClick={confirmPayment}>Registrar Pago y Facturar</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>MONTO TOTAL A PAGAR</div>
              <strong style={{ fontSize: '28px', color: 'var(--color-primary)', display: 'block', margin: '4px 0' }}>${total.toFixed(2)} USD</strong>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Equivalente: <strong>Bs. {totalVES.toFixed(2)} VES</strong></span>
            </div>

            <div className="form-group">
              <label>Método de Pago</label>
              <select 
                className="input-field"
                value={payMethod}
                onChange={e => setPayMethod(e.target.value as any)}
              >
                <option value="Efectivo">Efectivo (USD / VES)</option>
                <option value="Pago Movil">Pago Móvil (VES)</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Zelle">Zelle (USD)</option>
                <option value="USDT">USDT (Crypto)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Monto Entregado por Cliente (Opcional - Efectivo)</label>
              <input 
                type="number"
                className="input-field"
                value={clientPaid === 0 ? '' : clientPaid}
                onChange={e => setClientPaid(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              {clientPaid > total && (
                <div style={{ fontSize: '13px', marginTop: '8px', color: 'var(--color-success)', fontWeight: 600 }}>
                  Cambio a entregar: ${(clientPaid - total).toFixed(2)} USD
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};