import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Sparkles, AlertTriangle, Info, Bell, X } from 'lucide-react';
import './BroadcastBanner.css';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

export const BroadcastBanner: React.FC = () => {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('rumilcar_dismissed_announcements') || '[]');
  });

  const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
  };

  useEffect(() => {
    // Only fetch for workshop sessions (or impersonated sessions)
    if (!user) return;

    fetch(`${getApiUrl()}/subscriptions/announcements`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('rumilcar_dismissed_announcements', JSON.stringify(updated));
  };

  const activeVisible = announcements.filter((a) => !dismissedIds.includes(a.id));

  if (activeVisible.length === 0) return null;

  return (
    <div className="broadcast-banners-wrapper">
      {activeVisible.map((a) => {
        const isWarning = a.type === 'WARNING';
        const isPromo = a.type === 'PROMO';
        const isUpdate = a.type === 'UPDATE';

        return (
          <div
            key={a.id}
            className={`broadcast-banner-item ${
              isWarning ? 'bb-warning' : isPromo ? 'bb-promo' : isUpdate ? 'bb-update' : 'bb-info'
            }`}
          >
            <div className="bb-left">
              <div className="bb-icon">
                {isWarning ? (
                  <AlertTriangle size={18} />
                ) : isPromo ? (
                  <Sparkles size={18} />
                ) : isUpdate ? (
                  <Bell size={18} />
                ) : (
                  <Info size={18} />
                )}
              </div>
              <div className="bb-content">
                <strong>{a.title}:</strong> {a.message}
              </div>
            </div>

            <button
              className="bb-close-btn"
              onClick={() => handleDismiss(a.id)}
              aria-label="Cerrar comunicado"
              title="Descartar aviso"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
