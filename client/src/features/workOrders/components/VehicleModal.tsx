import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { useVehicleStore } from '../../../store/useVehicleStore';
import { useClientStore } from '../../../store/useClientStore';
import './Modals.css';

interface VehicleModalProps {
  onClose: () => void;
  onSave?: (vehicle: any) => void;
  initialPlaca?: string;
  ownerDocumento?: string;
}

const commonBrands = ['Toyota', 'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Nissan', 'Honda', 'Mitsubishi', 'Jeep', 'RAM', 'Mercedes-Benz', 'BMW', 'Volkswagen', 'Renault', 'Mazda', 'Dodge'];
const currentYear = new Date().getFullYear();

export const VehicleModal: React.FC<VehicleModalProps> = ({ onClose, onSave, initialPlaca, ownerDocumento }) => {
  const { clients } = useClientStore();
  const [selectedOwner, setSelectedOwner] = useState(ownerDocumento || '');
  const [placa, setPlaca] = useState((initialPlaca || '').toUpperCase());
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedOwner) {
      newErrors.owner = 'Cliente propietario obligatorio';
    }

    if (!placa.trim()) {
      newErrors.placa = 'Placa obligatoria';
    } else if (!/^[A-Za-z0-9]+$/.test(placa)) {
      newErrors.placa = 'Solo letras y numeros';
    }

    if (!marca.trim()) newErrors.marca = 'Marca obligatoria';
    if (!modelo.trim()) newErrors.modelo = 'Modelo obligatorio';

    if (year) {
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 1970 || y > currentYear) {
        newErrors.year = `Año entre 1970 y ${currentYear}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      const vehicleData = { id: 'VEH-' + Date.now().toString().slice(-6), placa, marca, modelo, ano: year || undefined, color: color || undefined, ownerDocumento: selectedOwner };
      useVehicleStore.getState().addVehicle(vehicleData);
      if (onSave) onSave(vehicleData);
      onClose();
    }
  };

  return (
    <Modal isOpen={true} title="Nuevo Vehiculo" onClose={onClose} footer={
      <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={handleSave}>Guardar</Button>
      </div>
    }>
      <div className="modal-form">
        {!ownerDocumento && (
          <div className="form-group">
            <label>Propietario / Cliente</label>
            <select 
              className={`custom-input ${errors.owner ? 'has-error' : ''}`}
              value={selectedOwner}
              onChange={e => setSelectedOwner(e.target.value)}
            >
              <option value="">-- Seleccionar Cliente --</option>
              {clients.map(c => (
                <option key={c.id} value={c.documento}>
                  {c.nombre} {c.apellido} ({c.documento})
                </option>
              ))}
            </select>
            {errors.owner && <span className="error-text">{errors.owner}</span>}
          </div>
        )}
        <div className="form-group">
          <label>Placa</label>
          <input 
            className={`custom-input ${errors.placa ? 'has-error' : ''}`}
            style={{ textTransform: 'uppercase' }}
            value={placa}
            onChange={e => setPlaca(e.target.value.toUpperCase())}
            placeholder="Ej: ABC123D"
          />
          {errors.placa && <span className="error-text">{errors.placa}</span>}
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group flex-1">
            <label>Marca</label>
            <input 
              className={`custom-input ${errors.marca ? 'has-error' : ''}`}
              list="marcas"
              value={marca}
              onChange={e => setMarca(e.target.value)}
              placeholder="Ej: Toyota"
            />
            <datalist id="marcas">
              {commonBrands.map(b => <option key={b} value={b} />)}
            </datalist>
            {errors.marca && <span className="error-text">{errors.marca}</span>}
          </div>

          <div className="form-group flex-1">
            <label>Modelo</label>
            <input 
              className={`custom-input ${errors.modelo ? 'has-error' : ''}`}
              value={modelo}
              onChange={e => setModelo(e.target.value)}
              disabled={!marca}
              placeholder="Ej: Corolla"
            />
            {errors.modelo && <span className="error-text">{errors.modelo}</span>}
          </div>
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group flex-1">
            <label>Año (Opcional)</label>
            <input 
              type="number"
              className={`custom-input ${errors.year ? 'has-error' : ''}`}
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="2026"
              min={1970}
              max={currentYear}
            />
            {errors.year && <span className="error-text">{errors.year}</span>}
          </div>

          <div className="form-group flex-1">
            <label>Color (Opcional)</label>
            <input 
              className="custom-input"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="Ej: Gris"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};