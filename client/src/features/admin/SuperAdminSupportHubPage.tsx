import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Send,
  Building2,
  Phone,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import './SuperAdminSupportHubPage.css';

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
};

const getAuthToken = () => {
  return localStorage.getItem('rumilcar_token') || '';
};

interface SupportTicket {
  id: string;
  workshopId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  message: string;
  adminNotes?: string;
  createdAt: string;
  workshop: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface WorkshopSummary {
  workshopId: string;
  workshopName: string;
  ownerName: string;
  email: string;
  phone?: string;
  plan: string;
  status: string;
  daysRemaining: number;
  dueDate: string;
}

export const SuperAdminSupportHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'whatsapp'>('tickets');

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketAdminNote, setTicketAdminNote] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);

  // WhatsApp Hub state
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('due_reminder');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copiedText, setCopiedText] = useState(false);

  // Notification toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Tickets
  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch(`${getApiUrl()}/subscriptions/admin/support/tickets`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTickets(data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      showToast('error', 'Error al cargar tickets de soporte');
    } finally {
      setLoadingTickets(false);
    }
  };

  // Load Workshops for WhatsApp Hub
  const fetchWorkshops = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/subscriptions/admin/workshops`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const list = (data.data || []).map((w: any) => ({
          workshopId: w.workshopId,
          workshopName: w.workshopName,
          ownerName: w.ownerName,
          email: w.email,
          phone: w.phone,
          plan: w.plan,
          status: w.status,
          daysRemaining: w.daysRemaining,
          dueDate: w.subscriptionEnd ? new Date(w.subscriptionEnd).toLocaleDateString('es-VE') : 'N/D',
        }));
        setWorkshops(list);
        if (list.length > 0 && !selectedWorkshopId) {
          setSelectedWorkshopId(list[0].workshopId);
        }
      }
    } catch (err: any) {
      console.error('Error fetching workshops:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchWorkshops();
  }, []);

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const q = ticketSearch.toLowerCase();
    const matchSearch =
      !q ||
      t.subject.toLowerCase().includes(q) ||
      t.workshop?.name?.toLowerCase().includes(q) ||
      t.userName?.toLowerCase().includes(q) ||
      t.message?.toLowerCase().includes(q);
    return matchStatus && matchPriority && matchSearch;
  });

  const openTicketsCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressTicketsCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedTicketsCount = tickets.filter((t) => t.status === 'RESOLVED').length;

  // Update ticket status
  const handleUpdateTicket = async (ticketId: string, newStatus: string) => {
    setUpdatingTicket(true);
    try {
      const res = await fetch(`${getApiUrl()}/subscriptions/admin/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: ticketAdminNote,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'Ticket actualizado');
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? data.data : t)));
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(data.data);
        }
      } else {
        showToast('error', data.message || 'Error al actualizar ticket');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error al actualizar ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Selected workshop for WhatsApp
  const currentWorkshop = workshops.find((w) => w.workshopId === selectedWorkshopId);

  // Template definitions
  const TEMPLATES: Record<
    string,
    { title: string; category: string; icon: any; buildText: (w: WorkshopSummary) => string }
  > = {
    due_reminder: {
      title: '⏳ Recordatorio Vencimiento (3 Días)',
      category: 'Cobranza Preventiva',
      icon: Clock,
      buildText: (w) =>
        `Hola *${w.ownerName}*, te saluda Luark Padilla de *Rumilcarapp*. Esperamos que tu taller *${w.workshopName}* esté teniendo excelentes resultados con el sistema 🚗🔧.\n\nTe escribimos cordialmente para recordarte que tu suscripción (${w.plan}) vence en *${w.daysRemaining} días* (Fecha: *${w.dueDate}*).\n\nPuedes renovar cómodamente vía:\n• *Pago Móvil Mercantil:* 0412-4217195 | CI: 24.317.195\n• *Binance Pay / Zinli:* luarkpadilla@gmail.com\n\n¿Deseas que te enviemos la cotización para tu renovación mensual o anual? ¡Quedamos atentos a tu orden!`,
    },
    welcome: {
      title: '🚀 Bienvenida & Onboarding',
      category: 'Fidelización',
      icon: Sparkles,
      buildText: (w) =>
        `¡Hola *${w.ownerName}*! 👋 Te damos la más cordial bienvenida a *Rumilcarapp*. Ya hemos activado la plataforma de tu taller *${w.workshopName}*.\n\nTienes acceso total a las órdenes de trabajo, seguimiento en vivo por QR para clientes, inventario y facturación.\n\nSi necesitas apoyo para cargar tus mecánicos o configurar tu logotipo, escríbeme por aquí con total confianza. ¡Éxitos en tus operaciones!`,
    },
    courtesy_extension: {
      title: '🎁 Extensión de Cortesía (3 Días)',
      category: 'Retención',
      icon: LifeBuoy,
      buildText: (w) =>
        `Hola *${w.ownerName}*, en *Rumilcarapp* queremos seguir apoyando el crecimiento de *${w.workshopName}*.\n\nEntendemos los tiempos de cierre de caja, por lo que te hemos otorgado una *extensión de cortesía de 3 días adicionales* sin interrupciones en tu servicio.\n\nAprovecha estos días para organizar tus finanzas y avísanos cuando realices tu reporte de pago para dejar activa tu membresía de forma definitiva. ¡Feliz día!`,
    },
    suspension_notice: {
      title: '⚠️ Aviso de Suspensión por Pago',
      category: 'Cobranza Urgente',
      icon: AlertCircle,
      buildText: (w) =>
        `Estimado/a *${w.ownerName}*, te informamos que la suscripción de *${w.workshopName}* en *Rumilcarapp* ha vencido y el acceso operativo se encuentra en pausa temporal.\n\nTodos tus datos, presupuestos y órdenes de clientes se encuentran intactos y seguros. Para reactivar el sistema al instante, puedes realizar tu pago y enviarnos el comprobante por este medio.\n\n¿Podemos ayudarte con los datos de pago en este momento?`,
    },
    payment_approved: {
      title: '✅ Confirmación de Pago Aprobado',
      category: 'Cobranza Aprobada',
      icon: ShieldCheck,
      buildText: (w) =>
        `¡Excelente noticia *${w.ownerName}*! 🎉 Hemos verificado y registrado tu pago con éxito.\n\nLa suscripción de *${w.workshopName}* ha sido renovada y cuenta con acceso ilimitado hasta el *${w.dueDate}*.\n\nMuchas gracias por confiar en *Rumilcarapp* como el sistema de gestión de tu taller. ¡A seguir trabajando con todo!`,
    },
  };

  // Sync custom message when workshop or template changes
  useEffect(() => {
    if (currentWorkshop && TEMPLATES[selectedTemplateKey]) {
      setCustomMessage(TEMPLATES[selectedTemplateKey].buildText(currentWorkshop));
    }
  }, [selectedWorkshopId, selectedTemplateKey, workshops]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!currentWorkshop?.phone) {
      showToast('error', 'El taller seleccionado no tiene teléfono registrado.');
      return;
    }
    const cleanPhone = currentWorkshop.phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="superadmin-support-hub">
      {/* Toast Notification */}
      {toast && (
        <div className={`saas-toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="support-hub-header">
        <div>
          <h1 className="support-hub-title">
            <LifeBuoy size={28} className="support-title-icon" />
            Centro de Soporte & Retención WhatsApp
          </h1>
          <p className="support-hub-subtitle">
            Atención a tickets de talleres clientes y generador inteligente de cobranzas y mensajes de fidelización en 1-clic.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="support-hub-tabs">
          <button
            className={`support-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <MessageSquare size={16} />
            Tickets de Soporte
            {openTicketsCount > 0 && <span className="tab-badge">{openTicketsCount}</span>}
          </button>
          <button
            className={`support-tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            <Phone size={16} />
            Centro de WhatsApp & Cobranza
          </button>
        </div>
      </div>

      {/* TAB 1: TICKETS DE SOPORTE */}
      {activeTab === 'tickets' && (
        <div className="tickets-tab-content">
          {/* Counters row */}
          <div className="ticket-metrics-grid">
            <div className="metric-pill pill-total">
              <span className="metric-label">Total Tickets</span>
              <span className="metric-num">{tickets.length}</span>
            </div>
            <div className="metric-pill pill-open">
              <span className="metric-label">Abiertos / Urgentes</span>
              <span className="metric-num">{openTicketsCount}</span>
            </div>
            <div className="metric-pill pill-progress">
              <span className="metric-label">En Atención</span>
              <span className="metric-num">{inProgressTicketsCount}</span>
            </div>
            <div className="metric-pill pill-resolved">
              <span className="metric-label">Resueltos</span>
              <span className="metric-num">{resolvedTicketsCount}</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="tickets-filter-bar">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por asunto, taller, remitente..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">Todos los Estados</option>
                <option value="OPEN">🔴 Abiertos</option>
                <option value="IN_PROGRESS">🟡 En Atención</option>
                <option value="RESOLVED">🟢 Resueltos</option>
                <option value="CLOSED">⚪ Cerrados</option>
              </select>

              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="ALL">Todas las Prioridades</option>
                <option value="URGENT">🔥 Urgente</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
              </select>

              <button className="refresh-btn" onClick={fetchTickets} title="Recargar tickets">
                <RefreshCw size={16} className={loadingTickets ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Main Layout: Ticket List + Ticket Detail */}
          <div className="tickets-split-view">
            {/* Left: Ticket Cards List */}
            <div className="tickets-list-col">
              {loadingTickets ? (
                <div className="tickets-empty">
                  <RefreshCw size={24} className="spin" />
                  <span>Cargando tickets...</span>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="tickets-empty">
                  <CheckCircle2 size={36} color="#10b981" />
                  <h4>No hay tickets pendientes</h4>
                  <p>Todos los talleres clientes están atendidos al día.</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      className={`ticket-card ${isSelected ? 'selected' : ''} priority-${ticket.priority.toLowerCase()} status-${ticket.status.toLowerCase()}`}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setTicketAdminNote(ticket.adminNotes || '');
                      }}
                    >
                      <div className="ticket-card-header">
                        <span className={`priority-badge badge-${ticket.priority.toLowerCase()}`}>
                          {ticket.priority === 'URGENT' && <Flame size={12} />}
                          {ticket.priority}
                        </span>
                        <span className={`status-badge badge-${ticket.status.toLowerCase()}`}>
                          {ticket.status === 'OPEN' && 'Abierto'}
                          {ticket.status === 'IN_PROGRESS' && 'En Atención'}
                          {ticket.status === 'RESOLVED' && 'Resuelto'}
                          {ticket.status === 'CLOSED' && 'Cerrado'}
                        </span>
                        <span className="ticket-date">
                          {new Date(ticket.createdAt).toLocaleDateString('es-VE')}
                        </span>
                      </div>

                      <h4 className="ticket-subject">{ticket.subject}</h4>

                      <div className="ticket-meta">
                        <span className="t-meta-workshop">
                          <Building2 size={13} /> {ticket.workshop?.name || 'Taller'}
                        </span>
                        <span className="t-meta-user">
                          👤 {ticket.userName}
                        </span>
                      </div>

                      <p className="ticket-snippet">{ticket.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Ticket Detail / Quick Action Panel */}
            <div className="ticket-detail-col">
              {selectedTicket ? (
                <div className="detail-container">
                  <div className="detail-header">
                    <div>
                      <div className="detail-category-badge">{selectedTicket.category}</div>
                      <h2 className="detail-title">{selectedTicket.subject}</h2>
                    </div>
                    <div className="detail-badges">
                      <span className={`priority-badge badge-${selectedTicket.priority.toLowerCase()}`}>
                        {selectedTicket.priority}
                      </span>
                      <span className={`status-badge badge-${selectedTicket.status.toLowerCase()}`}>
                        {selectedTicket.status}
                      </span>
                    </div>
                  </div>

                  {/* Client Workshop Card in Ticket */}
                  <div className="detail-client-box">
                    <div className="client-box-row">
                      <strong>Taller:</strong> {selectedTicket.workshop?.name}
                    </div>
                    <div className="client-box-row">
                      <strong>Remitente:</strong> {selectedTicket.userName} ({selectedTicket.userEmail})
                    </div>
                    {selectedTicket.userPhone && (
                      <div className="client-box-row">
                        <strong>Teléfono:</strong> {selectedTicket.userPhone}
                      </div>
                    )}
                    <div className="client-box-row">
                      <strong>Fecha de Envío:</strong> {new Date(selectedTicket.createdAt).toLocaleString('es-VE')}
                    </div>
                  </div>

                  {/* Message body */}
                  <div className="detail-body">
                    <label className="body-label">Mensaje del Taller:</label>
                    <div className="body-content">{selectedTicket.message}</div>
                  </div>

                  {/* WhatsApp Quick Reply Button */}
                  {selectedTicket.userPhone && (
                    <div className="detail-wa-reply-box">
                      <button
                        className="wa-action-btn"
                        onClick={() => {
                          const cleanPhone = selectedTicket.userPhone!.replace(/\D/g, '');
                          const replyText = encodeURIComponent(
                            `Hola ${selectedTicket.userName}, te saluda Luark Padilla de Soporte Rumilcarapp. Te escribo en respuesta a tu ticket de soporte: "${selectedTicket.subject}". ¿En qué podemos ayudarte a resolverlo?`
                          );
                          window.open(`https://wa.me/${cleanPhone}?text=${replyText}`, '_blank');
                        }}
                      >
                        <Phone size={16} />
                        Responder al Taller vía WhatsApp Directo
                      </button>
                    </div>
                  )}

                  {/* Admin Notes */}
                  <div className="detail-admin-notes">
                    <label className="body-label">Notas Internas de Soporte (Solo SuperAdmin):</label>
                    <textarea
                      rows={3}
                      placeholder="Ej: Se le resolvió por llamada. Se le recomendó limpiar caché del navegador..."
                      value={ticketAdminNote}
                      onChange={(e) => setTicketAdminNote(e.target.value)}
                    />
                  </div>

                  {/* Status Action Buttons */}
                  <div className="detail-actions-bar">
                    <button
                      className="status-btn btn-open"
                      disabled={updatingTicket || selectedTicket.status === 'OPEN'}
                      onClick={() => handleUpdateTicket(selectedTicket.id, 'OPEN')}
                    >
                      Marcar Abierto
                    </button>
                    <button
                      className="status-btn btn-progress"
                      disabled={updatingTicket || selectedTicket.status === 'IN_PROGRESS'}
                      onClick={() => handleUpdateTicket(selectedTicket.id, 'IN_PROGRESS')}
                    >
                      En Atención
                    </button>
                    <button
                      className="status-btn btn-resolved"
                      disabled={updatingTicket || selectedTicket.status === 'RESOLVED'}
                      onClick={() => handleUpdateTicket(selectedTicket.id, 'RESOLVED')}
                    >
                      <CheckCircle2 size={15} />
                      Marcar Resuelto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="no-detail-selected">
                  <LifeBuoy size={48} opacity={0.3} />
                  <h3>Selecciona un ticket</h3>
                  <p>Haz clic en cualquier ticket del listado para ver los detalles, responder por WhatsApp o marcarlo como resuelto.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CENTRO DE WHATSAPP & COBRANZA */}
      {activeTab === 'whatsapp' && (
        <div className="whatsapp-tab-content">
          <div className="wa-hub-layout">
            {/* Left Column: Workshop Selector & Workshop Information */}
            <div className="wa-col-settings">
              <div className="wa-card">
                <h3 className="wa-card-title">
                  <Building2 size={18} />
                  1. Seleccionar Taller Cliente
                </h3>

                <div className="form-group">
                  <label>Taller Receptor:</label>
                  <select
                    className="saas-hub-select"
                    value={selectedWorkshopId}
                    onChange={(e) => setSelectedWorkshopId(e.target.value)}
                  >
                    {workshops.map((w) => (
                      <option key={w.workshopId} value={w.workshopId}>
                        {w.workshopName} — {w.ownerName} ({w.plan} | {w.daysRemaining}d)
                      </option>
                    ))}
                  </select>
                </div>

                {currentWorkshop && (
                  <div className="current-workshop-pill">
                    <div className="c-row">
                      <span className="c-label">Dueño / Titular:</span>
                      <span className="c-val">{currentWorkshop.ownerName}</span>
                    </div>
                    <div className="c-row">
                      <span className="c-label">Teléfono:</span>
                      <span className="c-val">{currentWorkshop.phone || 'Sin registrar'}</span>
                    </div>
                    <div className="c-row">
                      <span className="c-label">Plan Actual:</span>
                      <span className="c-val plan-tag">{currentWorkshop.plan}</span>
                    </div>
                    <div className="c-row">
                      <span className="c-label">Días Restantes:</span>
                      <span className="c-val days-tag">{currentWorkshop.daysRemaining} días</span>
                    </div>
                    <div className="c-row">
                      <span className="c-label">Vencimiento:</span>
                      <span className="c-val">{currentWorkshop.dueDate}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Template Picker */}
              <div className="wa-card">
                <h3 className="wa-card-title">
                  <Sparkles size={18} />
                  2. Plantillas de Mensajes
                </h3>

                <div className="template-options-list">
                  {Object.entries(TEMPLATES).map(([key, tpl]) => {
                    const isSelected = selectedTemplateKey === key;
                    const IconComp = tpl.icon;
                    return (
                      <div
                        key={key}
                        className={`template-option-card ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedTemplateKey(key)}
                      >
                        <div className="tpl-header">
                          <IconComp size={16} />
                          <strong>{tpl.title}</strong>
                        </div>
                        <span className="tpl-category">{tpl.category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Live Message Editor & WhatsApp Dispatcher */}
            <div className="wa-col-preview">
              <div className="wa-card preview-card">
                <div className="preview-card-header">
                  <h3 className="wa-card-title">
                    <MessageSquare size={18} />
                    3. Mensaje Personalizado & Envío
                  </h3>
                  <div className="preview-actions">
                    <button className="preview-action-btn" onClick={handleCopyMessage} title="Copiar al portapapeles">
                      {copiedText ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                      {copiedText ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <p className="preview-hint">
                  Puedes editar este texto libremente antes de enviarlo. Las variables ya fueron reemplazadas con los datos de <strong>{currentWorkshop?.workshopName}</strong>.
                </p>

                <textarea
                  className="wa-message-textarea"
                  rows={12}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />

                <div className="wa-send-footer">
                  <div className="target-phone-indicator">
                    <Phone size={16} color="#25D366" />
                    <span>
                      Destino:{' '}
                      <strong>{currentWorkshop?.phone || '⚠️ Taller sin número telefónico'}</strong>
                    </span>
                  </div>

                  <button
                    className="wa-primary-send-btn"
                    disabled={!currentWorkshop?.phone}
                    onClick={handleOpenWhatsApp}
                  >
                    <Send size={18} />
                    Abrir y Enviar por WhatsApp Web / App
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SuperAdminSupportHubPage;
