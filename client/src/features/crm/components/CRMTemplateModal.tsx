import React, { useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { useCRMStore, CRMTemplate } from '../../../store/useCRMStore';
import { Sparkles, Copy, Check } from 'lucide-react';

interface CRMTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: CRMTemplate | null;
}

export const CRMTemplateModal: React.FC<CRMTemplateModalProps> = ({
  isOpen,
  onClose,
  initialTemplate,
}) => {
  const { addTemplate, updateTemplate } = useCRMStore();

  const [title, setTitle] = useState(initialTemplate?.title || '');
  const [category, setCategory] = useState<CRMTemplate['category']>(initialTemplate?.category || 'MANTENIMIENTO');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [template, setTemplate] = useState(initialTemplate?.template || '');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const variables = [
    { tag: '[nombre]', desc: 'Nombre del cliente' },
    { tag: '[vehiculo]', desc: 'Marca y modelo del auto' },
    { tag: '[placa]', desc: 'Placa / Patente' },
    { tag: '[servicio]', desc: 'Servicio sugerido o realizado' },
    { tag: '[ultimo_servicio]', desc: 'Fecha de última visita' },
    { tag: '[nombre_taller]', desc: 'Nombre de tu taller' },
    { tag: '[telefono_taller]', desc: 'Teléfono de contacto' },
  ];

  const handleInsertVar = (tag: string) => {
    setTemplate((prev) => prev + ' ' + tag + ' ');
    setCopiedVar(tag);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !template.trim()) {
      return alert('Por favor completa el título y el cuerpo del mensaje.');
    }

    if (initialTemplate) {
      updateTemplate(initialTemplate.id, {
        title,
        category,
        description,
        template,
      });
    } else {
      addTemplate({
        title,
        category,
        description,
        template,
      });
    }

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialTemplate ? 'Editar Plantilla de WhatsApp' : 'Nueva Plantilla de WhatsApp'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Título de la Plantilla</label>
          <input
            type="text"
            required
            placeholder="Ej: 🛢️ Recordatorio de 5.000 KM"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
            >
              <option value="MANTENIMIENTO">🛢️ Mantenimiento Preventivo</option>
              <option value="COTIZACION">📋 Cotización / Presupuesto</option>
              <option value="POST_VENTA">⭐ Post-Venta & Calidad</option>
              <option value="RECORDATORIO">⏰ Recordatorio / Cobranza</option>
              <option value="CUMPLEANOS">🎂 Cumpleaños y Promos</option>
              <option value="GENERAL">💬 General / Notificación</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Descripción Breve</label>
            <input
              type="text"
              placeholder="Cuándo se recomienda usar este mensaje"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}
            />
          </div>
        </div>

        <div style={{ padding: '12px', background: 'var(--color-bg-subtle, rgba(0,0,0,0.03))', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#3b82f6" /> Variables dinámicas (haz clic para insertar en el texto):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {variables.map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => handleInsertVar(v.tag)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-surface)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-primary)',
                }}
                title={v.desc}
              >
                {copiedVar === v.tag ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                <code>{v.tag}</code>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Mensaje de WhatsApp</label>
          <textarea
            rows={5}
            required
            placeholder="Escribe el mensaje aquí. Puedes usar emojis y las variables automáticas..."
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', fontSize: '13px', lineHeight: '1.5' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            {initialTemplate ? 'Guardar Plantilla' : 'Crear Plantilla'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
