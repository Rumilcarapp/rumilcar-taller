import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useUserManagementStore } from '../../store/useUserManagementStore';
import { useThemeStore } from '../../store/themeStore';
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
} from 'lucide-react';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { users, addUser, addAuditLog } = useUserManagementStore();
  const { isLight, toggleTheme } = useThemeStore();

  // Mode: login or register
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('admin@taller.com');
  const [password, setPassword] = useState('123456');
  const [showPass, setShowPass] = useState(false);

  // Register form state
  const [workshopName, setWorkshopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginUser = (userToLogin: any, token?: string) => {
    const userWorkshop = userToLogin.workshopName || 'Rumilcar Taller Mecánico';
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

    navigate('/');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Try local user store first for quick login
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

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

    // 2. Try remote API login
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
      }
    } catch {
      // Remote call failed, allow demo fallback below
    }

    // 3. Fallback demo access for testing
    handleLoginUser({
      id: 'usr-demo',
      name: email.split('@')[0],
      email: cleanEmail,
      role: 'ADMIN',
      phone: '',
    });
    setLoading(false);
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
            <div className="login-logo-icon">R</div>
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

            <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
              Iniciar Sesión
            </Button>

            {/* Quick profile switcher for demo & testing permissions */}
            <div
              style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ShieldCheck size={14} color="#3b82f6" /> Acceso Rápido por Rol (Prueba):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {users.slice(0, 4).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword(u.password || '123456');
                      handleLoginUser(u);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-surface)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <strong style={{ fontSize: '11px' }}>{u.name.split(' ')[0]}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="login-footer-text" style={{ marginTop: '8px' }}>
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
    </div>
  );
};

