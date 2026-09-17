# Sistema Empresarial de Recuperación de Contraseñas vía WhatsApp Business Cloud API
## Rumilcar App — Documentación Técnica y Operativa

Este documento detalla la arquitectura, configuración, variables de entorno, plantillas de Meta y guía de pruebas para el protocolo oficial de recuperación de contraseñas de **Rumilcar App**.

---

## 1. Arquitectura de Seguridad Implementada

```
+-------------------------------------------------------------------------------+
|                                CLIENTE (Frontend)                             |
|                                                                               |
| [Paso 1: Solicitud]       [Paso 2: OTP (6 dígitos)]   [Paso 3: Nueva Contraseña]|
| Solo correo/teléfono       Enmascarado +58 414 •••     Mínimo 6 caracteres     |
| Mensaje anti-enumeración   Countdown 15m / Resend 60s  Token de 1 solo uso     |
| Ningún código en pantalla  Sin wa.me en navegador      Inicia sesión inmediata |
+-----------------------+---------------------------------------+---------------+
                        |                                       |
                        | REST HTTP                             | REST HTTP
                        v                                       v
+-------------------------------------------------------------------------------+
|                            SERVIDOR NODE.JS / EXPRESS                         |
|                                                                               |
| - Rate Limiting por IP y cuenta (forgotPasswordRateLimiter & verifyOtpRateLimiter)
| - Generación criptográfica: crypto.randomInt(100000, 1000000)                |
| - Hash de OTP: SHA-256 + Pepper secreto del sistema (sin texto plano)         |
| - Token temporal de un solo uso: crypto.randomBytes(32) (10 minutos TTL)     |
| - Revocación global de sesiones: tokenVersion en User e invalidación en JWT   |
| - Capa WhatsApp desacoplada (IWhatsAppProvider -> MetaWhatsAppProvider)       |
+-----------------------+---------------------------------------+---------------+
                        |                                       |
                        | Supabase Pooler (5432)                | Meta Graph API
                        v                                       v
+------------------------------------+ +----------------------------------------+
|      POSTGRESQL (Supabase)         | |       META WHATSAPP CLOUD API          |
|                                    | |                                        |
| - PasswordResetToken (tokens, hash)| | - Plantilla oficial de autenticación   |
| - User (tokenVersion, passwordHash)| | - Envío servidor a servidor (REST)     |
| - AuditLog (trazabilidad completa) | | - Registro de providerMessageId        |
+------------------------------------+ +----------------------------------------+
```

---

## 2. Variables de Entorno Requeridas

Añadir en el archivo `.env` del backend (`server/.env`) y en el panel de configuración de **Render**:

```env
# ===============================================
# PROVEEDOR OFICIAL DE WHATSAPP BUSINESS (META)
# ===============================================

# Identificador del proveedor activo (por defecto: meta)
WHATSAPP_PROVIDER=meta

# Endpoint base de Meta Graph API
WHATSAPP_API_URL=https://graph.facebook.com/v19.0

# ID del Número Telefónico en Meta for Developers (Phone Number ID)
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id_aqui

# ID de la Cuenta Comercial de WhatsApp (WABA ID)
WHATSAPP_BUSINESS_ACCOUNT_ID=tu_business_account_id_aqui

# Token de Acceso del Sistema (Permanent System User Access Token con permiso whatsapp_business_messaging)
WHATSAPP_ACCESS_TOKEN=tu_system_user_access_token_aqui

# Nombre de la Plantilla de Autenticación aprobada en Meta Business Manager
WHATSAPP_AUTH_TEMPLATE_NAME=rumilcar_auth_code

# Código de idioma de la plantilla
WHATSAPP_TEMPLATE_LANGUAGE=es
```

> [!CAUTION]
> **Seguridad de Credenciales**: Nunca agregues `WHATSAPP_ACCESS_TOKEN` en el frontend ni en repositorios públicos. Las peticiones a Meta se realizan exclusivamente desde el backend Node.js.

---

## 3. Plantilla de Autenticación en Meta Business Manager

Para crear la plantilla en **Meta Business Suite > Herramientas de Mensajería > Administrador de WhatsApp > Plantillas de mensajes**:

- **Nombre de la plantilla:** `rumilcar_auth_code`
- **Categoría:** Autenticación (`AUTHENTICATION`)
- **Idioma:** Español (`es`)
- **Cuerpo del mensaje:**
  ```text
  Rumilcar: tu código de recuperación es {{1}}. Expira en {{2}} minutos. Si no solicitaste este código, ignora este mensaje.
  ```
- **Parámetros:**
  - `{{1}}`: Código OTP numérico de 6 dígitos.
  - `{{2}}`: Minutos de expiración (ej: `15`).
- **Botón (opcional):** Botón de copiar código (tipo `COPY_CODE`).

---

## 4. Endpoints de la API

| Método | Endpoint | Rate Limit | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/forgot-password/request` | 10 / 15min | Solicita OTP. Anti-enumeración: responde idéntico si existe o no. |
| `POST` | `/api/auth/forgot-password/resend` | 10 / 15min | Reenvía código respetando cooldown de 60 segundos. |
| `POST` | `/api/auth/forgot-password/verify` | 15 / 15min | Valida los 6 dígitos. Máx 5 intentos. Devuelve `resetToken` de un solo uso. |
| `POST` | `/api/auth/forgot-password/reset` | 10 / 15min | Cambia contraseña con `resetToken`, incrementa `tokenVersion` y revoca sesiones. |

---

## 5. Guía de Pruebas Manuales en Desarrollo y Producción

1. **Prueba de Solicitud Exitosa:**
   - Ir a la pantalla de inicio de sesión.
   - Clic en *"¿Olvidaste tu contraseña? Recupérala vía WhatsApp"*.
   - Ingresar el correo `dhernandez888@gmail.com`.
   - Clic en *"Enviar Código por WhatsApp"*.
   - Constatar:
     - No se abre ninguna ventana emergente `wa.me`.
     - La pantalla pasa al Paso 2 con el teléfono enmascarado `+58 414 ••• 4532`.
     - El temporizador de expiración (15:00) y de reenvío (60s) inician la cuenta regresiva.
2. **Prueba Anti-Enumeración:**
   - Ingresar un correo ficticio `noexiste@gmail.com`.
   - Constatar:
     - El sistema devuelve el mismo mensaje de éxito sin revelar si la cuenta existe o no.
3. **Prueba de Intentos Fallidos:**
   - En el Paso 2, ingresar un código erróneo como `000000`.
   - Constatar:
     - Mensaje de error: *"Código de verificación incorrecto. Intentos restantes: 4"*.
     - Al quinto intento, el token se invalida automáticamente.
4. **Prueba de Cambio y Revocación de Sesiones:**
   - Tras ingresar el código correcto, pasar al Paso 3.
   - Definir la nueva contraseña.
   - Verificar en la base de datos que `tokenVersion` incrementó y que las sesiones JWT emitidas previamente quedan invalidadas.
