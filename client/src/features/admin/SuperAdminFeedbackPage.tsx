import React, { useState, useEffect } from 'react';
import {
  MessageSquareHeart,
  Star,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Edit3,
  Trash2,
  Send,
  Phone,
  Search,
  RefreshCw,
  AlertCircle,
  Building2,
  Sliders,
  Check,
  X,
  FileQuestion,
  HelpCircle,
  Calendar,
} from 'lucide-react';
import './SuperAdminFeedbackPage.css';

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
};

const getAuthToken = () => {
  return localStorage.getItem('rumilcar_token') || '';
};

export interface AdminSurveyQuestion {
  id: string;
  order: number;
  title: string;
  description?: string | null;
  type: 'RATING_STARS' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT' | 'BOOLEAN';
  options: string[];
  isRequired: boolean;
  isActive: boolean;
  category: string;
}

export interface AdminSurveyResponse {
  id: string;
  requestId?: string;
  workshopId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  answers: Record<string, any>;
  rating?: number | null;
  status: 'PENDING' | 'CONTACTED' | 'ARCHIVED';
  adminNotes?: string | null;
  createdAt: string;
  workshop: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    subscription?: {
      plan: string;
      status: string;
    };
  };
  surveyRequest?: {
    requestedBy: string;
    reason?: string;
    notifiedAt: string;
  };
}

export interface WorkshopOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export const SuperAdminFeedbackPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'RESPONSES' | 'QUESTIONS'>('RESPONSES');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalResponses: 0,
    pendingRequests: 0,
    avgRating: 0,
    totalRatings: 0,
    pendingContacts: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  // Responses
  const [responses, setResponses] = useState<AdminSurveyResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');

  // Questions
  const [questions, setQuestions] = useState<AdminSurveyQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Partial<AdminSurveyQuestion> | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [optionsText, setOptionsText] = useState('');

  // Manual Dispatch Modal
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [workshopsList, setWorkshopsList] = useState<WorkshopOption[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const [dispatchReason, setDispatchReason] = useState('Revisión y retroalimentación personalizada');
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Notes inline editing
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  // Success / Alert message
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setRefreshing(true);
      const [resStats, resResponses, resQuestions, resWorkshops] = await Promise.all([
        fetch(`${getApiUrl()}/surveys/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch(`${getApiUrl()}/surveys/admin/responses`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch(`${getApiUrl()}/surveys/admin/questions`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        fetch(`${getApiUrl()}/subscriptions/admin/workshops`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .catch(() => ({ workshops: [] })),
      ]);

      if (resStats?.stats) setStats(resStats.stats);
      if (resResponses?.data) {
        setResponses(resResponses.data);
        const drafts: Record<string, string> = {};
        resResponses.data.forEach((item: AdminSurveyResponse) => {
          drafts[item.id] = item.adminNotes || '';
        });
        setNoteDrafts(drafts);
      }
      if (resQuestions?.data) setQuestions(resQuestions.data);
      if (resWorkshops?.workshops) {
        setWorkshopsList(
          resWorkshops.workshops.map((w: any) => ({
            id: w.workshopId || w.id,
            name: w.workshopName || w.name,
            email: w.email,
            phone: w.phone,
          }))
        );
      }
    } catch (err) {
      console.error('Error cargando datos de encuestas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update response status
  const handleUpdateStatus = async (responseId: string, newStatus: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${getApiUrl()}/surveys/admin/responses/${responseId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setResponses((prev) =>
          prev.map((r) => (r.id === responseId ? { ...r, status: newStatus as any } : r))
        );
        showNotification('Estado actualizado correctamente');
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  // Save admin notes
  const handleSaveNotes = async (responseId: string) => {
    const token = getAuthToken();
    const notes = noteDrafts[responseId] || '';
    setSavingNoteId(responseId);

    try {
      const res = await fetch(`${getApiUrl()}/surveys/admin/responses/${responseId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes: notes }),
      });
      if (res.ok) {
        setResponses((prev) =>
          prev.map((r) => (r.id === responseId ? { ...r, adminNotes: notes } : r))
        );
        showNotification('Nota interna guardada');
      }
    } catch (err) {
      console.error('Error guardando nota:', err);
    } finally {
      setSavingNoteId(null);
    }
  };

  // Toggle question active status
  const handleToggleQuestionActive = async (question: AdminSurveyQuestion) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${getApiUrl()}/surveys/admin/questions/${question.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !question.isActive }),
      });
      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === question.id ? { ...q, isActive: !q.isActive } : q))
        );
        showNotification(
          question.isActive ? 'Pregunta desactivada del modal' : 'Pregunta activada en el modal'
        );
      }
    } catch (err) {
      console.error('Error toggling question:', err);
    }
  };

  // Open Question modal for create or edit
  const handleOpenQuestionModal = (question?: AdminSurveyQuestion) => {
    if (question) {
      setEditingQuestion(question);
      setOptionsText(question.options ? question.options.join('\n') : '');
    } else {
      setEditingQuestion({
        title: '',
        description: '',
        type: 'SINGLE_CHOICE',
        isRequired: true,
        isActive: true,
        options: [],
        category: 'TRIAL_END',
        order: questions.length + 1,
      });
      setOptionsText('');
    }
    setIsQuestionModalOpen(true);
  };

  // Save Question (Create or Update)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.title) return;

    const token = getAuthToken();
    const optionsArray = optionsText
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);

    const payload = {
      ...editingQuestion,
      options: optionsArray,
    };

    try {
      if (editingQuestion.id) {
        // Update
        const res = await fetch(`${getApiUrl()}/surveys/admin/questions/${editingQuestion.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? data.data : q)));
          showNotification('Pregunta actualizada exitosamente');
        }
      } else {
        // Create
        const res = await fetch(`${getApiUrl()}/surveys/admin/questions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setQuestions((prev) => [...prev, data.data]);
          showNotification('Pregunta creada exitosamente');
        }
      }
      setIsQuestionModalOpen(false);
      setEditingQuestion(null);
    } catch (err) {
      console.error('Error guardando pregunta:', err);
    }
  };

  // Delete question
  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta pregunta?')) return;
    const token = getAuthToken();
    try {
      const res = await fetch(`${getApiUrl()}/surveys/admin/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        showNotification('Pregunta eliminada');
      }
    } catch (err) {
      console.error('Error eliminando pregunta:', err);
    }
  };

  // Manual Dispatch to Workshop
  const handleDispatchSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshopId) return;

    const token = getAuthToken();
    setDispatchLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/surveys/admin/dispatch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshopId: selectedWorkshopId,
          reason: dispatchReason,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showNotification(data.message || 'Encuesta enviada exitosamente');
        setIsDispatchModalOpen(false);
        setSelectedWorkshopId('');
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al despachar encuesta');
      }
    } catch (err) {
      console.error('Error despachando encuesta:', err);
    } finally {
      setDispatchLoading(false);
    }
  };

  // Build WhatsApp URL
  const getWhatsAppLink = (resp: AdminSurveyResponse) => {
    const rawPhone = resp.userPhone || resp.workshop?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const workshopName = resp.workshop?.name || 'su taller';
    const clientName = resp.userName || 'Estimado(a)';

    let phoneWithCountry = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      phoneWithCountry = '58' + cleanPhone.slice(1);
    }

    const msg = encodeURIComponent(
      `¡Hola ${clientName}! 👋 Te saluda Luark Padilla de Rumilcar App. ` +
        `Revisé los comentarios y sugerencias que dejaste sobre ${workshopName}. ` +
        `¡Muchísimas gracias por tu tiempo! Me encantaría conversar unos minutos contigo para resolver tus dudas o prepararte una propuesta a la medida de tu taller.`
    );

    return `https://wa.me/${phoneWithCountry}?text=${msg}`;
  };

  // Filtered responses
  const filteredResponses = responses.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (ratingFilter !== 'ALL' && r.rating !== Number(ratingFilter)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.workshop?.name?.toLowerCase().includes(q);
      const matchUser = r.userName?.toLowerCase().includes(q);
      const matchEmail = r.userEmail?.toLowerCase().includes(q) || r.workshop?.email?.toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchEmail) return false;
    }
    return true;
  });

  return (
    <div className="superadmin-feedback-page">
      {/* Toast notification */}
      {notification && (
        <div className="feedback-toast-alert">
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="feedback-header">
        <div className="feedback-header-left">
          <div className="feedback-title-badge">
            <MessageSquareHeart size={16} />
            <span>Módulo de Calidad & Retención SaaS</span>
          </div>
          <h1 className="feedback-page-title">Encuestas & Retroalimentación</h1>
          <p className="feedback-page-desc">
            Gestiona la experiencia post-prueba gratis, edita preguntas dinámicamente y envía encuestas manuales a cualquier taller.
          </p>
        </div>

        <div className="feedback-header-actions">
          <button
            className="feedback-btn-refresh"
            onClick={fetchData}
            disabled={refreshing}
            title="Refrescar datos"
          >
            <RefreshCw size={17} className={refreshing ? 'spin-icon' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            className="feedback-btn-dispatch"
            onClick={() => setIsDispatchModalOpen(true)}
          >
            <Send size={16} />
            <span>Enviar Encuesta Manual</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="feedback-kpis-grid">
        <div className="feedback-kpi-card">
          <div className="kpi-icon-wrap kpi-gold">
            <Star size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'} ⭐</span>
            <span className="kpi-label">Satisfacción Promedio</span>
          </div>
        </div>

        <div className="feedback-kpi-card">
          <div className="kpi-icon-wrap kpi-blue">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.totalResponses}</span>
            <span className="kpi-label">Respuestas Recibidas</span>
          </div>
        </div>

        <div className="feedback-kpi-card">
          <div className="kpi-icon-wrap kpi-amber">
            <Clock size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.pendingRequests}</span>
            <span className="kpi-label">Encuestas en Espera</span>
          </div>
        </div>

        <div className="feedback-kpi-card">
          <div className="kpi-icon-wrap kpi-green">
            <Phone size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.pendingContacts}</span>
            <span className="kpi-label">Por Contactar</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="feedback-tabs-nav">
        <button
          className={`tab-nav-btn ${activeTab === 'RESPONSES' ? 'active' : ''}`}
          onClick={() => setActiveTab('RESPONSES')}
        >
          <Users size={18} />
          <span>Bandeja de Respuestas ({responses.length})</span>
        </button>

        <button
          className={`tab-nav-btn ${activeTab === 'QUESTIONS' ? 'active' : ''}`}
          onClick={() => setActiveTab('QUESTIONS')}
        >
          <Sliders size={18} />
          <span>Editor de Preguntas Dinámicas ({questions.length})</span>
        </button>
      </div>

      {/* TAB 1: RESPUESTAS */}
      {activeTab === 'RESPONSES' && (
        <div className="feedback-tab-content">
          {/* Filters Bar */}
          <div className="responses-filters-bar">
            <div className="search-input-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar taller, dueño o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-select-group">
              <label>Estado:</label>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="CONTACTED">Contactados</option>
                <option value="ARCHIVED">Archivados</option>
              </select>
            </div>

            <div className="filter-select-group">
              <label>Calificación:</label>
              <select
                className="filter-select"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="ALL">Todas las estrellas</option>
                <option value="5">5 Estrellas ⭐⭐⭐⭐⭐</option>
                <option value="4">4 Estrellas ⭐⭐⭐⭐</option>
                <option value="3">3 Estrellas ⭐⭐⭐</option>
                <option value="2">2 Estrellas ⭐⭐</option>
                <option value="1">1 Estrella ⭐</option>
              </select>
            </div>
          </div>

          {/* List of Responses */}
          {filteredResponses.length === 0 ? (
            <div className="feedback-empty-state">
              <FileQuestion size={48} className="empty-icon" />
              <h3>No se encontraron respuestas con estos filtros</h3>
              <p>Las respuestas de los clientes aparecerán aquí en cuanto completen el modal en su aplicación.</p>
            </div>
          ) : (
            <div className="responses-cards-list">
              {filteredResponses.map((item) => {
                const workshopPhone = item.userPhone || item.workshop?.phone;
                const starsCount = item.rating || 0;

                return (
                  <div key={item.id} className="response-card-item">
                    {/* Header */}
                    <div className="response-card-header">
                      <div className="response-card-title-group">
                        <div className="workshop-avatar-icon">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className="workshop-response-name">{item.workshop?.name}</h3>
                          <div className="response-meta-row">
                            <span className="response-user-name">Por: {item.userName || 'Usuario'}</span>
                            <span>•</span>
                            <span className="response-date">
                              <Calendar size={13} />
                              {new Date(item.createdAt).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {item.surveyRequest?.requestedBy === 'SYSTEM_AUTO_TRIAL' ? (
                              <span className="badge-trigger-auto">Fin de Prueba Gratis</span>
                            ) : (
                              <span className="badge-trigger-manual">Despacho Manual</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Calificación y Estado */}
                      <div className="response-header-right">
                        {starsCount > 0 && (
                          <div className="stars-pill">
                            <span className="stars-icons">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  fill={i < starsCount ? '#eab308' : 'none'}
                                  stroke={i < starsCount ? '#eab308' : '#94a3b8'}
                                />
                              ))}
                            </span>
                            <span className="stars-number">{starsCount}/5</span>
                          </div>
                        )}

                        <select
                          className={`status-badge-select status-${item.status.toLowerCase()}`}
                          value={item.status}
                          onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                        >
                          <option value="PENDING">Pendiente</option>
                          <option value="CONTACTED">Contactado</option>
                          <option value="ARCHIVED">Archivado</option>
                        </select>
                      </div>
                    </div>

                    {/* Breakdown of questions & answers */}
                    <div className="response-answers-breakdown">
                      <h4 className="answers-title">Desglose de Respuestas:</h4>
                      <div className="answers-items-grid">
                        {questions.map((q) => {
                          const ans = item.answers?.[q.id];
                          if (ans === undefined || ans === null || ans === '') return null;

                          let displayVal = String(ans);
                          if (Array.isArray(ans)) {
                            displayVal = ans.join(', ');
                          } else if (typeof ans === 'boolean') {
                            displayVal = ans ? '✅ Sí, desea contacto' : '❌ No por ahora';
                          } else if (q.type === 'RATING_STARS') {
                            displayVal = `${ans} de 5 Estrellas ⭐`;
                          }

                          return (
                            <div key={q.id} className="answer-row">
                              <span className="answer-question-label">{q.title}:</span>
                              <span className="answer-value-text">{displayVal}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* WhatsApp Action & Internal Notes */}
                    <div className="response-card-footer">
                      <div className="notes-input-group">
                        <input
                          type="text"
                          className="notes-input"
                          placeholder="Añadir nota interna de seguimiento (ej: Llamado el 07/10, interesado en plan Pro)..."
                          value={noteDrafts[item.id] ?? ''}
                          onChange={(e) =>
                            setNoteDrafts({ ...noteDrafts, [item.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNotes(item.id);
                          }}
                        />
                        <button
                          className="notes-save-btn"
                          onClick={() => handleSaveNotes(item.id)}
                          disabled={savingNoteId === item.id}
                        >
                          {savingNoteId === item.id ? 'Guardando...' : 'Guardar Nota'}
                        </button>
                      </div>

                      {workshopPhone && (
                        <a
                          href={getWhatsAppLink(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-open-whatsapp"
                          title="Contactar al taller por WhatsApp"
                        >
                          <Phone size={16} />
                          <span>WhatsApp ({workshopPhone})</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EDITOR DE PREGUNTAS */}
      {activeTab === 'QUESTIONS' && (
        <div className="feedback-tab-content">
          <div className="questions-section-header">
            <div>
              <h2 className="section-title">Preguntas de la Encuesta</h2>
              <p className="section-subtitle">
                Estas preguntas son las que se renderizan dinámicamente en el modal del cliente cuando termina su prueba o cuando tú la solicitas manualmente.
              </p>
            </div>
            <button
              className="btn-add-question"
              onClick={() => handleOpenQuestionModal()}
            >
              <Plus size={18} />
              <span>Nueva Pregunta</span>
            </button>
          </div>

          <div className="questions-cards-grid">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className={`question-card-item ${!q.isActive ? 'question-card-disabled' : ''}`}
              >
                <div className="question-card-top">
                  <div className="question-order-pill">#{idx + 1}</div>
                  <div className="question-type-badge">{q.type}</div>

                  <div className="question-actions-right">
                    <button
                      className={`btn-toggle-active ${q.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleQuestionActive(q)}
                      title={q.isActive ? 'Desactivar pregunta' : 'Activar pregunta'}
                    >
                      {q.isActive ? 'Activa' : 'Pausada'}
                    </button>
                    <button
                      className="btn-icon-action"
                      onClick={() => handleOpenQuestionModal(q)}
                      title="Editar pregunta"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="btn-icon-action btn-danger"
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Eliminar pregunta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="question-card-title">{q.title}</h3>
                {q.description && (
                  <p className="question-card-desc">{q.description}</p>
                )}

                {/* Options display */}
                {q.options && q.options.length > 0 && (
                  <div className="question-options-preview">
                    <span className="options-title">Opciones disponibles:</span>
                    <ul className="options-list">
                      {q.options.map((opt, oIdx) => (
                        <li key={oIdx}>{opt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="question-card-bottom-meta">
                  <span>{q.isRequired ? 'Obligatoria' : 'Opcional'}</span>
                  <span>•</span>
                  <span>Categoría: {q.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: EDITAR O CREAR PREGUNTA */}
      {isQuestionModalOpen && editingQuestion && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal-box">
            <div className="feedback-modal-header">
              <h3>
                {editingQuestion.id ? 'Editar Pregunta' : 'Crear Nueva Pregunta'}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsQuestionModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="feedback-modal-form">
              <div className="form-group">
                <label>Título / Enunciado de la Pregunta *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ej: ¿Qué funciones le resultaron más útiles a tu taller?"
                  value={editingQuestion.title || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, title: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Descripción o Texto de Ayuda (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Puedes seleccionar una o más opciones."
                  value={editingQuestion.description || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, description: e.target.value })
                  }
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Tipo de Entrada *</label>
                  <select
                    className="form-input"
                    value={editingQuestion.type || 'SINGLE_CHOICE'}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        type: e.target.value as any,
                      })
                    }
                  >
                    <option value="RATING_STARS">⭐ Calificación de 1 a 5 Estrellas</option>
                    <option value="SINGLE_CHOICE">🔘 Selección Única (Radio)</option>
                    <option value="MULTIPLE_CHOICE">☑️ Selección Múltiple (Checkboxes)</option>
                    <option value="TEXT">📝 Texto Libre / Párrafo</option>
                    <option value="BOOLEAN">🔘 Sí / No (Booleano)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Posición / Orden</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editingQuestion.order || 1}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        order: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              {/* Show options textarea if choice type */}
              {(editingQuestion.type === 'SINGLE_CHOICE' ||
                editingQuestion.type === 'MULTIPLE_CHOICE') && (
                <div className="form-group">
                  <label>Opciones (Una opción por cada línea) *</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                  />
                  <small className="form-help-text">
                    Escribe cada alternativa en un renglón nuevo.
                  </small>
                </div>
              )}

              <div className="form-checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingQuestion.isRequired ?? true}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        isRequired: e.target.checked,
                      })
                    }
                  />
                  <span>Pregunta obligatoria</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingQuestion.isActive ?? true}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        isActive: e.target.checked,
                      })
                    }
                  />
                  <span>Activa en el modal</span>
                </label>
              </div>

              <div className="feedback-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsQuestionModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-save">
                  Guardar Pregunta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DESPACHO MANUAL DE ENCUESTA */}
      {isDispatchModalOpen && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal-box">
            <div className="feedback-modal-header">
              <h3>Enviar Encuesta Manual a un Taller</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsDispatchModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDispatchSurvey} className="feedback-modal-form">
              <div className="form-group">
                <label>Selecciona el Taller Destinatario *</label>
                <select
                  className="form-input"
                  required
                  value={selectedWorkshopId}
                  onChange={(e) => setSelectedWorkshopId(e.target.value)}
                >
                  <option value="">-- Elige un taller registrado --</option>
                  {workshopsList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.email ? `(${w.email})` : ''}
                    </option>
                  ))}
                </select>
                <small className="form-help-text">
                  Al despachar la encuesta, se le mostrará la ventana emergente en su pantalla en su próxima visita.
                </small>
              </div>

              <div className="form-group">
                <label>Motivo o Nota del Envío</label>
                <input
                  type="text"
                  className="form-input"
                  value={dispatchReason}
                  onChange={(e) => setDispatchReason(e.target.value)}
                  placeholder="Ej: Seguimiento post-soporte / Sondeo de satisfacción"
                />
              </div>

              <div className="feedback-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsDispatchModalOpen(false)}
                  disabled={dispatchLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-save"
                  disabled={dispatchLoading || !selectedWorkshopId}
                >
                  {dispatchLoading ? 'Enviando...' : 'Despachar Ahora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
