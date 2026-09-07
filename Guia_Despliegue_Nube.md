# 🚀 Guía de Despliegue en la Nube con Base de Datos Online (Costo $0 USD)

Esta guía te explica paso a paso cómo dejar tu software de taller mecánico funcionando en la nube con **Supabase (Base de datos PostgreSQL)** y **Vercel / Render** sin pagar nada.

---

## 📋 Resumen de la Arquitectura Gratuita

1. **Base de Datos:** **Supabase** *(PostgreSQL en la nube, 500 MB gratis).*
2. **Backend API:** **Render** o **Railway** *(Servidor Node.js/Express, 750 horas gratis al mes).*
3. **Frontend Web:** **Vercel** *(App React/Vite con CDN global y SSL gratis).*

---

## 🛠️ PASO 1: Crear tu Base de Datos Gratuita en Supabase (3 minutos)

1. Ingresa a **[supabase.com](https://supabase.com)** e inicia sesión con tu cuenta de GitHub o correo.
2. Haz clic en **"New Project"** (Nuevo Proyecto).
3. Completa los datos:
   * **Name:** `rumilcar-taller-db`
   * **Database Password:** Elige una contraseña segura (¡guárdala bien!).
   * **Region:** Elige la más cercana (ej: *East US - North Virginia* o *South America - São Paulo*).
   * **Pricing Plan:** *Free ($0/month)*.
4. Haz clic en **"Create new project"** y espera 1 minuto a que se configure.

### 🔑 Obtener las Credenciales de Supabase:
* Ve a **Project Settings ➔ Database** y baja hasta la sección **Connection String**:
  * Selecciona la pestaña **URI** (Modo: `Transaction`).
  * Copia la URL que se ve así:
    `postgresql://postgres.[ID_PROYECTO]:[TU_CONTRASEÑA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
* Ve a **Project Settings ➔ API**:
  * Copia la **Project URL** (`https://xyz.supabase.co`).
  * Copia la **anon public key** (`eyJhbGci...`).

---

## 🛠️ PASO 2: Inicializar las Tablas en Supabase (1 comando)

1. Abre tu archivo `server/.env` y pega tu cadena de conexión en `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://postgres.[ID]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[ID].supabase.co:5432/postgres"
   ```
2. Abre la terminal en la carpeta `server` y ejecuta:
   ```bash
   npx prisma db push
   ```
   *¡Listo! En 5 segundos todas las tablas (WorkOrders, Clients, Vehicles, Inventory, Users, etc.) se crearán automáticamente en tu base de datos de Supabase.*

---

## 🛠️ PASO 3: Desplegar el Servidor Backend en Render (Gratis)

1. Ve a **[render.com](https://render.com)** y crea una cuenta gratuita.
2. Haz clic en **New + ➔ Web Service**.
3. Conecta tu repositorio de GitHub.
4. Configura:
   * **Root Directory:** `server`
   * **Build Command:** `npm install && npx prisma generate && npm run build`
   * **Start Command:** `npm start`
   * **Instance Type:** *Free ($0/mo)*.
5. En la sección **Environment Variables**, añade:
   * `DATABASE_URL` = *(Tu URL de Supabase obtenida en el Paso 1)*
   * `JWT_SECRET` = `tu_clave_secreta_de_seguridad_2026`
   * `NODE_ENV` = `production`
6. Haz clic en **Deploy Web Service**.
7. Render te dará una URL pública como: `https://rumilcar-api.onrender.com`.

---

## 🛠️ PASO 4: Desplegar el Frontend en Vercel (Gratis)

1. Ve a **[vercel.com](https://vercel.com)** e inicia sesión.
2. Haz clic en **Add New... ➔ Project**.
3. Selecciona tu repositorio de GitHub.
4. En **Root Directory**, selecciona la carpeta `client`.
5. En **Environment Variables**, añade:
   * `VITE_API_URL` = `https://rumilcar-api.onrender.com/api`
   * `VITE_SUPABASE_URL` = `https://[ID_PROYECTO].supabase.co`
   * `VITE_SUPABASE_ANON_KEY` = `[TU_ANON_KEY]`
6. Haz clic en **Deploy**.

---

## 🎉 ¡Felicidades! Tu Software ya está en la Nube
* Tu aplicación tendrá un enlace seguro con HTTPS como **`https://rumilcar-app.vercel.app`**.
* Puedes entrar desde cualquier smartphone, tablet o computadora, y todos los talleres y clientes podrán acceder en tiempo real.
