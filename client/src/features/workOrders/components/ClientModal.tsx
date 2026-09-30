import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { useClientStore } from '../../../store/useClientStore';
import { capitalizeWords } from '../../../lib/stringUtils';
import './Modals.css';

interface ClientModalProps {
  onClose: () => void;
  onSave?: (client: any) => void;
  initialName?: string;
}

export const ClientModal: React.FC<ClientModalProps> = ({ onClose, onSave, initialName }) => {
  const [type, setType] = useState<'persona' | 'empresa'>('persona');
  const initialParts = (initialName || '').trim().split(/\s+/);
  const initialFirstName = initialParts[0] ? capitalizeWords(initialParts[0]) : '';
  const initialLastName = initialParts.slice(1).join(' ') ? capitalizeWords(initialParts.slice(1).join(' ')) : '';

  const [nombre, setNombre] = useState(type === 'persona' && initialParts.length > 1 ? initialFirstName : (initialName ? capitalizeWords(initialName) : ''));
  const [apellido, setApellido] = useState(type === 'persona' && initialParts.length > 1 ? initialLastName : '');
  const [docPrefix, setDocPrefix] = useState('V-');
  const [docNumber, setDocNumber] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (nombre.trim().length < 2) newErrors.nombre = 'Minimo 2 caracteres';
    if (type === 'persona' && apellido.trim().length < 2) newErrors.apellido = 'Minimo 2 caracteres';
    
    if (docPrefix !== 'OTRO' && !/^[0-9]+$/.test(docNumber)) {
      newErrors.docNumber = 'Solo numeros permitidos';
    } else if (!docNumber.trim()) {
      newErrors.docNumber = 'Obligatorio';
    }

    if (telefono.replace(/[^0-9]/g, '').length < 7) {
      newErrors.telefono = 'Faltan digitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      const cleanNombre = capitalizeWords(nombre.trim());
      const cleanApellido = type === 'persona' ? capitalizeWords(apellido.trim()) : '';
      const clientData = { 
        id: 'CLI-' + Date.now().toString().slice(-6), 
        type, 
        nombre: cleanNombre, 
        apellido: cleanApellido, 
        documento: docPrefix + docNumber.trim(), 
        telefono: telefono.trim(), 
        direccion: direccion.trim() 
      };
      useClientStore.getState().addClient(clientData);
      if (onSave) onSave(clientData);
      onClose();
    }
  };

  return (
    <Modal isOpen={true} title="Nuevo Cliente" onClose={onClose} footer={
      <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={handleSave}>Guardar</Button>
      </div>
    }>
      <div className="modal-form">
        <div className="radio-group" style={{ display: 'flex', gap: '16px' }}>
          <label className="radio-label" style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="clientType" 
              value="persona" 
              checked={type === 'persona'} 
              onChange={() => setType('persona')} 
            />
            PERSONA NATURAL
          </label>
          <label className="radio-label" style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="clientType" 
              value="empresa" 
              checked={type === 'empresa'} 
              onChange={() => setType('empresa')} 
            />
            EMPRESA / AUTONOMO
          </label>
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group flex-1">
            <label>{type === 'persona' ? 'Nombre' : 'Razon Social'}</label>
            <input 
              className={`custom-input ${errors.nombre ? 'has-error' : ''}`}
              value={nombre}
              onChange={e => setNombre(capitalizeWords(e.target.value))}
              onBlur={() => setNombre(capitalizeWords(nombre.trim()))}
              placeholder={type === 'persona' ? 'Ej: Juan Carlos' : 'Ej: Inversiones El Motor C.A.'}
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              style={{ textTransform: 'capitalize' }}
            />
            {errors.nombre && <span className="error-text">{errors.nombre}</span>}
          </div>
          {type === 'persona' && (
            <div className="form-group flex-1">
              <label>Apellido</label>
              <input 
                className={`custom-input ${errors.apellido ? 'has-error' : ''}`}
                value={apellido}
                onChange={e => setApellido(capitalizeWords(e.target.value))}
                onBlur={() => setApellido(capitalizeWords(apellido.trim()))}
                placeholder="Ej: Pérez Rodríguez"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                style={{ textTransform: 'capitalize' }}
              />
              {errors.apellido && <span className="error-text">{errors.apellido}</span>}
            </div>
          )}
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group flex-1">
            <label>Cedula / RIF</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <select 
                className="custom-input" 
                style={{ width: '80px', padding: '0 8px' }}
                value={docPrefix}
                onChange={e => setDocPrefix(e.target.value)}
              >
                <option value="V-">V-</option>
                <option value="E-">E-</option>
                <option value="J-">J-</option>
                <option value="G-">G-</option>
                <option value="OTRO">OTRO</option>
              </select>
              <input 
                className={`custom-input flex-1 ${errors.docNumber ? 'has-error' : ''}`}
                value={docNumber}
                onChange={e => setDocNumber(e.target.value)}
                placeholder="19456789"
              />
            </div>
            {errors.docNumber && <span className="error-text">{errors.docNumber}</span>}
          </div>

          <div className="form-group flex-1">
            <label>Telefono</label>
            <div style={{ display: 'flex' }}>
              <div style={{ padding: '8px 12px', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRight: 0, borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', color: 'var(--color-text-secondary)' }}>
                +58
              </div>
              <input 
                className={`custom-input flex-1 ${errors.telefono ? 'has-error' : ''}`}
                style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="4141234567"
              />
            </div>
            {errors.telefono && <span className="error-text">{errors.telefono}</span>}
          </div>
        </div>

        <div className="form-group">
          <label>Direccion</label>
          <input 
            className="custom-input"
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            placeholder="Ej: La Candelaria, Caracas"
          />
        </div>
      </div>
    </Modal>
  );
};