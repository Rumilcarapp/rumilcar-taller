import React, { useState } from 'react';
import { 
  usePrePurchaseStore, 
  PrePurchaseInspection, 
  getDefaultChecklistCategories,
  ChecklistCategory,
  ChecklistItem,
  TechnicalItemStatus,
  VerdictType
} from '../../store/usePrePurchaseStore';
import { useClientStore } from '../../store/useClientStore';
import { useCashStore } from '../../store/useCashStore';
import { Button, Card, EmptyState, Modal } from '../../components/ui';
import { 
  SearchCheck, 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  Share2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Car, 
  User, 
  Wrench, 
  Camera, 
  Edit2, 
  Trash2,
  Clock
} from 'lucide-react';

export const PreCompraPage: React.FC = () => {
  const { inspections, addInspection, updateInspection, deleteInspection } = usePrePurchaseStore();
  const { clients } = useClientStore();
  const { exchangeRateVES } = useCashStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [mechanicFilter, setMechanicFilter] = useState<string>('TODOS');

  // Modal / Wizard state
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [editingInspectionId, setEditingInspectionId] = useState<string | null>(null);

  // Step 1 State - Client
  const [selectedClientId, setSelectedClientId] = useState('');
  const [broughtBy, setBroughtBy] = useState('Mismo cliente');

  // Step 2 State - Vehicle
  const [vPlaca, setVPlaca] = useState('');
  const [vMarca, setVMarca] = useState('');
  const [vModelo, setVModelo] = useState('');
  const [vYear, setVYear] = useState<number>(2018);
  const [vColor, setVColor] = useState('');
  const [vKm, setVKm] = useState<number>(100000);

  // Step 3 State - Checklist
  const [categories, setCategories] = useState<ChecklistCategory[]>(getDefaultChecklistCategories());
  const [expandedCatId, setExpandedCatId] = useState<string>('motor');

  // Step 4 State - Diagnosis & Price
  const [diagnosis, setDiagnosis] = useState('');
  const [verdict, setVerdict] = useState<VerdictType>('APTO');
  const [priceUSD, setPriceUSD] = useState<number>(45.00);
  const [currency, setCurrency] = useState<'USD' | 'VES' | 'USDT'>('USD');
  const [mechanicName, setMechanicName] = useState('Carlos P.');

  // Print / View Report Modal
  const [selectedInspectionForReport, setSelectedInspectionForReport] = useState<PrePurchaseInspection | null>(null);

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleOpenNewWizard = () => {
    setEditingInspectionId(null);
    setWizardStep(1);
    setSelectedClientId(clients[0]?.id || '');
    setBroughtBy('Mismo cliente');
    setVPlaca('');
    setVMarca('');
    setVModelo('');
    setVYear(2018);
    setVColor('');
    setVKm(100000);
    setCategories(getDefaultChecklistCategories());
    setDiagnosis('');
    setVerdict('APTO');
    setPriceUSD(45.00);
    setCurrency('USD');
    setMechanicName('Carlos P.');
    setShowWizardModal(true);
  };

  const handleItemStatusChange = (catId: string, itemId: string, status: TechnicalItemStatus) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        items: cat.items.map(item => item.id === itemId ? { ...item, status } : item)
      };
    }));
  };

  const handleItemNotesChange = (catId: string, itemId: string, notes: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        items: cat.items.map(item => item.id === itemId ? { ...item, notes } : item)
      };
    }));
  };

  const handleSaveInspection = () => {
    let clientObj = clients.find(c => c.id === selectedClientId);
    if (!clientObj) {
      clientObj = { id: 'C-000', nombre: 'Cliente Solicitante', apellido: '', documento: 'V-00000000', telefono: '', type: 'persona', direccion: '' };
    }

    const newInsp: PrePurchaseInspection = {
      id: editingInspectionId || 'PC-2026-' + Math.floor(1000 + Math.random() * 9000).toString(),
      date: new Date().toISOString(),
      client: clientObj,
      broughtBy,
      vehicle: {
        placa: vPlaca.trim() || undefined,
        marca: vMarca || 'Marca N/D',
        modelo: vModelo || 'Modelo N/D',
        year: vYear,
        color: vColor,
        km: vKm
      },
      categories,
      generalDiagnosis: diagnosis,
      verdict,
      priceUSD,
      currency,
      mechanicName,
      status: 'Completada'
    };

    if (editingInspectionId) {
      updateInspection(editingInspectionId, newInsp);
    } else {
      addInspection(newInsp);
    }

    setShowWizardModal(false);
    setSelectedInspectionForReport(newInsp);
  };

  const handlePrintReportWindow = (insp: PrePurchaseInspection) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Informe Pre-Compra - ${insp.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #dc2626; font-size: 24px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
            .verdict-box { padding: 16px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 30px; }
            .verdict-APTO { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
            .verdict-PRECAUCION { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .verdict-NO_RECOMENDADO { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
            .cat-title { background: #f1f5f9; padding: 8px 12px; font-weight: bold; border-left: 4px solid #dc2626; margin-top: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 13px; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            .status-ok { color: #16a34a; font-weight: bold; }
            .status-warning { color: #d97706; font-weight: bold; }
            .status-danger { color: #dc2626; font-weight: bold; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Imprimir Informe PDF</button>
          </div>

          <div class="header">
            <h1>RUMILCAR TALLER MECÁNICO</h1>
            <p>INFORME DE INSPECCIÓN TÉCNICA DE PRE-COMPRA · <strong>${insp.id}</strong></p>
            <p style="font-size: 12px; color: #64748b;">Fecha: ${new Date(insp.date).toLocaleDateString()} | Mecánico Evaluador: ${insp.mechanicName}</p>
          </div>

          <div class="verdict-box verdict-${insp.verdict}">
            VEREDICTO FINAL: ${insp.verdict === 'APTO' ? '🟢 VEHÍCULO APTO PARA COMPRA' : insp.verdict === 'PRECAUCION' ? '🟡 COMPRAR CON PRECAUCIONES' : '🔴 VEHÍCULO NO RECOMENDADO'}
          </div>

          <div class="meta-grid">
            <div class="card">
              <strong>SOLICITANTE:</strong><br>
              ${insp.client?.nombre} ${insp.client?.apellido}<br>
              C.I/RIF: ${insp.client?.documento}<br>
              Teléfono: ${insp.client?.telefono || 'N/D'}<br>
              <em>Traído por: ${insp.broughtBy || 'Mismo cliente'}</em>
            </div>
            <div class="card">
              <strong>VEHÍCULO EVALUADO:</strong><br>
              ${insp.vehicle?.marca} ${insp.vehicle?.modelo} (${insp.vehicle?.year})<br>
              Placa: ${insp.vehicle?.placa || 'Sin placa'}<br>
              Color: ${insp.vehicle?.color || 'N/D'}<br>
              Kilometraje: ${insp.vehicle?.km?.toLocaleString() || 'N/D'} km
            </div>
          </div>

          <h3>DIAGNÓSTICO Y RECOMENDACIONES</h3>
          <div class="card" style="margin-bottom: 30px; font-size: 14px;">
            ${insp.generalDiagnosis || 'Sin observaciones adicionales.'}
          </div>

          <h3>CHECKLIST TÉCNICO DETALLADO</h3>
          ${insp.categories.map(cat => `
            <div class="cat-title">${cat.title}</div>
            <table>
              ${cat.items.map(item => `
                <tr>
                  <td>${item.label}</td>
                  <td style="width: 120px;" class="status-${item.status}">
                    ${item.status === 'ok' ? '✅ Bien' : item.status === 'warning' ? '⚠️ Observación' : item.status === 'danger' ? '❌ Falla' : '— No revisado'}
                  </td>
                  <td style="color: #64748b; font-size: 12px;">${item.notes || ''}</td>
                </tr>
              `).join('')}
            </table>
          `).join('')}

          <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b;">
            Firma del Evaluador: ______________________ (${insp.mechanicName})
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleWhatsAppShareReport = (insp: PrePurchaseInspection) => {
    const phone = insp.client?.telefono;
    if (!phone) return alert('El cliente no tiene número de teléfono registrado.');

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('58')) cleanPhone = '58' + cleanPhone;

    const verdictLabel = insp.verdict === 'APTO' ? '🟢 APTO PARA COMPRA' : insp.verdict === 'PRECAUCION' ? '🟡 COMPRAR CON PRECAUCIONES' : '🔴 NO RECOMENDADO';

    const msg = `Hola *${insp.client?.nombre}*,\n\n` +
      `Te enviamos el resumen de la *Inspección Pre-Compra* realizada a tu vehículo de interés:\n\n` +
      `🚗 *${insp.vehicle?.marca} ${insp.vehicle?.modelo} (${insp.vehicle?.year})*\n` +
      `📋 Informe Nro: *${insp.id}*\n` +
      `🏆 Veredicto: *${verdictLabel}*\n\n` +
      `*Diagnóstico General:*\n_${insp.generalDiagnosis || 'Vehículo revisado exitosamente.'}_\n\n` +
      `Gracias por confiar en *Rumilcar Taller Mecánico*. ¡Estamos a la orden!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filtered Inspections
  const filteredInspections = inspections.filter(insp => {
    const matchesSearch = insp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${insp.client?.nombre} ${insp.client?.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.vehicle?.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (insp.vehicle?.placa && insp.vehicle.placa.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'TODOS' || insp.status === statusFilter;
    const matchesMechanic = mechanicFilter === 'TODOS' || insp.mechanicName === mechanicFilter;
    return matchesSearch && matchesStatus && matchesMechanic;
  });

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Inspecciones de Pre-Compra</h1>
          <p className="page-subtitle">Evaluaciones técnicas completas para compra/venta de vehículos usados.</p>
        </div>

        <Button onClick={handleOpenNewWizard} icon={<Plus size={18} />}>
          + Nueva Inspección de Pre-Compra
        </Button>
      </div>

      {/* Main List Card */}
      <Card>
        {/* Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: '260px', display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, marca, modelo u orden PC..." 
              style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)', fontSize: '13px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '8px' }}>
            {['TODOS', 'Completada', 'En proceso', 'Entregada'].map(st => (
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

        {filteredInspections.length === 0 ? (
          <EmptyState 
            icon={<SearchCheck size={48} />}
            title="Sin inspecciones de pre-compra registradas"
            description="Ofrece a tus clientes el servicio de revisión técnica completa antes de comprar un vehículo usado."
            action={{ label: "Crear primera inspección pre-compra", onClick: handleOpenNewWizard }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}># Informe / Fecha</th>
                  <th style={{ padding: '12px 8px' }}>Solicitante</th>
                  <th style={{ padding: '12px 8px' }}>Vehículo Evaluado</th>
                  <th style={{ padding: '12px 8px' }}>Veredicto Final</th>
                  <th style={{ padding: '12px 8px' }}>Mecanico / Costo</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map(insp => (
                  <tr key={insp.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <strong style={{ color: 'var(--color-primary)' }}>{insp.id}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(insp.date).toLocaleDateString()}</div>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 600 }}>{insp.client?.nombre} {insp.client?.apellido}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{insp.client?.documento}</div>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 600 }}>{insp.vehicle?.marca} {insp.vehicle?.modelo} ({insp.vehicle?.year})</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Placa: {insp.vehicle?.placa || 'Sin placa'} · {insp.vehicle?.km?.toLocaleString()} km
                      </div>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: 700,
                        background: insp.verdict === 'APTO' ? 'rgba(16, 185, 129, 0.15)' : insp.verdict === 'PRECAUCION' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: insp.verdict === 'APTO' ? 'var(--color-success)' : insp.verdict === 'PRECAUCION' ? 'var(--color-warning)' : 'var(--color-danger)',
                        display: 'inline-block'
                      }}>
                        {insp.verdict === 'APTO' ? '🟢 APTO PARA COMPRA' : insp.verdict === 'PRECAUCION' ? '🟡 CON PRECAUCIONES' : '🔴 NO RECOMENDADO'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <div>{insp.mechanicName}</div>
                      <strong style={{ fontSize: '14px', color: 'var(--color-primary)' }}>${insp.priceUSD.toFixed(2)} USD</strong>
                    </td>

                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          className="icon-btn" 
                          onClick={() => setSelectedInspectionForReport(insp)} 
                          title="Ver Informe / PDF"
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          className="icon-btn" 
                          onClick={() => handleWhatsAppShareReport(insp)} 
                          title="Enviar Informe por WhatsApp"
                          style={{ color: '#25D366' }}
                        >
                          <Share2 size={16} />
                        </button>
                        <button 
                          className="icon-btn" 
                          onClick={() => deleteInspection(insp.id)} 
                          title="Eliminar"
                          style={{ color: 'var(--color-danger)' }}
                        >
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

      {/* WIZARD MODAL: NUEVA INSPECCIÓN DE PRE-COMPRA */}
      {showWizardModal && (
        <Modal 
          isOpen={true} 
          title={`Nueva Inspección Pre-Compra (Paso ${wizardStep} de 4)`} 
          onClose={() => setShowWizardModal(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div>
                {wizardStep > 1 && (
                  <Button variant="outline" onClick={() => setWizardStep((wizardStep - 1) as any)}>
                    Atrás
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="outline" onClick={() => setShowWizardModal(false)}>Cancelar</Button>
                {wizardStep < 4 ? (
                  <Button onClick={() => setWizardStep((wizardStep + 1) as any)}>Siguiente Paso</Button>
                ) : (
                  <Button onClick={handleSaveInspection} icon={<CheckCircle size={16} />}>Generar y Finalizar Informe</Button>
                )}
              </div>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Step 1: Solicitante */}
            {wizardStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Paso 1 — Datos del Solicitante</h4>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Seleccionar Cliente Solicitante</label>
                  <select 
                    className="input-field" 
                    value={selectedClientId} 
                    onChange={e => setSelectedClientId(e.target.value)}
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} {c.apellido} ({c.documento})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>¿Quién trae el vehículo a inspección?</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={broughtBy} 
                    onChange={e => setBroughtBy(e.target.value)} 
                    placeholder="Ej: El mismo comprador / Vendedor particular / Concesionario" 
                  />
                </div>
              </div>
            )}

            {/* Step 2: Vehículo */}
            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Paso 2 — Datos del Vehículo a Inspeccionar</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Placa (opcional)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={vPlaca} 
                      onChange={e => setVPlaca(e.target.value)} 
                      placeholder="AA123BC" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Marca</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={vMarca} 
                      onChange={e => setVMarca(e.target.value)} 
                      placeholder="Ej: Toyota, Ford, Chevrolet" 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Modelo</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={vModelo} 
                      onChange={e => setVModelo(e.target.value)} 
                      placeholder="Ej: Corolla" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Año</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={vYear} 
                      onChange={e => setVYear(parseInt(e.target.value) || 2018)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Kilometraje</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={vKm} 
                      onChange={e => setVKm(parseInt(e.target.value) || 0)} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Checklist Técnico */}
            {wizardStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Paso 3 — Checklist Técnico de Inspección</h4>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Marca el estado de cada componente técnico (✅ Bien · ⚠️ Observación · ❌ Falla · — No revisado)
                </p>

                {categories.map(cat => (
                  <div key={cat.id} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div 
                      onClick={() => setExpandedCatId(expandedCatId === cat.id ? '' : cat.id)}
                      style={{ background: 'var(--color-bg-secondary)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
                    >
                      <span>{cat.title} ({cat.items.length} ítems)</span>
                      {expandedCatId === cat.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>

                    {expandedCatId === cat.id && (
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {cat.items.map(item => (
                          <div key={item.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 600 }}>{item.label}</span>
                              
                              {/* Status Buttons */}
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                  type="button"
                                  onClick={() => handleItemStatusChange(cat.id, item.id, 'ok')}
                                  style={{ border: 'none', padding: '3px 8px', borderRadius: '4px', background: item.status === 'ok' ? '#10b981' : 'var(--color-bg-secondary)', color: item.status === 'ok' ? '#fff' : 'inherit', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                                >✅ Bien</button>
                                <button 
                                  type="button"
                                  onClick={() => handleItemStatusChange(cat.id, item.id, 'warning')}
                                  style={{ border: 'none', padding: '3px 8px', borderRadius: '4px', background: item.status === 'warning' ? '#f59e0b' : 'var(--color-bg-secondary)', color: item.status === 'warning' ? '#fff' : 'inherit', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                                >⚠️ Obs</button>
                                <button 
                                  type="button"
                                  onClick={() => handleItemStatusChange(cat.id, item.id, 'danger')}
                                  style={{ border: 'none', padding: '3px 8px', borderRadius: '4px', background: item.status === 'danger' ? '#ef4444' : 'var(--color-bg-secondary)', color: item.status === 'danger' ? '#fff' : 'inherit', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                                >❌ Falla</button>
                              </div>
                            </div>

                            <input 
                              type="text" 
                              className="input-field" 
                              value={item.notes || ''} 
                              onChange={e => handleItemNotesChange(cat.id, item.id, e.target.value)} 
                              placeholder="Observación o detalle técnico (opcional)..." 
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Step 4: Veredicto y Precio */}
            {wizardStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Paso 4 — Diagnóstico Final y Veredicto</h4>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Diagnóstico General y Recomendación Técnica</label>
                  <textarea 
                    className="input-field" 
                    style={{ minHeight: '80px' }}
                    value={diagnosis} 
                    onChange={e => setDiagnosis(e.target.value)} 
                    placeholder="Ej: Vehículo en buen estado general. Se recomienda cambio de correa de distribución antes de los 5.000 km..." 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Veredicto Final de Compra</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => setVerdict('APTO')}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: verdict === 'APTO' ? '#10b981' : 'var(--color-bg-secondary)', color: verdict === 'APTO' ? '#fff' : 'inherit', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                    >
                      🟢 APTO
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setVerdict('PRECAUCION')}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: verdict === 'PRECAUCION' ? '#f59e0b' : 'var(--color-bg-secondary)', color: verdict === 'PRECAUCION' ? '#fff' : 'inherit', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                    >
                      🟡 CON PRECAUCIÓN
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setVerdict('NO_RECOMENDADO')}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: verdict === 'NO_RECOMENDADO' ? '#ef4444' : 'var(--color-bg-secondary)', color: verdict === 'NO_RECOMENDADO' ? '#fff' : 'inherit', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                    >
                      🔴 NO RECOMENDADO
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Precio Cobrado por Inspección (USD)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={priceUSD} 
                      onChange={e => setPriceUSD(parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Mecánico Evaluador</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={mechanicName} 
                      onChange={e => setMechanicName(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        </Modal>
      )}

      {/* REPORT DISPLAY MODAL */}
      {selectedInspectionForReport && (
        <Modal 
          isOpen={true} 
          title={`Informe Técnico Pre-Compra - ${selectedInspectionForReport.id}`} 
          onClose={() => setSelectedInspectionForReport(null)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setSelectedInspectionForReport(null)}>Cerrar</Button>
              <Button variant="outline" icon={<Share2 size={16} />} onClick={() => handleWhatsAppShareReport(selectedInspectionForReport)}>
                WhatsApp
              </Button>
              <Button onClick={() => handlePrintReportWindow(selectedInspectionForReport)} icon={<Printer size={16} />}>
                Imprimir Informe PDF
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '10px', textAlign: 'center', fontWeight: 800, fontSize: '16px', background: selectedInspectionForReport.verdict === 'APTO' ? 'rgba(16, 185, 129, 0.15)' : selectedInspectionForReport.verdict === 'PRECAUCION' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: selectedInspectionForReport.verdict === 'APTO' ? 'var(--color-success)' : selectedInspectionForReport.verdict === 'PRECAUCION' ? 'var(--color-warning)' : 'var(--color-danger)' }}>
              VEREDICTO: {selectedInspectionForReport.verdict === 'APTO' ? '🟢 VEHÍCULO APTO PARA COMPRA' : selectedInspectionForReport.verdict === 'PRECAUCION' ? '🟡 COMPRAR CON PRECAUCIONES' : '🔴 NO RECOMENDADO'}
            </div>

            <div style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
              <div><strong>Solicitante:</strong> {selectedInspectionForReport.client?.nombre} {selectedInspectionForReport.client?.apellido}</div>
              <div><strong>Vehículo:</strong> {selectedInspectionForReport.vehicle?.marca} {selectedInspectionForReport.vehicle?.modelo} ({selectedInspectionForReport.vehicle?.year})</div>
              <div><strong>Placa / Km:</strong> {selectedInspectionForReport.vehicle?.placa || 'Sin placa'} · {selectedInspectionForReport.vehicle?.km?.toLocaleString()} km</div>
            </div>

            <div>
              <strong style={{ fontSize: '14px' }}>Diagnóstico General:</strong>
              <div style={{ background: 'var(--color-bg-secondary)', padding: '10px', borderRadius: '6px', fontSize: '13px', marginTop: '4px' }}>
                {selectedInspectionForReport.generalDiagnosis || 'Sin observaciones adicionles.'}
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
