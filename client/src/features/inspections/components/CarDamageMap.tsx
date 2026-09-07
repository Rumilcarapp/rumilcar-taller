import React, { useState, useRef } from 'react';
import { DamageMark } from '../../../store/useInspectionStore';
import { X } from 'lucide-react';
import './CarDamageMap.css';

interface Props {
  damages: DamageMark[];
  onChange: (damages: DamageMark[]) => void;
  readOnly?: boolean;
}

export const CarDamageMap: React.FC<Props> = ({ damages, onChange, readOnly = false }) => {
  const [popover, setPopover] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (!mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Convert to percentage
    const x = Math.round((px / rect.width) * 100);
    const y = Math.round((py / rect.height) * 100);

    setPopover({ x, y, px, py });
  };

  const handleAddMark = (type: 'R' | 'A' | 'G') => {
    if (!popover) return;
    const newMark: DamageMark = {
      id: 'DM-' + Date.now().toString().slice(-6),
      x: popover.x,
      y: popover.y,
      type
    };
    onChange([...damages, newMark]);
    setPopover(null);
  };

  const handleRemoveMark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    onChange(damages.filter(d => d.id !== id));
  };

  const typeLabels = { R: 'Rayón', A: 'Abolladura', G: 'Golpe' };
  const typeColors = { R: '#ef4444', A: '#f59e0b', G: '#3b82f6' };

  return (
    <div className="car-damage-map-container">
      <div 
        className="car-damage-map" 
        ref={mapRef} 
        onClick={handleMapClick}
        style={{ position: 'relative', width: '100%', height: '320px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: readOnly ? 'default' : 'crosshair', overflow: 'hidden' }}
      >
        {/* Car SVG Outline */}
        <svg viewBox="0 0 500 320" style={{ width: '100%', height: '100%', pointerEvents: 'none', stroke: 'var(--color-text-secondary)', fill: 'none', strokeWidth: 1.2 }}>
          {/* 1. Top View Outline (Vista Superior Sedan) */}
          <g>
            {/* Body Outer Shell */}
            <path d="M 180,50 C 180,44 190,40 210,40 L 290,40 C 310,40 320,44 320,50 L 325,55 C 328,60 328,90 325,95 L 320,100 C 320,106 310,110 290,110 L 210,110 C 190,110 180,106 180,100 Z" fill="rgba(0,0,0,0.01)" />
            {/* Windshield */}
            <path d="M 265,45 L 280,53 L 280,97 L 265,105 Z" />
            {/* Rear Window */}
            <path d="M 208,46 L 223,53 L 223,97 L 208,104 Z" />
            {/* Roof area */}
            <path d="M 223,44 L 265,44 L 265,106 L 223,106 Z" />
            {/* Hood (Bonete) lines */}
            <path d="M 280,53 L 315,53 C 320,53 320,55 320,58" />
            <path d="M 280,97 L 315,97 C 320,97 320,95 320,92" />
            {/* Trunk Deck (Maleta) */}
            <path d="M 208,53 L 185,53 Q 183,70 185,87 L 208,87" />
            
            {/* Tires */}
            <rect x="192" y="34" width="22" height="6" rx="2" style={{ fill: 'var(--color-text-muted)', stroke: 'none' }} />
            <rect x="192" y="110" width="22" height="6" rx="2" style={{ fill: 'var(--color-text-muted)', stroke: 'none' }} />
            <rect x="282" y="34" width="22" height="6" rx="2" style={{ fill: 'var(--color-text-muted)', stroke: 'none' }} />
            <rect x="282" y="110" width="22" height="6" rx="2" style={{ fill: 'var(--color-text-muted)', stroke: 'none' }} />
            
            {/* Side Mirrors */}
            <path d="M 270,40 L 266,32 Q 273,30 274,34 Z" style={{ fill: 'var(--color-text-secondary)', stroke: 'none' }} />
            <path d="M 270,110 L 266,118 Q 273,120 274,116 Z" style={{ fill: 'var(--color-text-secondary)', stroke: 'none' }} />
          </g>

          {/* 2. Vista Lateral Izquierda (Left Side View Sedan - Front Left, Rear Right) */}
          <g>
            {/* Sedan Body Profile */}
            <path d="M 50,165 C 50,158 55,153 65,153 L 95,153 C 98,153 102,148 106,140 L 120,120 C 125,115 135,115 155,115 L 170,115 C 178,115 181,118 184,124 L 194,142 C 196,145 197,145 200,145 L 210,145 C 213,145 214,147 214,152 L 212,165 L 50,165 Z" fill="rgba(0,0,0,0.01)" />
            {/* Windows */}
            <path d="M 120,122 L 150,122 L 150,143 L 110,143 Z" />
            <path d="M 154,122 L 173,122 L 181,143 L 154,143 Z" />
            {/* Tires & Rims */}
            <circle cx="79" cy="165" r="11" style={{ fill: '#333', stroke: 'var(--color-text-secondary)', strokeWidth: 1 }} />
            <circle cx="79" cy="165" r="5" style={{ fill: '#ccc' }} />
            <circle cx="169" cy="165" r="11" style={{ fill: '#333', stroke: 'var(--color-text-secondary)', strokeWidth: 1 }} />
            <circle cx="169" cy="165" r="5" style={{ fill: '#ccc' }} />
            {/* Wheel arches */}
            <path d="M 65,165 A 14,14 0 0 1 93,165" />
            <path d="M 155,165 A 14,14 0 0 1 183,165" />
            {/* Headlight L */}
            <path d="M 50,156 H 55 V 160 H 50 Z" style={{ fill: 'yellow', stroke: 'none' }} />
            {/* Taillight R */}
            <path d="M 210,146 H 214 V 152 H 210 Z" style={{ fill: '#ef4444', stroke: 'none' }} />
          </g>

          {/* 3. Vista Lateral Derecha (Right Side View Sedan - Front Right, Rear Left) */}
          <g>
            {/* Sedan Body Profile */}
            <path d="M 450,165 C 450,158 445,153 435,153 L 405,153 C 402,153 398,148 394,140 L 380,120 C 375,115 365,115 345,115 L 330,115 C 322,115 319,118 316,124 L 306,142 C 304,145 303,145 300,145 L 290,145 C 287,145 286,147 286,152 L 288,165 L 450,165 Z" fill="rgba(0,0,0,0.01)" />
            {/* Windows */}
            <path d="M 380,122 L 350,122 L 350,143 L 390,143 Z" />
            <path d="M 346,122 L 327,122 L 319,143 L 346,143 Z" />
            {/* Tires & Rims */}
            <circle cx="421" cy="165" r="11" style={{ fill: '#333', stroke: 'var(--color-text-secondary)', strokeWidth: 1 }} />
            <circle cx="421" cy="165" r="5" style={{ fill: '#ccc' }} />
            <circle cx="331" cy="165" r="11" style={{ fill: '#333', stroke: 'var(--color-text-secondary)', strokeWidth: 1 }} />
            <circle cx="331" cy="165" r="5" style={{ fill: '#ccc' }} />
            {/* Wheel arches */}
            <path d="M 407,165 A 14,14 0 0 1 435,165" />
            <path d="M 317,165 A 14,14 0 0 1 345,165" />
            {/* Headlight R */}
            <path d="M 450,156 H 445 V 160 H 450 Z" style={{ fill: 'yellow', stroke: 'none' }} />
            {/* Taillight L */}
            <path d="M 290,146 H 286 V 152 H 290 Z" style={{ fill: '#ef4444', stroke: 'none' }} />
          </g>

          {/* 4. Front View Outline (Frente) */}
          <g transform="translate(10, 20)">
            {/* Cabin */}
            <path d="M 52,210 L 88,210 L 93,230 L 47,230 Z" />
            {/* Front Grill */}
            <rect x="35" y="230" width="70" height="32" rx="6" fill="rgba(0,0,0,0.01)" />
            {/* Headlights */}
            <rect x="38" y="235" width="12" height="7" rx="2" style={{ fill: '#fef08a', stroke: 'var(--color-text-secondary)' }} />
            <rect x="90" y="235" width="12" height="7" rx="2" style={{ fill: '#fef08a', stroke: 'var(--color-text-secondary)' }} />
            {/* Radiator Grille */}
            <rect x="54" y="236" width="32" height="6" rx="1" />
            <line x1="62" y1="236" x2="62" y2="242" />
            <line x1="70" y1="236" x2="70" y2="242" />
            <line x1="78" y1="236" x2="78" y2="242" />
            {/* Bumper line */}
            <rect x="32" y="254" width="76" height="5" rx="2" style={{ fill: 'var(--color-text-muted)' }} />
            {/* Bottom tires */}
            <rect x="38" y="259" width="10" height="6" rx="1" style={{ fill: 'black', stroke: 'none' }} />
            <rect x="92" y="259" width="10" height="6" rx="1" style={{ fill: 'black', stroke: 'none' }} />
          </g>

          {/* 5. Rear View Outline (Trasera) */}
          <g transform="translate(-10, 20)">
            {/* Cabin rear window */}
            <path d="M 292,210 L 328,210 L 333,230 L 287,230 Z" />
            {/* Rear trunk panel */}
            <rect x="275" y="230" width="70" height="32" rx="6" fill="rgba(0,0,0,0.01)" />
            {/* Taillights */}
            <rect x="278" y="234" width="14" height="6" rx="1" style={{ fill: '#ef4444', stroke: 'none' }} />
            <rect x="328" y="234" width="14" height="6" rx="1" style={{ fill: '#ef4444', stroke: 'none' }} />
            {/* License plate */}
            <rect x="298" y="242" width="24" height="8" rx="1" />
            <line x1="304" y1="246" x2="316" y2="246" strokeWidth="0.5" />
            {/* Rear bumper */}
            <rect x="272" y="254" width="76" height="5" rx="2" style={{ fill: 'var(--color-text-muted)' }} />
            {/* Bottom tires */}
            <rect x="278" y="259" width="10" height="6" rx="1" style={{ fill: 'black', stroke: 'none' }} />
            <rect x="332" y="259" width="10" height="6" rx="1" style={{ fill: 'black', stroke: 'none' }} />
          </g>

          {/* Labels for parts of SVG */}
          <text x="250" y="20" textAnchor="middle" style={{ fontSize: '10px', fill: 'var(--color-text-muted)', stroke: 'none', fontWeight: 600 }}>Vista Superior</text>
          <text x="125" y="112" textAnchor="middle" style={{ fontSize: '10px', fill: 'var(--color-text-muted)', stroke: 'none', fontWeight: 600 }}>Lateral Izquierdo</text>
          <text x="375" y="112" textAnchor="middle" style={{ fontSize: '10px', fill: 'var(--color-text-muted)', stroke: 'none', fontWeight: 600 }}>Lateral Derecho</text>
          <text x="80" y="282" textAnchor="middle" style={{ fontSize: '10px', fill: 'var(--color-text-muted)', stroke: 'none', fontWeight: 600 }}>Frente</text>
          <text x="320" y="282" textAnchor="middle" style={{ fontSize: '10px', fill: 'var(--color-text-muted)', stroke: 'none', fontWeight: 600 }}>Trasera</text>
        </svg>

        {/* Damage Indicators */}
        {damages.map(mark => (
          <div
            key={mark.id}
            className="damage-indicator-dot"
            style={{ 
              position: 'absolute', 
              left: `${mark.x}%`, 
              top: `${mark.y}%`, 
              transform: 'translate(-50%, -50%)',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: typeColors[mark.type],
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              cursor: readOnly ? 'default' : 'pointer'
            }}
            title={`${typeLabels[mark.type]} (Haz clic para eliminar)`}
            onClick={(e) => handleRemoveMark(mark.id, e)}
          >
            {mark.type}
          </div>
        ))}

        {/* Add Damage Popover Menu */}
        {popover && (
          <div 
            className="damage-popover-menu"
            style={{ 
              position: 'absolute', 
              left: `${popover.x}%`, 
              top: `${popover.y}%`,
              transform: popover.x > 70 ? 'translate(-100%, -50%)' : 'translate(10px, -50%)',
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '6px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '110px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)' }}>TIPO DE DAÑO</span>
              <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', padding: 0 }} onClick={() => setPopover(null)}>
                <X size={10} color="var(--color-text-muted)" />
              </button>
            </div>
            <button className="popover-btn r-type" onClick={() => handleAddMark('R')}>Rayón (R)</button>
            <button className="popover-btn a-type" onClick={() => handleAddMark('A')}>Abolladura (A)</button>
            <button className="popover-btn g-type" onClick={() => handleAddMark('G')}>Golpe (G)</button>
          </div>
        )}
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></span> Rayón (R)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }}></span> Abolladura (A)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></span> Golpe (G)</span>
        </div>
      )}
    </div>
  );
};