import React, { useState, useRef } from 'react';
import { Camera, Plus, X, UploadCloud } from 'lucide-react';
import './PhotoUploader.css';

export interface PhotoItem {
  id: string | number;
  label: string;
  url?: string;
  note: string;
}

interface PhotoUploaderProps {
  photos?: PhotoItem[];
  onChange?: (photos: PhotoItem[]) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ photos: externalPhotos, onChange }) => {
  const [internalPhotos, setInternalPhotos] = useState<PhotoItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos = externalPhotos !== undefined ? externalPhotos : internalPhotos;

  const updatePhotos = (newPhotos: PhotoItem[]) => {
    if (onChange) {
      onChange(newPhotos);
    } else {
      setInternalPhotos(newPhotos);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newPhoto: PhotoItem = {
          id: Date.now() + Math.random(),
          label: file.name.replace(/\.[^/.]+$/, '').slice(0, 15) || `Foto ${photos.length + 1}`,
          url,
          note: ''
        };
        updatePhotos([...photos, newPhoto]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (id: string | number) => {
    updatePhotos(photos.filter(p => p.id !== id));
  };

  const handleNoteChange = (id: string | number, note: string) => {
    updatePhotos(photos.map(p => p.id === id ? { ...p, note } : p));
  };

  return (
    <div className="photo-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="photo-grid">
        {photos.map((photo) => (
          <div key={photo.id} className="photo-card">
            <div className="photo-preview">
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <Camera size={32} className="photo-icon-placeholder" />
                  <span className="photo-label">{photo.label}</span>
                </>
              )}
              <button
                className="photo-remove"
                onClick={() => handleRemove(photo.id)}
                type="button"
                title="Eliminar foto"
              >
                <X size={16} />
              </button>
            </div>
            <input 
              type="text" 
              className="photo-note-input" 
              placeholder="Nota (ej: rayón, faro)" 
              value={photo.note}
              onChange={(e) => handleNoteChange(photo.id, e.target.value)}
            />
          </div>
        ))}
        
        <button 
          className="photo-add-btn" 
          onClick={() => fileInputRef.current?.click()}
          type="button"
          title="Tomar o seleccionar foto con cámara o archivo"
        >
          <Camera size={24} />
          <span>AGREGAR FOTO</span>
        </button>
      </div>
    </div>
  );
};