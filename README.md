# 🎫 EventPass — Plataforma de Gestión de Eventos y Boletos

**EventPass** es una plataforma integral para la publicación, venta, emisión y control de acceso de boletos con códigos QR dinámicos, validación de pagos bancarios y escáner móvil para staff.

---

## 🚀 Inicio Rápido

### 1. Requisitos
- Node.js 18+ instalado
- npm / yarn / pnpm

### 2. Instalación y Ejecución Local
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🔑 Accesos, Roles y Credenciales

Para consultar la guía detallada de rutas y credenciales de acceso, revisa el archivo dedicado:  
👉 **[Guía Completa de Accesos (ACCESOS.md)](./ACCESOS.md)**

### Resumen de Rutas Principales:

| Panel | Ruta | Credenciales Predeterminadas |
| :--- | :--- | :--- |
| **👑 Super Admin** | [`/super`](http://localhost:3000/super) | **Usuario:** `Admin123`<br>**Contraseña:** `Mimamame21` |
| **🎪 Organizador** | [`/admin`](http://localhost:3000/admin) | **Celular:** *(10 dígitos del registro)*<br>**Contraseña:** *(Asignada por Super Admin)* |
| **📱 Staff Puerta** | [`/staff`](http://localhost:3000/staff) | PIN del evento configurado por el Organizador |
| **🎟️ Cartelera** | [`/`](http://localhost:3000/) | Acceso Público |
| **📥 Mis Boletos** | [`/mis-boletos`](http://localhost:3000/mis-boletos) | Consulta con Celular o Correo |
| **📝 Registro Productor** | [`/solicitar-organizador`](http://localhost:3000/solicitar-organizador) | Formulario de Solicitud |

---

## 🛠️ Tecnologías Utilizadas

- **Frontend & Backend:** Next.js (App Router, React, TypeScript)
- **Estilos:** Tailwind CSS con componentes Lucide Icons
- **Base de Datos & Almacenamiento:** SQLite local (`better-sqlite3`) y soporte para Firebase Firestore
- **Lector de Códigos QR:** `html5-qrcode` para escaneo por cámara móvil en PWA
- **Notificaciones y Correo:** Nodemailer (SMTP / Gmail) y enlaces directos de WhatsApp Web (`wa.me`)

---

## 📦 Despliegue y Producción

Para compilar y empaquetar la aplicación para producción:

```bash
npm run build
npm run start
```
