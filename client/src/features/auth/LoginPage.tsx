import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { useUserManagementStore } from '../../store/useUserManagementStore';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, UserCheck } from 'lucide-react';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { users, addAuditLog } = useUserManagementStore();

  const [email, setEmail] = useState('admin@taller.com');
  const [password, setPassword] = useState('admin');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginUser = (userToLogin: any) => {
    login(
      {
        id: userToLogin.id,
        name: userToLogin.name,
        email: userToLogin.email,
        role: userToLogin.role,
        phone: userToLogin.phone,
        workshopId: '1',
        workshopName: 'Rumilcar Taller Mecánico',
      },
      'jwt-token-' + Date.now()
    );

    addAuditLog({
      userId: userToLogin.id,
      userName: userToLogin.name,
      userRole: userToLogin.role,
      action: 'Inicio de Sesión',
      module: 'auth',
      details: 'Ingreso al sistema con rol ' + userToLogin.role,
    });

    navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const found = users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!found) {
        // Fallback for demo if typed random
        handleLoginUser({
          id: 'usr-demo',
          name: email.split('@')[0],
          email,
          role: 'ADMIN',
          phone: '',
        });
        setLoading(false);
        return;
      }

      if (!found.isActive) {
        setError('Este usuario se encuentra inactivo. Contacte al administrador.');
        setLoading(false);
        return;
      }

      handleLoginUser(found);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern" />
      <div className="login-card animate-scale-in" style={{ maxWidth: '440px' }}>
        <div className="login-header">
          <div className="login-logo">
            <div className="login-logo-icon">R</div>
            <span className="login-logo-text">Rumilcar<span className="login-logo-accent">app</span></span>
          </div>
          <h1 className="login-title">Control de Acceso</h1>
          <p className="login-subtitle">Inicia sesión con tu usuario o selecciona un perfil</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <Input
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            placeholder="tu@email.com"
          />

          <Input
            label="Contraseña"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            placeholder="Tu contraseña"
            suffix={
              <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
            Iniciar Sesión
          </Button>

          {/* Quick profile switcher for demo & testing permissions */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} color="#3b82f6" /> Acceso Rápido por Rol (Prueba):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {users.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password || '123');
                    handleLoginUser(u);
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-surface)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <strong style={{ fontSize: '11px' }}>{u.name.split(' ')[0]}</strong>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{u.role}</span>
                </button>
              ))}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
