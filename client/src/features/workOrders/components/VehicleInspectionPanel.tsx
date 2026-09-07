import React, { useState } from 'react';
import { Gauge, Fuel, Check, Plus, Camera, X, ShieldAlert, Sparkles } from 'lucide-react';
import './VehicleInspectionPanel.css';

export interface VehicleInspectionData {
  mileage: string | number;
  mileageUnit: 'km' | 'mi';
  fuelPercentage: number;
  fuelLevel: string;
  belongings: string[];
  notes: string;
  photos: Array<{ id: string | number; label: string; url?: string; note?: string }>;
}

interface VehicleInspectionPanelProps {
  mileage: string | number;
  onMileageChange: (val: string | number) => void;
  mileageUnit?: 'km' | 'mi';
  onMileageUnitChange?: (unit: 'km' | 'mi') => void;
  lastRecordedMileage?: number;
  fuelPercentage: number;
  fuelLevel: string;
  onFuelChange: (percentage: number, label: string) => void;
  belongings: string[];
  onBelongingsChange: (items: string[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

const TireIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v6" />
    <path d="M12 16v6" />
    <path d="M2 12h6" />
    <path d="M16 12h6" />
  </svg>
);

const CarJackIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M6 21l6-11 6 11" />
    <path d="M12 10V4" />
    <path d="M9 4h6" />
    <path d="M8.5 15h7" />
  </svg>
);

const LugWrenchIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20" />
    <path d="M2 12h20" />
    <circle cx="12" cy="2.5" r="1.5" fill="currentColor" />
    <circle cx="12" cy="21.5" r="1.5" fill="currentColor" />
    <circle cx="2.5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="21.5" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const DocsIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const ToolboxIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const FrontalRadioIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="6" y1="9" x2="10" y2="9" />
    <line x1="6" y1="13" x2="10" y2="13" />
    <circle cx="16" cy="12" r="2" />
  </svg>
);

const JumperCablesIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const SafetyTriangleIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const COMMON_BELONGINGS: Array<{ id: string; label: string; icon: React.ReactNode }> = [
  { id: 'caucho', label: 'Caucho de repuesto', icon: <TireIcon /> },
  { id: 'gato', label: 'Gato y palanca', icon: <CarJackIcon /> },
  { id: 'llave', label: 'Llave de cruz', icon: <LugWrenchIcon /> },
  { id: 'docs', label: 'Documentos / Carnet', icon: <DocsIcon /> },
  { id: 'herramientas', label: 'Herramientas', icon: <ToolboxIcon /> },
  { id: 'frontal', label: 'Frontal / Pantalla', icon: <FrontalRadioIcon /> },
  { id: 'cables', label: 'Cables auxiliares', icon: <JumperCablesIcon /> },
  { id: 'triangulo', label: 'Triángulo de seguridad', icon: <SafetyTriangleIcon /> },
];

const FUEL_PRESETS = [
  { pct: 0, key: '0', label: 'E', sub: 'Vacío / Reserva', badge: 'Reserva Crítica', classKey: 'preset-0', badgeType: 'danger' },
  { pct: 25, key: '25', label: '1/4', sub: 'Un cuarto', badge: '1/4 Tanque', classKey: 'preset-25', badgeType: 'warning' },
  { pct: 50, key: '50', label: '1/2', sub: 'Medio tanque', badge: '1/2 Tanque', classKey: 'preset-50', badgeType: 'info' },
  { pct: 75, key: '75', label: '3/4', sub: 'Tres cuartos', badge: '3/4 Tanque', classKey: 'preset-75', badgeType: 'success' },
  { pct: 100, key: '100', label: 'F', sub: 'Lleno total', badge: 'Tanque Lleno', classKey: 'preset-100', badgeType: 'success' },
];

export const VehicleInspectionPanel: React.FC<VehicleInspectionPanelProps> = ({
  mileage,
  onMileageChange,
  mileageUnit = 'km',
  onMileageUnitChange,
  lastRecordedMileage,
  fuelPercentage,
  fuelLevel,
  onFuelChange,
  belongings,
  onBelongingsChange,
  notes,
  onNotesChange,
}) => {
  const [unit, setUnit] = useState<'km' | 'mi'>(mileageUnit);

  const handleUnitToggle = (newUnit: 'km' | 'mi') => {
    setUnit(newUnit);
    if (onMileageUnitChange) onMileageUnitChange(newUnit);
  };

  const handleStepMileage = (increment: number) => {
    const current = Number(mileage) || 0;
    onMileageChange(Math.max(0, current + increment));
  };

  const handlePresetFuel = (preset: typeof FUEL_PRESETS[0]) => {
    onFuelChange(preset.pct, preset.badge);
  };

  const handleSliderFuel = (val: number) => {
    let label = 'Personalizado';
    if (val <= 10) label = 'Reserva Crítica';
    else if (val <= 35) label = '1/4 Tanque';
    else if (val <= 65) label = '1/2 Tanque';
    else if (val <= 85) label = '3/4 Tanque';
    else label = 'Tanque Lleno';

    onFuelChange(val, label);
  };

  const toggleBelonging = (itemLabel: string) => {
    if (belongings.includes(itemLabel)) {
      onBelongingsChange(belongings.filter(b => b !== itemLabel));
    } else {
      onBelongingsChange([...belongings, itemLabel]);
    }
  };

  // Determine liquid bar gradient & badge
  const getFuelColor = (pct: number) => {
    if (pct <= 15) return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
    if (pct <= 40) return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
    if (pct <= 70) return 'linear-gradient(90deg, #eab308 0%, #10b981 100%)';
    return 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
  };

  const getFuelBadgeInfo = () => {
    if (fuelPercentage <= 15) return { text: fuelLevel || 'Reserva Crítica', type: 'danger' };
    if (fuelPercentage <= 40) return { text: fuelLevel || '1/4 Tanque', type: 'warning' };
    if (fuelPercentage <= 70) return { text: fuelLevel || '1/2 Tanque', type: 'info' };
    return { text: fuelLevel || 'Tanque Lleno', type: 'success' };
  };

  const badgeInfo = getFuelBadgeInfo();

  return (
    <div className="vip-container">
      {/* 2-COL METRICS: KILOMETRAJE + NIVEL DE GASOLINA */}
      <div className="vip-metrics-grid">
        
        {/* --- CARD 1: KILOMETRAJE --- */}
        <div className="vip-card">
          <div className="vip-card-header">
            <div className="vip-card-title">
              <Gauge size={18} />
              <span>Kilometraje (Odómetro)</span>
            </div>
            <div className="vip-unit-toggle">
              <button
                type="button"
                className={`vip-unit-btn ${unit === 'km' ? 'active' : ''}`}
                onClick={() => handleUnitToggle('km')}
              >
                KM
              </button>
              <button
                type="button"
                className={`vip-unit-btn ${unit === 'mi' ? 'active' : ''}`}
                onClick={() => handleUnitToggle('mi')}
              >
                MI
              </button>
            </div>
          </div>

          <div className="vip-odometer-box">
            <input
              type="number"
              className="vip-odometer-input"
              placeholder="0"
              value={mileage}
              min="0"
              step="100"
              onChange={(e) => onMileageChange(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              {unit.toUpperCase()}
            </span>
          </div>

          <div className="vip-quick-steps">
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Rápidos:</span>
            <button type="button" className="vip-step-chip" onClick={() => handleStepMileage(500)}>
              +500
            </button>
            <button type="button" className="vip-step-chip" onClick={() => handleStepMileage(1000)}>
              +1,000
            </button>
            <button type="button" className="vip-step-chip" onClick={() => handleStepMileage(5000)}>
              +5,000
            </button>
            {mileage !== '' && Number(mileage) > 0 && (
              <button type="button" className="vip-step-chip" onClick={() => onMileageChange('')}>
                Limpiar
              </button>
            )}
          </div>

          {lastRecordedMileage ? (
            <div className="vip-last-record">
              <span>Último registrado: <strong>{lastRecordedMileage.toLocaleString()} {unit}</strong></span>
              <button
                type="button"
                className="vip-last-record-btn"
                onClick={() => onMileageChange(lastRecordedMileage)}
              >
                (Usar)
              </button>
            </div>
          ) : null}
        </div>

        {/* --- CARD 2: NIVEL DE GASOLINA --- */}
        <div className="vip-card">
          <div className="vip-card-header">
            <div className="vip-card-title">
              <Fuel size={18} />
              <span>Nivel de Combustible</span>
            </div>
            <span className={`vip-badge vip-badge-${badgeInfo.type}`}>
              {badgeInfo.text} ({fuelPercentage}%)
            </span>
          </div>

          {/* Visual Tank Bar */}
          <div className="vip-tank-visual">
            <div className="vip-tank-meter-bar">
              <div 
                className="vip-tank-liquid"
                style={{ 
                  width: `${Math.max(5, fuelPercentage)}%`,
                  background: getFuelColor(fuelPercentage)
                }}
              />
            </div>
            <div className="vip-tank-ticks">
              <span onClick={() => handleSliderFuel(0)}>E (Vacío)</span>
              <span onClick={() => handleSliderFuel(25)}>1/4</span>
              <span onClick={() => handleSliderFuel(50)}>1/2</span>
              <span onClick={() => handleSliderFuel(75)}>3/4</span>
              <span onClick={() => handleSliderFuel(100)}>F (Lleno)</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="vip-fuel-presets">
            {FUEL_PRESETS.map((preset) => {
              const isActive = Math.abs(fuelPercentage - preset.pct) <= 12;
              return (
                <button
                  key={preset.key}
                  type="button"
                  className={`vip-fuel-preset-btn ${preset.classKey} ${isActive ? 'active' : ''}`}
                  onClick={() => handlePresetFuel(preset)}
                >
                  <span className="fp-label">{preset.label}</span>
                  <span className="fp-sub">{preset.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Fine Tuning Slider */}
          <div className="vip-slider-row">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={fuelPercentage}
              onChange={(e) => handleSliderFuel(Number(e.target.value))}
              className="vip-fuel-slider"
            />
            <span className="vip-slider-val">{fuelPercentage}%</span>
          </div>

        </div>

      </div>

      {/* --- INVENTARIO DE PERTENENCIAS / ACCESORIOS --- */}
      <div className="vip-belongings-section">
        <div className="vip-section-label">
          Inventario Rápido de Pertenencias y Accesorios en Vehículo:
        </div>
        <div className="vip-chips-grid">
          {COMMON_BELONGINGS.map((item) => {
            const isSelected = belongings.includes(item.label);
            return (
              <button
                key={item.id}
                type="button"
                className={`vip-chip-item ${isSelected ? 'active' : ''}`}
                onClick={() => toggleBelonging(item.label)}
              >
                <span className="vip-chip-icon">{item.icon}</span>
                <span>{item.label}</span>
                {isSelected && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- OBSERVACIONES ADICIONALES --- */}
      <div className="vip-notes-group">
        <label className="vip-section-label">
          Observaciones Adicionales de Ingreso:
        </label>
        <textarea
          className="vip-notes-input"
          placeholder="Ej: Vehículo recibido en grúa con falla de encendido. Presenta rayón previo en guardafango derecho..."
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

    </div>
  );
};
