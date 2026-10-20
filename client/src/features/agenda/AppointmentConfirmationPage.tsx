import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Wrench, 
  Car, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle, 
  Navigation,
  ShieldCheck,
  Send,
  Loader2
} from 'lucide-react';
import { getApiUrl } from '../../services/api';
import { useAppointmentStore } from '../../store/useAppointmentStore';
import { useVehicleStore } from '../../store/useVehicleStore';
import './AppointmentConfirmationPage.css';

export const AppointmentConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);

  // Editable vehicle fields
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadAppointment = async () => {
      if (!id) {
        setError('Enlace de cita no válido.');
        setLoading(false);
        return;
      }

      try {
        const baseUrl = getApiUrl().replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/appointments/public/${id}`);

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setAppointment(data);
            if (data.vehicle) {
              setMake(data.vehicle.make || '');
              setModel(data.vehicle.model || '');
              setYear(data.vehicle.year ? String(data.vehicle.year) : '');
              setLicensePlate(data.vehicle.licensePlate || '');
              setColor(data.vehicle.color || '');
            }
            if (data.status === 'CONFIRMED') {
              setSuccess(true);
            }
            setLoading(false);
          }
          return;
        }
      } catch (err) {
        console.warn('Network error loading remote appointment, falling back to local store', err);
      }

      // Offline / Local fallback
      const localApt = useAppointmentStore.getState().appointments.find(a => a.id === id);
      if (localApt && isMounted) {
        setAppointment({
          id: localApt.id,
          startAt: localApt.startAt,
          endAt: localApt.endAt,
          serviceMotif: localApt.service,
          modality: localApt.modality,
          status: localApt.status,
          internalNotes: localApt.internalNotes,
          client: { name: localApt.clientName },
          workshop: { name: 'Rumilcar Taller Mecánico' },
        });

        // Parse vehicle description if possible
        if (localApt.vehicleDesc) {
          const parts = localApt.vehicleDesc.split('-');
          const plate = parts.length > 1 ? parts[parts.length - 1].trim() : '';
          const makeModel = parts[0].trim().split(' ');
          setMake(makeModel[0] || '');
          setModel(makeModel.slice(1).join(' ') || '');
          setLicensePlate(plate);
        }

        if (localApt.status === 'CONFIRMED') {
          setSuccess(true);
        }
        setLoading(false);
        return;
      }

      if (isMounted) {
        setError('No encontramos la cita solicitada. Es posible que haya sido modificada o reprogramada.');
        setLoading(false);
      }
    };

    loadAppointment();
    return () => { isMounted = false; };
  }, [id]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      make: make.trim(),
      model: model.trim(),
      year: year ? parseInt(year, 10) : undefined,
      licensePlate: licensePlate.trim().toUpperCase(),
      color: color.trim(),
      clientNotes: clientNotes.trim(),
    };

    try {
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/appointments/public/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setAppointment(data.appointment || appointment);
        setSuccess(true);

        // Also update local store if present
        useAppointmentStore.getState().updateAppointment(id, {
          status: 'CONFIRMED',
          vehicleDesc: `${payload.make} ${payload.model}${payload.licensePlate ? ' - ' + payload.licensePlate : ''}`.trim(),
        });

        setSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn('API error confirming, updating local state directly', err);
    }

    // Local fallback confirmation
    useAppointmentStore.getState().updateAppointment(id, {
      status: 'CONFIRMED',
      vehicleDesc: `${payload.make || 'Vehículo'} ${payload.model || ''}${payload.licensePlate ? ' - ' + payload.licensePlate : ''}`.trim(),
    });

    setAppointment((prev: any) => ({ ...prev, status: 'CONFIRMED' }));
    setSuccess(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="apt-confirm-page">
        <div className="apt-loading-state">
          <div className="apt-spinner" />
          <p>Cargando información de tu cita...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="apt-confirm-page">
        <div className="apt-confirm-container">
          <div className="apt-confirm-header">
            <div className="apt-confirm-brand-icon"><Wrench size={26} /></div>
            <h1 className="apt-confirm-workshop-name">Rumilcar Taller Mecánico</h1>
          </div>
          <div className="apt-card apt-error-state">
            <AlertCircle size={44} color="#f87171" />
            <h3>No pudimos cargar la cita</h3>
            <p>{error || 'El identificador de cita no es válido o ha expirado.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const workshopName = appointment.workshop?.name || 'Rumilcar Taller Mecánico';
  const workshopPhone = appointment.workshop?.phone || '584141234567';
  const clientName = appointment.client?.name || 'Estimado(a) Cliente';

  // Format date and time
  const startDate = appointment.startAt ? new Date(appointment.startAt) : new Date();
  const dateFormatted = startDate.toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = startDate.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isConfirmed = appointment.status === 'CONFIRMED' || success;

  return (
    <div className="apt-confirm-page">
      <div className="apt-confirm-container">
        
        {/* Brand Header */}
        <div className="apt-confirm-header">
          {appointment.workshop?.logoUrl ? (
            <img src={appointment.workshop.logoUrl} alt={workshopName} className="apt-confirm-logo" />
          ) : (
            <div className="apt-confirm-brand-icon"><Wrench size={26} /></div>
          )}
          <h1 className="apt-confirm-workshop-name">{workshopName}</h1>
          <p className="apt-confirm-tagline">Portal de Recepción y Agendamiento Online</p>
        </div>

        {/* Status Banner */}
        <div className={`apt-status-banner ${isConfirmed ? 'confirmed' : 'pending'}`}>
          {isConfirmed ? (
            <>
              <CheckCircle2 size={20} />
              <span>Cita Confirmada con el Taller</span>
            </>
          ) : (
            <>
              <Clock size={20} />
              <span>Cita Agendada - Pendiente de tu Confirmación</span>
            </>
          )}
        </div>

        {/* Success Confirmation Card if already submitted */}
        {success && (
          <div className="apt-card apt-success-card">
            <div className="apt-success-icon">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="apt-success-title">¡Gracias, {clientName.split(' ')[0]}!</h2>
            <p className="apt-success-desc">
              Tu asistencia y los datos de tu vehículo han quedado registrados exitosamente. Te esperamos el <strong>{dateFormatted}</strong> a las <strong>{timeFormatted}</strong>.
            </p>
            <a
              href={`https://wa.me/${workshopPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola, confirmo mi asistencia a la cita para el ${dateFormatted} (${timeFormatted}). ¡Gracias!`)}`}
              target="_blank"
              rel="noreferrer"
              className="apt-whatsapp-contact-btn"
            >
              <MessageCircle size={18} />
              Escribir al WhatsApp del Taller
            </a>
          </div>
        )}

        {/* Appointment Details Card */}
        <div className="apt-card">
          <h3 className="apt-card-title"><Calendar size={18} /> Resumen de tu Turno</h3>
          
          <div className="apt-info-grid">
            <div className="apt-info-item full-width">
              <span className="apt-info-label">Cliente</span>
              <span className="apt-info-value"><User size={15} /> {clientName}</span>
            </div>

            <div className="apt-info-item">
              <span className="apt-info-label">Fecha del Turno</span>
              <span className="apt-info-value highlight">{dateFormatted}</span>
            </div>

            <div className="apt-info-item">
              <span className="apt-info-label">Hora de Ingreso</span>
              <span className="apt-info-value highlight"><Clock size={15} /> {timeFormatted}</span>
            </div>

            <div className="apt-info-item full-width">
              <span className="apt-info-label">Servicio Solicitado</span>
              <span className="apt-info-value"><Wrench size={15} /> {appointment.serviceMotif || 'Revisión General'}</span>
            </div>

            {appointment.workshop?.address && (
              <div className="apt-info-item full-width">
                <span className="apt-info-label">Ubicación del Taller</span>
                <span className="apt-info-value"><Navigation size={15} /> {appointment.workshop.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Data Form */}
        <form onSubmit={handleConfirm} className="apt-card">
          <h3 className="apt-card-title"><Car size={18} /> Datos de tu Vehículo</h3>
          <p style={{ fontSize: '0.84rem', color: '#9ca3af', marginTop: '-0.5rem', marginBottom: '1.1rem' }}>
            Completa o verifica la placa y modelo para tener tu orden de trabajo lista apenas llegues.
          </p>

          <div className="apt-form-row">
            <div className="apt-form-group">
              <label className="apt-form-label">Marca</label>
              <input
                type="text"
                className="apt-form-input"
                placeholder="Ej. Toyota, Chevrolet, Ford"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
              />
            </div>
            <div className="apt-form-group">
              <label className="apt-form-label">Modelo</label>
              <input
                type="text"
                className="apt-form-input"
                placeholder="Ej. Corolla, Aveo, Explorer"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="apt-form-row">
            <div className="apt-form-group">
              <label className="apt-form-label">Placa / Matrícula</label>
              <input
                type="text"
                className="apt-form-input plate-input"
                placeholder="AB123CD"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="apt-form-group">
              <label className="apt-form-label">Año (Opcional)</label>
              <input
                type="number"
                className="apt-form-input"
                placeholder="2015"
                min="1960"
                max="2030"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <div className="apt-form-group">
            <label className="apt-form-label">Color (Opcional)</label>
            <input
              type="text"
              className="apt-form-input"
              placeholder="Ej. Gris, Blanco, Negro"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>

          <div className="apt-form-group">
            <label className="apt-form-label">Detalles o síntomas a revisar (Opcional)</label>
            <textarea
              className="apt-form-textarea"
              placeholder="Cuéntanos si sientes algún ruido, vibración, falla o detalle especial..."
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={`apt-submit-btn ${isConfirmed ? 'confirmed-btn' : ''}`}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="apt-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                <span>Confirmando cita...</span>
              </>
            ) : isConfirmed ? (
              <>
                <CheckCircle2 size={18} />
                <span>Actualizar Datos de mi Auto</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Confirmar Mi Cita y Guardar Auto</span>
              </>
            )}
          </button>
        </form>

        <div className="apt-footer">
          <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Sistema Oficial de Agendamiento Automotriz • Rumilcar
        </div>

      </div>
    </div>
  );
};
