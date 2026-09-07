import React, { useState } from 'react';
import { Camera, Plus, X } from 'lucide-react';
import './PhotoUploader.css';

export const PhotoUploader: React.FC = () => {
  const [photos, setPhotos] = useState<any[]>([]);

  // Mocking the behavior for the demo
  const addMockPhoto = (label: string) => {
    setPhotos([...photos, { id: Date.now(), label, note: '' }]);
  };

  return (
    <div className="photo-uploader">
      <div className="photo-grid">
        {photos.map((photo, index) => (
          <div key={photo.id} className="photo-card">
            <div className="photo-preview">
              <Camera size={32} className="photo-icon-placeholder" />
              <span className="photo-label">{photo.label}</span>
              <button className="photo-remove" onClick={() => setPhotos(photos.filter(p => p.id !== photo.id))}>
                <X size={16} />
              </button>
            </div>
            <input 
              type="text" 
              className="photo-note-input" 
              placeholder="Anadir nota (ej: rayon)" 
            />
          </div>
        ))}
        
        <button 
          className="photo-add-btn" 
          onClick={() => addMockPhoto(`Foto ${photos.length + 1}`)}
          type="button"
        >
          <Plus size={24} />
          <span>AGREGAR FOTO</span>
        </button>
      </div>
    </div>
  );
};