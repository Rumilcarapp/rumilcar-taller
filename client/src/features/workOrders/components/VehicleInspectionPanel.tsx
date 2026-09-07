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

const COMMON_BELONGINGS = [
  { id: 'caucho', label: 'Caucho de repuesto', icon: '🛞' },
  { id: 'gato', label: 'Gato y palanca', icon: '🔩' },
  { id: 'llave', label: 'Llave de cruz', icon: '✝️' },
  { id: 'docs', label: 'Documentos / Carnet', icon: '📑' },
  { id: 'herramientas', label: 'Herramientas', icon: '🧰' },
  { id: 'frontal', label: 'Frontal / Pantalla', icon: '📻' },
  { id: 'cables', label: 'Cables auxiliares', icon: '🔋' },
  { id: 'triangulo', label: 'Triángulo de seguridad', icon: '🔺' },
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
