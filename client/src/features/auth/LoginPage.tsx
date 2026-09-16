import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useUserManagementStore } from '../../store/useUserManagementStore';
import { useThemeStore } from '../../store/themeStore';
import { useWorkshopStore } from '../../store/useWorkshopStore';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sun,
  Moon,
  Wrench,
  User,
  Phone,
  Sparkles,
  LogIn,
  UserPlus,
  CheckCircle2,
  MessageSquare,
  KeyRound,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { users, addUser, addAuditLog } = useUserManagementStore();
  const { isLight, toggleTheme } = useThemeStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Register form states
  const [workshopName, setWorkshopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  // WhatsApp Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotData, setForgotData] = useState<any>(null);
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginUser = (userToLogin: any, token?: string) => {
    const userWorkshop = userToLogin.workshopName || 'Multiservicios Rumilcar';
    if (userToLogin.workshopName && userToLogin.workshopName !== 'Rumilcar Central (SaaS)') {
      useWorkshopStore.getState().updateWorkshop({
        name: userToLogin.workshopName,
        ownerName: userToLogin.name || '',
        email: userToLogin.email || '',
        phone: userToLogin.phone || '',
      });
    }
    login(
      {
        id: userToLogin.id,
        name: userToLogin.name,
        email: userToLogin.email,
        role: userToLogin.role || 'OWNER',
        phone: userToLogin.phone || '',
        workshopId: userToLogin.workshopId || '1',
        workshopName: userWorkshop,
      },
      token || 'jwt-token-' + Date.now()
    );

    addAuditLog({
      userId: userToLogin.id,
      userName: userToLogin.name,
      userRole: userToLogin.role || 'OWNER',
      action: 'Inicio de Sesión',
      module: 'auth',
      details: `Ingreso al sistema con rol ${userToLogin.role || 'OWNER'} en ${userWorkshop}`,
    });

    if (userToLogin.role === 'SUPERADMIN') {
      navigate('/admin/membresias');
    } else {
      navigate('/');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Por favor ingresa tu correo electrónico o usuario.');
      return;
    }
    if (!password) {
      setError('Por favor ingresa tu contraseña.');
      return;
    }

    setLoading(true);

    // 1. Primary: Remote API authentication
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (response.ok) {
        const data = await response.json();
        handleLoginUser(data.user, data.token);
        setLoading(false);
        return;
      } else {
        const errData = await response.json().catch(() => ({ error: '' }));
        setError(errData.error || 'Credenciales inválidas. Verifica tu correo y contraseña.');
        setLoading(false);
        return;
      }
    } catch {
      // Remote call failed (offline mode)
      const found = users.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.password === password
      );

      if (found) {
        if (!found.isActive) {
          setError('Este usuario se encuentra inactivo. Contacte al administrador.');
          setLoading(false);
          return;
        }
        handleLoginUser(found);
        setLoading(false);
        return;
      }

      setError('No se pudo conectar con el servidor de autenticación. Verifica tu conexión a internet.');
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validations
    if (!workshopName.trim()) {
      setError('Por favor ingresa el nombre de tu taller mecánico.');
      return;
    }
    if (!ownerName.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (regPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    // Check if email already exists in local list
    const existing = users.find((u) => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (existing) {
      setError('Este correo electrónico ya está registrado. Inicia sesión o usa otro.');
      return;
    }

    setLoading(true);

    try {
      // Try backend registration
      const apiUrl = import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ownerName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          workshopName: workshopName.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg('¡Taller registrado con éxito! Entrando al sistema...');

        // Register in local user list
        addUser({
          name: ownerName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          phone: regPhone.trim(),
          role: 'OWNER',
          isActive: true,
        });

        // Reset workshop profile store to a clean state for this new workshop
        useWorkshopStore.getState().resetToCleanProfile(workshopName.trim());
        useWorkshopStore.getState().updateWorkshop({
          ownerName: ownerName.trim(),
          email: regEmail.trim().toLowerCase(),
          phone: regPhone.trim(),
        });

        setTimeout(() => {
          handleLoginUser(
            {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: 'OWNER',
              phone: regPhone.trim(),
              workshopId: data.user.workshopId,
              workshopName: data.user.workshopName || workshopName.trim(),
            },
            data.token
          );
        }, 800);
        return;
      } else {
        const errData = await res.json().catch(() => ({ error: '' }));
        if (errData.error) {
          setError(errData.error);
          setLoading(false);
          return;
        }
      }
    } catch {
      // In case server is offline/unreachable, register locally
    }

    // Local registration fallback
    setSuccessMsg('¡Taller creado con éxito! Iniciando sesión...');
    const newUserId = 'usr-' + Date.now();
    addUser({
      name: ownerName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      phone: regPhone.trim(),
      role: 'OWNER',
      isActive: true,
    });

    // Reset workshop profile store to a clean state for this new workshop
    useWorkshopStore.getState().resetToCleanProfile(workshopName.trim());
    useWorkshopStore.getState().updateWorkshop({
      ownerName: ownerName.trim(),
      email: regEmail.trim().toLowerCase(),
      phone: regPhone.trim(),
    });

    setTimeout(() => {
      handleLoginUser({
        id: newUserId,
        name: ownerName.trim(),
        email: regEmail.trim().toLowerCase(),
        role: 'OWNER',
        phone: regPhone.trim(),
        workshopId: 'ws-' + Date.now(),
        workshopName: workshopName.trim(),
      });
    }, 700);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    const clean = forgotIdentifier.trim().toLowerCase();
    if (!clean) {
      setForgotError('Por favor ingresa tu correo electrónico o teléfono registrado.');
      return;
    }
    setForgotLoading(true);

    // Pre-open window to ensure popup blocker does not prevent WhatsApp from opening after async fetch
    let waWindow: Window | null = null;
    try {
      waWindow = window.open('about:blank', '_blank');
    } catch {
      // Ignored if browser strictly blocks initial window
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
      const res = await fetch(`${apiUrl}/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (waWindow) waWindow.close();
        setForgotError(data.error || 'No se pudo generar el código de recuperación.');
        setForgotLoading(false);
        return;
      }

      // Automatically dispatch WhatsApp window with the recovery message
      if (data.whatsappUrl) {
        if (waWindow && !waWindow.closed) {
          waWindow.location.href = data.whatsappUrl;
        } else {
          window.open(data.whatsappUrl, '_blank');
        }
      } else if (waWindow) {
        waWindow.close();
      }

      setForgotData(data);
      setForgotStep('verify');
      setForgotLoading(false);
    } catch {
      if (waWindow) waWindow.close();
      setForgotError('Error de conexión con el servidor. Verifica tu internet.');
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    const cleanOtp = forgotOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setForgotError('Ingresa el código de seguridad de 6 dígitos.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }
    setForgotLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://rumilcar-taller.onrender.com/api';
      const res = await fetch(`${apiUrl}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotData?.email || forgotIdentifier.trim().toLowerCase(),
          otp: cleanOtp,
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || 'Código incorrecto o expirado.');
        setForgotLoading(false);
        return;
      }
      // Success!
      setShowForgotModal(false);
      setEmail(forgotData?.email || forgotIdentifier.trim().toLowerCase());
      setPassword('');
      setSuccessMsg('¡Contraseña restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña.');
      setForgotLoading(false);
    } catch {
      setForgotError('Error al restablecer la contraseña. Verifica tu conexión.');
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern" />

      {/* Floating Theme Toggle in top-right */}
      <button
        type="button"
        className="login-theme-floating"
        onClick={toggleTheme}
        title={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      >
        {isLight ? <Moon size={16} color="#f59e0b" /> : <Sun size={16} color="#f59e0b" />}
        <span>{isLight ? 'Modo Oscuro' : 'Modo Claro'}</span>
      </button>

      <div className="login-card animate-scale-in">
        <div className="login-header">
          <div className="login-logo">
            <img src="/logo-tight.png" alt="Rumilcarapp" className="login-brand-img" />
            <span className="login-logo-text">
              Rumilcar<span className="login-logo-accent">app</span>
            </span>
          </div>
          <h1 className="login-title">
            {mode === 'login' ? 'Control de Acceso' : 'Registro de Taller'}
          </h1>
          <p className="login-subtitle">
            {mode === 'login'
              ? 'Inicia sesión con tu usuario o selecciona un perfil'
              : 'Crea tu cuenta de taller y comienza a gestionar en minutos'}
          </p>
        </div>

        {/* Tab Switcher: Iniciar Sesión vs Registrar Taller */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
              setSuccessMsg('');
            }}
          >
            <LogIn size={15} /> Iniciar Sesión
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
              setSuccessMsg('');
            }}
          >
            <UserPlus size={15} /> Registrar Taller
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}
        {successMsg && (
          <div className="login-success">
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
            {successMsg}
          </div>
        )}

        {/* MODE 1: LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="login-form">
            <Input
              label="Correo Electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={16} />}
              placeholder="tu@email.com"
              required
            />

            <Input
              label="Contraseña"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              placeholder="Tu contraseña"
              required
              suffix={
                <button
                  type="button"
                  className="pass-toggle"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setForgotIdentifier(email || '');
                  setForgotStep('request');
                  setForgotError('');
                  setForgotOtp('');
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
                  setForgotData(null);
                  setShowForgotModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#22c55e',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 0',
                }}
              >
                <MessageSquare size={14} />
                <span>¿Olvidaste tu contraseña? Recupérala vía WhatsApp</span>
              </button>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
              Iniciar Sesión
            </Button>

            <p className="login-footer-text" style={{ marginTop: '16px' }}>
              ¿Nuevo taller?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Crea tu cuenta aquí
              </button>
            </p>
          </form>
        ) : (
          /* MODE 2: REGISTER WORKSHOP FORM */
          <form onSubmit={handleRegisterSubmit} className="login-form">
            <Input
              label="Nombre del Taller Mecánico"
              type="text"
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              icon={<Wrench size={16} />}
              placeholder="Ej: Taller Mecánico Hermanos Pérez"
              required
            />

            <Input
              label="Tu Nombre Completo (Propietario / Encargado)"
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              icon={<User size={16} />}
              placeholder="Ej: Carlos Pérez"
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Input
                label="Correo Electrónico"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                icon={<Mail size={16} />}
                placeholder="carlos@taller.com"
                required
              />

              <Input
                label="Teléfono / WhatsApp"
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                icon={<Phone size={16} />}
                placeholder="0412-1234567"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Input
                label="Contraseña"
                type={showRegPass ? 'text' : 'password'}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                icon={<Lock size={16} />}
                placeholder="Mínimo 6 caracteres"
                required
                suffix={
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowRegPass(!showRegPass)}
                    tabIndex={-1}
                  >
                    {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <Input
                label="Confirmar Contraseña"
                type={showRegPass ? 'text' : 'password'}
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                icon={<Lock size={16} />}
                placeholder="Repite la contraseña"
                required
              />
            </div>

            {/* Experience theme picker */}
            <div>
              <div className="theme-selector-label">
                <Sparkles size={14} color="var(--color-primary)" />
                Experiencia visual inicial:
              </div>
              <div className="theme-choice-group">
                <button
                  type="button"
                  className={`theme-choice-btn ${!isLight ? 'active' : ''}`}
                  onClick={() => {
                    if (isLight) toggleTheme();
                  }}
                >
                  <Moon size={15} /> Modo Oscuro (Recomendado)
                </button>
                <button
                  type="button"
                  className={`theme-choice-btn ${isLight ? 'active' : ''}`}
                  onClick={() => {
                    if (!isLight) toggleTheme();
                  }}
                >
                  <Sun size={15} /> Modo Claro
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
              Registrar Taller y Comenzar
            </Button>

            <p className="login-footer-text" style={{ marginTop: '4px' }}>
              ¿Ya tienes una cuenta registrada?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Inicia sesión aquí
              </button>
            </p>
          </form>
        )}
      </div>

      {/* WhatsApp Password Recovery Modal */}
      {showForgotModal && (
        <Modal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
          title="Recuperar Contraseña vía WhatsApp"
          size="md"
        >
          <div style={{ padding: '8px 0' }}>
            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <div style={{
                    background: '#22c55e',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    <MessageSquare size={18} />
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-primary)' }}>
                    <strong>Protocolo de Seguridad Oficial:</strong>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
                      Ingresa tu correo electrónico registrado o el teléfono de tu taller. Generaremos un código de verificación exclusivo de 6 dígitos que podrás enviar directamente a nuestro canal de soporte de WhatsApp.
                    </p>
                  </div>
                </div>

                {forgotError && <div className="login-error" style={{ marginBottom: 0 }}>{forgotError}</div>}

                <Input
                  label="Correo Electrónico o Teléfono Registrado"
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  icon={<Mail size={16} />}
                  placeholder="Ej: dhernandez888@gmail.com"
                  required
                />

                <Button
                  type="submit"
                  fullWidth
                  loading={forgotLoading}
                  size="lg"
                  style={{
                    backgroundColor: '#22c55e',
                    borderColor: '#22c55e',
                    color: '#ffffff',
                    fontWeight: 700,
                  }}
                  icon={<MessageSquare size={18} />}
                >
                  Generar Código y Conectar con WhatsApp
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.06)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '10px',
                  padding: '16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#22c55e',
                  }}>
                    <ShieldCheck size={26} />
                  </div>

                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Código Enviado Automáticamente por WhatsApp
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '400px', lineHeight: 1.5 }}>
                    Hemos despachado tu código de seguridad de 6 dígitos al WhatsApp registrado:{' '}
                    <strong style={{ color: '#22c55e', fontWeight: 700 }}>
                      {forgotData?.phoneMasked || forgotData?.phone || '04141144532'}
                    </strong>
                  </div>

                  <div style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px dashed rgba(59, 130, 246, 0.35)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    marginTop: '2px',
                    lineHeight: 1.4,
                  }}>
                    🔒 <strong>Por estricta seguridad:</strong> El código no se muestra en esta pantalla. Revisa el mensaje enviado a tu WhatsApp e ingrésalo a continuación.
                  </div>

                  {forgotData?.whatsappUrl && (
                    <a
                      href={forgotData.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginTop: '6px',
                        background: 'transparent',
                        border: '1px solid #22c55e',
                        color: '#22c55e',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <MessageSquare size={14} />
                      <span>¿No se abrió WhatsApp? Haz clic aquí para abrirlo</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {forgotError && <div className="login-error" style={{ marginBottom: 0 }}>{forgotError}</div>}

                <Input
                  label="Código de Seguridad (6 dígitos)"
                  type="text"
                  maxLength={6}
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                  icon={<KeyRound size={16} />}
                  placeholder="Ingresa los 6 dígitos"
                  required
                />

                <Input
                  label="Nueva Contraseña (mínimo 6 caracteres)"
                  type={showForgotPass ? 'text' : 'password'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  icon={<Lock size={16} />}
                  placeholder="Tu nueva contraseña"
                  required
                  suffix={
                    <button
                      type="button"
                      className="pass-toggle"
                      onClick={() => setShowForgotPass(!showForgotPass)}
                      tabIndex={-1}
                    >
                      {showForgotPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                <Input
                  label="Confirmar Nueva Contraseña"
                  type={showForgotPass ? 'text' : 'password'}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  icon={<Lock size={16} />}
                  placeholder="Repite tu nueva contraseña"
                  required
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForgotStep('request')}
                    icon={<ArrowLeft size={16} />}
                  >
                    Atrás
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={forgotLoading}
                    size="lg"
                  >
                    Restablecer y Guardar Contraseña
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

