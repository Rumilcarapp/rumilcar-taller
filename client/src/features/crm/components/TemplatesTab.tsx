import React, { useState } from 'react';
import { Card, Button } from '../../../components/ui';
import { useCRMStore, CRMTemplate } from '../../../store/useCRMStore';
import { Plus, Edit, Trash2, Sparkles, Send } from 'lucide-react';

interface TemplatesTabProps {
  onNewTemplate: () => void;
  onEditTemplate: (tpl: CRMTemplate) => void;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({ onNewTemplate, onEditTemplate }) => {
  const { templates, deleteTemplate } = useCRMStore();
  const [previewTemplateId, setPreviewTemplateId] = useState<string>(templates[0]?.id || 'tpl-mantenimiento-aceite');

  const curTpl = templates.find((t) => t.id === previewTemplateId) || templates[0];
  const sampleMsg = (curTpl?.template || '')
    .replace(/\[nombre\]/g, 'Carlos Mendoza')
    .replace(/\[vehiculo\]/g, 'Toyota Hilux 2021')
    .replace(/\[placa\]/g, 'AB123CD')
    .replace(/\[servicio\]/g, 'Cambio de Aceite 5.000 KM')
    .replace(/\[ultimo_servicio\]/g, '15/05/2026')
    .replace(/\[nombre_taller\]/g, 'Rumilcar Taller Mecánico')
    .replace(/\[telefono_taller\]/g, '0414-1234567');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Biblioteca de Plantillas</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={onNewTemplate}
            icon={<Plus size={14} />}
          >
            Crear Plantilla
          </Button>
        </div>

        {templates.map((tpl) => (
          <div
            key={tpl.id}
            onClick={() => setPreviewTemplateId(tpl.id)}
            style={{
              padding: '14px',
              borderRadius: '10px',
              border: previewTemplateId === tpl.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: 'var(--color-bg-surface)',
              cursor: 'pointer',
              boxShadow: previewTemplateId === tpl.id ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{tpl.title}</div>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--color-bg-subtle)' }}>
                {tpl.category}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 8px 0' }}>{tpl.description}</p>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{tpl.template}"
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTemplate(tpl);
                }}
                icon={<Edit size={13} />}
              >
                Editar
              </Button>
              {!tpl.isDefault && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('¿Eliminar plantilla?')) deleteTemplate(tpl.id);
                  }}
                  icon={<Trash2 size={13} color="#ef4444" />}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <Card>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="#25D366" /> Simulador de Mensaje en WhatsApp
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#e5ddd5', borderRadius: '16px', padding: '16px', minHeight: '280px', border: '1px solid #c7b9a5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: '#ffffff', borderRadius: '8px 8px 8px 0px', padding: '12px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', fontSize: '13px', lineHeight: '1.45', color: '#111827' }}>
                {sampleMsg}
                <div style={{ textAlign: 'right', fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>
                  10:45 AM ✓✓
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '16px' }}>
                🔒 Vista previa con variables aplicadas (Carlos Mendoza - Toyota Hilux)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="primary"
                style={{ width: '100%', backgroundColor: '#25D366', borderColor: '#25D366', color: '#ffffff' }}
                icon={<Send size={16} />}
                onClick={() => {
                  const samplePhone = '04141234567';
                  window.open('https://wa.me/58' + samplePhone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(sampleMsg), '_blank');
                }}
              >
                Probar Envío de Prueba
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
