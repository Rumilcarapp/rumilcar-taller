import React, { useState, useEffect } from 'react';
import {
  useSurveyStore,
  SurveyQuestion,
} from '../../store/useSurveyStore';
import { useAuthStore } from '../../stores/authStore';
import {
  Sparkles,
  Star,
  CheckCircle2,
  X,
  MessageSquareHeart,
  Send,
  Clock,
  Phone,
  HelpCircle,
} from 'lucide-react';
import './TrialFeedbackModal.css';

const RATING_LABELS: Record<number, string> = {
  1: 'Deficiente 🙁',
  2: 'Regular 😐',
  3: 'Bueno 👍',
  4: 'Muy Bueno 😊',
  5: '¡Excelente! 🚀',
};

export const TrialFeedbackModal: React.FC = () => {
  const { user } = useAuthStore();
  const {
    pendingSurvey,
    fetchPendingSurvey,
    submitSurvey,
    dismissSurvey,
    submitting,
  } = useSurveyStore();

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [phone, setPhone] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  // Consultar al cargar si el usuario no es SuperAdmin
  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      fetchPendingSurvey();
    }
  }, [user]);

  // Precargar teléfono si el taller lo tiene
  useEffect(() => {
    if (pendingSurvey?.workshop?.phone) {
      setPhone(pendingSurvey.workshop.phone);
    }
  }, [pendingSurvey]);

  // Si no hay encuesta que mostrar o es SuperAdmin, no renderizar
  if (!user || user.role === 'SUPERADMIN' || !pendingSurvey?.shouldShow) {
    return null;
  }

  const { questions, reason } = pendingSurvey;

  const handleRatingSelect = (questionId: string, star: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: star }));
    setValidationError(null);
  };

  const handleSingleChoiceSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    setValidationError(null);
  };

  const handleMultiChoiceToggle = (questionId: string, option: string) => {
    const current = (answers[questionId] as string[]) || [];
    const updated = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
    setValidationError(null);
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleBooleanSelect = (questionId: string, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar preguntas obligatorias
    for (const q of questions) {
      if (q.isRequired) {
        const val = answers[q.id];
        if (
          val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0)
        ) {
          setValidationError(`Por favor responde la pregunta: "${q.title}"`);
          return;
        }
      }
    }

    setValidationError(null);

    // Encontrar rating de estrellas si existe
    let generalRating: number | undefined;
    const ratingQ = questions.find((q) => q.type === 'RATING_STARS');
    if (ratingQ && typeof answers[ratingQ.id] === 'number') {
      generalRating = answers[ratingQ.id];
    }

    const success = await submitSurvey(
      answers,
      generalRating,
      phone,
      user.name || undefined
    );

    if (success) {
      setShowThankYou(true);
      setTimeout(() => {
        useSurveyStore.getState().resetSurveyState();
      }, 3500);
    }
  };

  return (
    <div className="survey-modal-overlay" role="dialog" aria-modal="true">
      <div className="survey-modal-container">
        {/* Botón Cerrar */}
        <button
          type="button"
          className="survey-close-btn"
          onClick={() => dismissSurvey()}
          aria-label="Cerrar encuesta"
          title="Responder más tarde"
        >
          <X size={20} />
        </button>

        {showThankYou ? (
          <div className="survey-thankyou-card">
            <div className="thankyou-icon-wrapper">
              <CheckCircle2 size={54} className="thankyou-check" />
            </div>
            <h3 className="thankyou-title">¡Muchas gracias por tu tiempo!</h3>
            <p className="thankyou-desc">
              Tus comentarios y sugerencias han sido enviados directamente a Luark Padilla
              y al equipo de desarrollo de <strong>Rumilcar App</strong>.
            </p>
            <p className="thankyou-sub">
              Seguimos trabajando todos los días para ofrecer la mejor plataforma automotriz.
            </p>
            <button
              className="survey-btn-finish"
              onClick={() => useSurveyStore.getState().resetSurveyState()}
            >
              Continuar
            </button>
          </div>
        ) : (
          <form className="survey-form-content" onSubmit={handleSubmit}>
            {/* Header del Modal */}
            <div className="survey-header">
              <div className="survey-badge">
                <Sparkles size={14} />
                <span>Tu opinión hace la diferencia</span>
              </div>
              <h2 className="survey-title">
                {reason ? reason : 'Encuesta de Experiencia Rumilcar'}
              </h2>
              <p className="survey-subtitle">
                Queremos saber cómo fue tu experiencia utilizando el software en tu taller y qué podemos mejorar.
                Solo te tomará 1 minuto.
              </p>
            </div>

            {/* Listado de Preguntas Dinámicas */}
            <div className="survey-questions-list">
              {questions.map((q, idx) => (
                <div key={q.id} className="survey-question-block">
                  <div className="question-header">
                    <span className="question-number">{idx + 1}</span>
                    <div className="question-title-group">
                      <h4 className="question-title">
                        {q.title}
                        {q.isRequired && <span className="question-required">*</span>}
                      </h4>
                      {q.description && (
                        <p className="question-description">{q.description}</p>
                      )}
                    </div>
                  </div>

                  {/* 1. RATING STARS */}
                  {q.type === 'RATING_STARS' && (
                    <div className="rating-stars-wrapper">
                      <div className="stars-row">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const currentVal = answers[q.id] || 0;
                          const isFilled =
                            hoverRating !== null
                              ? star <= hoverRating
                              : star <= currentVal;

                          return (
                            <button
                              type="button"
                              key={star}
                              className={`star-btn ${isFilled ? 'star-active' : ''}`}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(null)}
                              onClick={() => handleRatingSelect(q.id, star)}
                              aria-label={`${star} estrellas`}
                            >
                              <Star
                                size={32}
                                fill={isFilled ? '#eab308' : 'none'}
                                stroke={isFilled ? '#eab308' : '#94a3b8'}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <div className="rating-label-display">
                        {(hoverRating !== null && RATING_LABELS[hoverRating]) ||
                          (answers[q.id] && RATING_LABELS[answers[q.id]]) ||
                          'Selecciona de 1 a 5 estrellas'}
                      </div>
                    </div>
                  )}

                  {/* 2. SINGLE CHOICE */}
                  {q.type === 'SINGLE_CHOICE' && (
                    <div className="choice-options-grid">
                      {q.options.map((option) => {
                        const isSelected = answers[q.id] === option;
                        return (
                          <button
                            type="button"
                            key={option}
                            className={`choice-card ${isSelected ? 'choice-selected' : ''}`}
                            onClick={() => handleSingleChoiceSelect(q.id, option)}
                          >
                            <span className="choice-indicator">
                              <span className="choice-dot" />
                            </span>
                            <span className="choice-text">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. MULTIPLE CHOICE */}
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div className="choice-options-grid">
                      {q.options.map((option) => {
                        const selectedList: string[] = answers[q.id] || [];
                        const isSelected = selectedList.includes(option);
                        return (
                          <button
                            type="button"
                            key={option}
                            className={`choice-card multi ${isSelected ? 'choice-selected' : ''}`}
                            onClick={() => handleMultiChoiceToggle(q.id, option)}
                          >
                            <span className="choice-checkbox">
                              {isSelected && <CheckCircle2 size={16} />}
                            </span>
                            <span className="choice-text">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. TEXT */}
                  {q.type === 'TEXT' && (
                    <div className="text-input-wrapper">
                      <textarea
                        className="survey-textarea"
                        rows={3}
                        placeholder="Escribe tus comentarios, sugerencias o funciones que te gustaría ver en Rumilcar..."
                        value={answers[q.id] || ''}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                      />
                    </div>
                  )}

                  {/* 5. BOOLEAN */}
                  {q.type === 'BOOLEAN' && (
                    <div className="boolean-options-row">
                      <button
                        type="button"
                        className={`boolean-btn ${answers[q.id] === true ? 'bool-selected-yes' : ''}`}
                        onClick={() => handleBooleanSelect(q.id, true)}
                      >
                        <span>Sí, me gustaría</span>
                      </button>
                      <button
                        type="button"
                        className={`boolean-btn ${answers[q.id] === false ? 'bool-selected-no' : ''}`}
                        onClick={() => handleBooleanSelect(q.id, false)}
                      >
                        <span>No por ahora</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Teléfono de contacto opcional */}
              <div className="survey-contact-row">
                <label className="contact-label">
                  <Phone size={16} className="contact-icon" />
                  <span>Número de WhatsApp / Teléfono de contacto:</span>
                </label>
                <input
                  type="text"
                  className="contact-input"
                  placeholder="Ej: 04141234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Error de validación */}
            {validationError && (
              <div className="survey-validation-alert">
                <HelpCircle size={18} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Footer con Acciones */}
            <div className="survey-modal-footer">
              <button
                type="button"
                className="survey-btn-snooze"
                onClick={() => dismissSurvey()}
                disabled={submitting}
              >
                <Clock size={16} />
                <span>Recordar más tarde</span>
              </button>

              <button
                type="submit"
                className="survey-btn-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <span>Enviar Comentarios</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
