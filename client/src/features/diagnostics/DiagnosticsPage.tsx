import React, { useState } from 'react';
import { useDiagnosticStore, Diagnostic } from '../../store/useDiagnosticStore';
import { useVehicleStore } from '../../store/useVehicleStore';
import { Button, Card, EmptyState, Modal, Input } from '../../components/ui';
import { Plus, Search, Clipboard, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const DiagnosticsPage: React.FC = () => {
  const { diagnostics, addDiagnostic } = useDiagnosticStore();
  const { vehicles } = useVehicleStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // New diagnostic state
  const [selectedPlaca, setSelectedPlaca] = useState('');
  const [clientReport, setClientReport] = useState('');
  const [mechanicReport, setMechanicReport] = useState('');
  const [motor, setMotor] = useState<'good' | 'warning' | 'danger'>('good');
  const [frenos, setFrenos] = useState<'good' | 'warning' | 'danger'>('good');
  const [suspension, setSuspension] = useState<'good' | 'warning' | 'danger'>('good');
  const [electrico, setElectrico] = useState<'good' | 'warning' | 'danger'>('good');

  const handleSave = () => {
    if (!selectedPlaca) return alert('Debes seleccionar un vehiculo');
    if (!mechanicReport.trim()) return alert('Debes ingresar el diagnostico tecnico');

    const newDiag: Diagnostic = {
      id: 'DIA-' + Date.now().toString().slice(-6),
      vehiclePlaca: selectedPlaca,
      date: new Date().toISOString(),
      clientReport,
      mechanicReport,
      checkedSystems: { motor, frenos, suspension, electrico }
    };

    addDiagnostic(newDiag);
    setShowModal(false);
    
    // Reset state
    setSelectedPlaca('');
    setClientReport('');
    setMechanicReport('');
    setMotor('good');
    setFrenos('good');
    setSuspension('good');
    setElectrico('good');
    alert('Diagnostico guardado con exito!');
  };

  const getSystemStatusIcon = (status: 'good' | 'warning' | 'danger') => {
    switch (status) {
      case 'good': return <CheckCircle2 size={16} color="var(--color-success)" />;
      case 'warning': return <AlertTriangle size={16} color="var(--color-warning)" />;
      case 'danger': return <XCircle size={16} color="var(--color-danger)" />;
    }
  };

  const filteredDiagnostics = diagnostics.filter(d => 
    d.vehiclePlaca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.mechanicReport.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Diagnósticos Técnicos</h1>
          <p className="page-subtitle">Registro de inspecciones profundas y diagnostico de fallas detectadas.</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          Nuevo Diagnóstico
        </Button>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0 12px' }}>
            <Search size={16} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por placa o reporte..." 
              style={{ width: '100%', padding: '10px 8px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredDiagnostics.length === 0 ? (
          <EmptyState
            icon={<Clipboard size={48} />}
            title="No hay diagnosticos registrados"
            description="Registra un diagnostico completo para un vehiculo cuando detectes fallas."
            action={{ label: "Registrar Diagnostico", onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}>ID / Fecha</th>
                  <th style={{ padding: '12px 8px' }}>Placa Vehiculo</th>
                  <th style={{ padding: '12px 8px' }}>Reporte Tecnico</th>
                  <th style={{ padding: '12px 8px' }}>Sistemas (M/F/S/E)</th>
                </tr>
              </thead>
              <tbody>
                {filteredDiagnostics.map(diag => (
                  <tr key={diag.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 600 }}>{diag.id}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(diag.date).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className="plate-badge" style={{ textTransform: 'uppercase', padding: '2px 6px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                        {diag.vehiclePlaca}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                      <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}><strong>Cliente:</strong> {diag.clientReport || 'No reporta'}</div>
                      <div><strong>Diagnostico:</strong> {diag.mechanicReport}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span title="Motor" style={{ display: 'flex', alignItems: 'center' }}>{getSystemStatusIcon(diag.checkedSystems.motor)}</span>
                        <span title="Frenos" style={{ display: 'flex', alignItems: 'center' }}>{getSystemStatusIcon(diag.checkedSystems.frenos)}</span>
                        <span title="Suspensión" style={{ display: 'flex', alignItems: 'center' }}>{getSystemStatusIcon(diag.checkedSystems.suspension)}</span>
                        <span title="Eléctrico" style={{ display: 'flex', alignItems: 'center' }}>{getSystemStatusIcon(diag.checkedSystems.electrico)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <Modal 
          isOpen={true} 
          title="Nuevo Diagnóstico" 
          onClose={() => setShowModal(false)}
          footer={
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="danger" onClick={handleSave}>Guardar Diagnostico</Button>
            </div>
          }
        >
          <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Seleccionar Vehiculo</label>
              <select 
                className="custom-input"
                value={selectedPlaca}
                onChange={e => setSelectedPlaca(e.target.value)}
              >
                <option value="">-- Seleccionar Placa --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.placa}>
                    {v.marca} {v.modelo} ({v.placa})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Falla reportada por el cliente</label>
              <input 
                className="custom-input"
                value={clientReport}
                onChange={e => setClientReport(e.target.value)}
                placeholder="Ej: Ruido fuerte en tren delantero al pasar baches"
              />
            </div>

            <div className="form-group">
              <label>Diagnostico Técnico / Hallazgos</label>
              <textarea 
                className="custom-input"
                style={{ minHeight: '80px', padding: '10px', resize: 'vertical' }}
                value={mechanicReport}
                onChange={e => setMechanicReport(e.target.value)}
                placeholder="Detalla las fallas encontradas..."
              />
            </div>

            {/* Systems checklist status */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Chequeo de Sistemas</strong>
              
              {[
                { label: 'Motor y Transmision', val: motor, set: setMotor },
                { label: 'Frenos y ABS', val: frenos, set: setFrenos },
                { label: 'Suspension y Direccion', val: suspension, set: setSuspension },
                { label: 'Sistema Electrico', val: electrico, set: setElectrico }
              ].map((sys, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px' }}>{sys.label}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => sys.set('good')}
                      style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '11px', background: sys.val === 'good' ? 'var(--color-success)' : 'transparent', color: sys.val === 'good' ? '#fff' : 'inherit', cursor: 'pointer' }}
                    >Bien</button>
                    <button 
                      onClick={() => sys.set('warning')}
                      style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '11px', background: sys.val === 'warning' ? 'var(--color-warning)' : 'transparent', color: sys.val === 'warning' ? '#fff' : 'inherit', cursor: 'pointer' }}
                    >Alerta</button>
                    <button 
                      onClick={() => sys.set('danger')}
                      style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '11px', background: sys.val === 'danger' ? 'var(--color-danger)' : 'transparent', color: sys.val === 'danger' ? '#fff' : 'inherit', cursor: 'pointer' }}
                    >Critico</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};