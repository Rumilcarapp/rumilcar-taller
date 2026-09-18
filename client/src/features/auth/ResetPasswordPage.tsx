import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { useThemeStore } from '../../store/themeStore';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sun,
  Moon,
  KeyRound,
  Check,
  X,
  Clock,
} from 'lucide-react';
import './LoginPage.css';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLight, toggleTheme } = useThemeStore();

  const token = searchParams.get('token') || '';

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setTokenValid(false);
      setVerifyError('No se proporcionó ningún token de recuperación. Asegúrate de hacer clic en el enlace completo enviado a tu correo.');
      return;
    }

    let isMounted = true;

    async function verifyToken() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
        const res = await fetch(`${apiUrl}/auth/forgot-password/verify-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.trim() }),
        });

        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.valid) {
          setTokenValid(true);
          setUserEmail(data.email || '');
          setUserName(data.name || '');
        } else {
          setTokenValid(false);
          setVerifyError(data.error || 'El enlace de recuperación ha expirado o ya fue utilizado.');
        }
      } catch {
        if (!isMounted) return;
        // In case verify endpoint is unavailable, allow the user to still attempt the reset form
        setTokenValid(true);
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    }

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const getStrengthScore = () => {
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (hasNumber) score++;
    if (hasLetter) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;
    return score;
  };

  const strengthScore = getStrengthScore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token de recuperación no válido o faltante.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
      const res = await fetch(`${apiUrl}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo restablecer la contraseña.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Automatically navigate to login after 3.5 seconds
      setTimeout(() => {
        navigate('/login', {
          state: {
            successMessage:
              '¡Contraseña restablecida con éxito! Todas las sesiones activas han sido revocadas. Ingresa con tu nueva contraseña.',
          },
        });
      }, 3500);
    } catch {
      setError('Error de conexión con el servidor. Verifica tu internet e intenta nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern" />

      {/* Floating Theme Toggle */}
      <button
        type="button"
        className="login-theme-floating"
        onClick={toggleTheme}
        aria-label="Cambiar tema visual"
      >
        {isLight ? (
          <>
            <Moon size={16} style={{ color: '#6366f1' }} />
            <span>Modo Oscuro</span>
          </>
        ) : (
          <>
            <Sun size={16} style={{ color: '#f59e0b' }} />
            <span>Modo Claro</span>
          </>
        )}
      </button>

      <div className="login-card" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <img
              src="/logo.png"
              alt="Logo Rumilcar"
              className="login-brand-img"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="login-logo-text">
              RUMIL<span className="login-logo-accent">CAR</span>
            </div>
          </div>
          <h1 className="login-title">Restablecer Contraseña</h1>
          <p className="login-subtitle">
            Crea una nueva contraseña segura para tu cuenta del taller
          </p>
        </div>

        {/* STATE 1: VERIFYING TOKEN */}
        {isVerifying && (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(220, 38, 38, 0.2)',
                borderTopColor: '#dc2626',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              Verificando la validez del enlace de recuperación...
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* STATE 2: TOKEN INVALID OR EXPIRED */}
        {!isVerifying && !tokenValid && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>
                Enlace Expirado o Inválido
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {verifyError || 'Por razones de seguridad, los enlaces de recuperación solo son válidos por 15 minutos y pueden usarse una única vez.'}
              </p>
            </div>

            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                textAlign: 'left',
              }}
            >
              <strong>¿Qué puedes hacer?</strong>
              <p style={{ margin: '4px 0 0 0' }}>
                Regresa a la pantalla de acceso y solicita un nuevo enlace de recuperación por correo.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => navigate('/login')}
              icon={<ArrowLeft size={16} />}
            >
              Volver al Inicio de Sesión
            </Button>
          </div>
        )}

        {/* STATE 3: SUCCESSFUL PASSWORD RESET */}
        {!isVerifying && tokenValid && success && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '2px solid #22c55e',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>
                ¡Contraseña Restablecida con Éxito!
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Tu contraseña ha sido actualizada en nuestros servidores. Todas las sesiones anteriores fueron cerradas por protección.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
              }}
            >
              Redirigiendo automáticamente a la pantalla de inicio de sesión en unos segundos...
            </div>

            <Button
              type="button"
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => navigate('/login')}
              icon={<ShieldCheck size={18} />}
            >
              Iniciar Sesión Ahora
            </Button>
          </div>
        )}

        {/* STATE 4: PASSWORD RESET FORM */}
        {!isVerifying && tokenValid && !success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {userEmail && (
              <div
                style={{
                  background: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={16} style={{ color: '#22c55e' }} />
                <span>
                  Restableciendo acceso para:{' '}
                  <strong style={{ color: 'var(--color-text-primary)' }}>{userEmail}</strong>
                </span>
              </div>
            )}

            {error && (
              <div
                className="login-error"
                style={{
                  marginBottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Nueva Contraseña */}
            <div>
              <Input
                label="Nueva Contraseña (mínimo 8 caracteres)"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock size={16} />}
                placeholder="Ingresa tu nueva contraseña"
                required
                suffix={
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label="Alternar visibilidad"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div
                    style={{
                      height: '4px',
                      background: 'var(--color-border)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      display: 'flex',
                      gap: '2px',
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        style={{
                          flex: 1,
                          background:
                            strengthScore >= lvl
                              ? strengthScore <= 2
                                ? '#ef4444'
                                : strengthScore <= 3
                                ? '#f59e0b'
                                : '#22c55e'
                              : 'transparent',
                          transition: 'background 0.3s ease',
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      marginTop: '4px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <span>
                      Seguridad:{' '}
                      <strong>
                        {strengthScore <= 2
                          ? 'Débil'
                          : strengthScore <= 3
                          ? 'Media'
                          : 'Fuerte'}
                      </strong>
                    </span>
                    <span>Mín. 8 caracteres</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <Input
                label="Confirmar Nueva Contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<KeyRound size={16} />}
                placeholder="Repite tu nueva contraseña"
                required
                suffix={
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label="Alternar visibilidad"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {confirmPassword.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    marginTop: '4px',
                    color: passwordsMatch ? '#22c55e' : '#ef4444',
                  }}
                >
                  {passwordsMatch ? (
                    <>
                      <Check size={12} />
                      <span>Las contraseñas coinciden correctamente</span>
                    </>
                  ) : (
                    <>
                      <X size={12} />
                      <span>Las contraseñas no coinciden aún</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Security checklist */}
            <div
              style={{
                background: 'var(--color-bg-tertiary)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {hasMinLength ? (
                  <Check size={14} style={{ color: '#22c55e' }} />
                ) : (
                  <X size={14} style={{ color: 'var(--color-text-secondary)' }} />
                )}
                <span style={{ color: hasMinLength ? 'var(--color-text-primary)' : 'inherit' }}>
                  Al menos 8 caracteres
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {hasNumber ? (
                  <Check size={14} style={{ color: '#22c55e' }} />
                ) : (
                  <X size={14} style={{ color: 'var(--color-text-secondary)' }} />
                )}
                <span style={{ color: hasNumber ? 'var(--color-text-primary)' : 'inherit' }}>
                  Incluye al menos un número
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {hasLetter ? (
                  <Check size={14} style={{ color: '#22c55e' }} />
                ) : (
                  <X size={14} style={{ color: 'var(--color-text-secondary)' }} />
                )}
                <span style={{ color: hasLetter ? 'var(--color-text-primary)' : 'inherit' }}>
                  Incluye letras
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={loading}
              disabled={loading || !hasMinLength || !passwordsMatch}
              icon={<ShieldCheck size={18} />}
            >
              Guardar Contraseña e Iniciar Sesión
            </Button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <Link
                to="/login"
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ArrowLeft size={14} />
                <span>Cancelar y volver al login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
