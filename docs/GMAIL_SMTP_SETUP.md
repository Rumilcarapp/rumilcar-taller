# Configuración del Sistema Oficial de Recuperación por Correo Gmail (SMTP)

Este documento detalla la arquitectura, configuración y despliegue del sistema oficial de recuperación de contraseñas de **Rumilcar App** utilizando **Gmail**. En desarrollo puede usarse SMTP directo; en producción sobre Render se recomienda el relay HTTPS de Vercel porque evita bloqueos de puertos SMTP.

---

## 1. Arquitectura del Flujo de Recuperación

El sistema reemplaza por completo cualquier dependencia de WhatsApp para la autenticación y utiliza un flujo de grado empresarial:

```
[Usuario en /login] 
       │
       ▼ (1) Clic en "¿Olvidaste tu contraseña? Recupérala por correo"
       │
[Modal Solicita Email] ──► POST /api/auth/forgot-password/request
                                 │
                                 ├── Cooldown de 60s & Rate Limit
                                 ├── Anti-Enumeration (Respuesta idéntica exista o no la cuenta)
                                 ├── Generación de Token Criptográfico (32 bytes / 64 hex)
                                 ├── Almacenamiento de Hash SHA-256 + Pepper en PostgreSQL (15 min TTL)
                                 └── Envío de Email HTML responsive vía Gmail SMTP local o relay HTTPS en producción
                                           │
                                           ▼
                             [Cliente recibe Email en Gmail]
                                           │
                                           ▼ (2) Clic en "Restablecer Contraseña"
                                           │
[Página Pública /restablecer-contrasena?token=...]
       │
       ├── Valida token activo con POST /api/auth/forgot-password/verify-token
       ├── Inputs: Nueva Contraseña (mín 8 caracteres) + Confirmar
       └── Envío: POST /api/auth/forgot-password/reset
                 │
                 ├── Comprobación del Hash en base de datos
                 ├── Actualización con Bcrypt (10 rounds)
                 ├── tokenVersion += 1 (REVOCACIÓN GLOBAL DE SESIONES)
                 ├── Marca el token como consumido (un solo uso)
                 ├── Registra entrada en AuditLog
                 └── Envía correo de confirmación de cambio
```

---

## 2. Variables de Entorno del Servidor

En el servidor (`server/.env` local y en las variables de entorno de **Render**):

| Variable | Valor Recomendado | Descripción |
|---|---|---|
| `EMAIL_PROVIDER` | `gmail` en local / `relay` en Render | Proveedor activo de correo |
| `SMTP_HOST` | `smtp.gmail.com` | Host del servidor SMTP de Google |
| `SMTP_PORT` | `465` | Puerto SSL (o `587` para STARTTLS) |
| `SMTP_SECURE` | `true` | `true` para puerto 465, `false` para 587 |
| `SMTP_USER` | `redesmultiserviciosrumilcar@gmail.com` | Correo oficial del taller en Gmail |
| `SMTP_PASSWORD` | `[Contraseña de Aplicación de 16 letras]` | Generada en Google Account (sin espacios) |
| `MAIL_FROM` | `"Rumilcar App <redesmultiserviciosrumilcar@gmail.com>"` | Encabezado remitente |
| `EMAIL_RELAY_URL` | `https://rumilcarapp.vercel.app/api/send-email` | Endpoint HTTPS del relay en producción |
| `EMAIL_RELAY_SECRET` | `[Secreto compartido con Vercel]` | Autenticación entre Render y el relay |
| `PASSWORD_RESET_PEPPER` | `[Secreto aleatorio independiente]` | Protección adicional del hash del token |
| `FRONTEND_URL` | `https://rumilcarapp.vercel.app` | URL base de la aplicación web cliente |
| `PASSWORD_RESET_EXPIRES_MINUTES` | `15` | Tiempo de vida del enlace |
| `PASSWORD_RESET_RATE_LIMIT_SECONDS` | `60` | Cooldown mínimo entre solicitudes |

---

## 3. Cómo Generar la Contraseña de Aplicación en Google

Si requieres regenerar o verificar la contraseña de aplicación de 16 caracteres:

1. Inicia sesión en Google con la cuenta oficial: **`redesmultiserviciosrumilcar@gmail.com`**.
2. Ve a [https://myaccount.google.com/security](https://myaccount.google.com/security).
3. Asegúrate de tener activada la **Verificación en dos pasos (2FA)**.
4. Entra directamente en [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
5. Escribe un nombre para la aplicación (por ejemplo: `Rumilcar App Recuperacion`).
6. Haz clic en **Crear**.
7. Google te mostrará una ventana con un código amarillo de 16 letras (ejemplo: `ybzg inwp dmwn lkcg`).
8. Copia esa clave y colócala en `SMTP_PASSWORD` en el panel de Render.

---

## 4. Configuración en Render (Producción)

En tu servicio backend en Render (`rumilcar-api`):

1. Ingresa al Dashboard de [Render](https://dashboard.render.com).
2. Selecciona tu servicio **`rumilcar-api`**.
3. Haz clic en la pestaña **Environment**.
4. Configura `EMAIL_PROVIDER=relay`, `EMAIL_RELAY_URL` y `EMAIL_RELAY_SECRET`.
5. Si vas a usar SMTP directo, configura `EMAIL_PROVIDER=gmail`, `SMTP_USER`, `SMTP_PASSWORD` y `MAIL_FROM`.
6. Configura también `PASSWORD_RESET_PEPPER` con un valor aleatorio largo.
7. Guarda los cambios. Render reiniciará el servicio con el nuevo valor en menos de un minuto.

---

## 5. Medidas de Seguridad Implementadas

1. **Anti-Enumeración:** Al solicitar un restablecimiento, el sistema siempre devuelve un mensaje genérico idéntico, impidiendo que terceros determinen si un correo está o no registrado en el taller.
2. **Tokens Criptográficos:** Se generan 32 bytes con `crypto.randomBytes`, codificados en hexadecimal (64 caracteres). Solo el hash SHA-256 con pepper se guarda en base de datos; el enlace recibido por el usuario es el único que contiene la llave original.
3. **Revocación Global de Sesiones:** Al completarse el restablecimiento, el campo `tokenVersion` del usuario en PostgreSQL se incrementa automáticamente. Cualquier sesión JWT anterior queda instantáneamente revocada en todos los dispositivos.
4. **Protección contra Fuerza Bruta:** Rate limiter estricto de solicitudes y un cooldown de 60 segundos por usuario.
5. **Auditoría:** Cada evento de solicitud, fallo y éxito se registra en la tabla `AuditLog` para cumplimiento y trazabilidad.
