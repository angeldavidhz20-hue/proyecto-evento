# 🔑 EventPass — Guía de Accesos y Roles de la Plataforma

Este documento contiene la lista de rutas, credenciales predeterminadas y la guía paso a paso de uso para cada uno de los roles del sistema (**Super Admin**, **Organizadores**, **Staff de Control de Acceso** y **Público General**).

---

## 📌 Tabla Rápida de Accesos

| Rol | Enlace / Ruta | Método de Acceso / Credenciales | Descripción Principal |
| :--- | :--- | :--- | :--- |
| **👑 Super Admin** | [`/super`](/super) | **Usuario:** `Admin123`<br>**Contraseña:** `Mimamame21` | Control maestro, aprobación de nuevos organizadores y métricas globales. |
| **🎪 Organizador** | [`/admin`](/admin) | **Celular:** *(10 dígitos del registro)*<br>**Contraseña:** *(Asignada por Super Admin vía WhatsApp)* | Creación y administración de eventos, validación de pagos y lista de asistentes. |
| **📱 Staff en Puerta** | [`/staff`](/staff) | PIN del evento o link generado por el Organizador | Escáner QR con cámara para control de acceso en la entrada del evento. |
| **🎟️ Público General** | [`/`](/) | Acceso Libre | Cartelera de eventos disponibles, registro y compra de boletos. |
| **📥 Mis Boletos** | [`/mis-boletos`](/mis-boletos) | Celular o correo del comprador | Consulta, descarga y visualización de boletos y códigos QR. |
| **📝 Postular Organizador**| [`/solicitar-organizador`](/solicitar-organizador) | Formulario libre (Nombre + WhatsApp) | Registro para personas que deseen crear eventos en la plataforma. |

---

## 📖 Guía de Uso Paso a Paso

### 1. 👑 Panel de Super Admin (`/super`)
Este panel es el centro de mando maestro de la plataforma.

1. **Ingreso:**
   - Ve a `http://localhost:3000/super` (o tu dominio en producción).
   - Ingresa con:
     - **Usuario:** `Admin123`
     - **Contraseña:** `Mimamame21`
2. **Funciones Clave:**
   - **Solicitudes de Organizadores:** Verás las postulaciones enviadas desde `/solicitar-organizador`.
   - **Aprobar Solicitud:** Al dar clic en **Aprobar**, el sistema genera automáticamente una contraseña segura y un enlace directo a WhatsApp (`wa.me`) con el mensaje listo para enviarle su contraseña y acceso a `/admin`.
   - **Métricas:** Supervisión de inscripciones, asistencias efectivas y frecuencia de números celulares registrados.
   - **Mantenimiento:** Herramientas para reiniciar o depurar datos de prueba.

---

### 2. 🎪 Panel de Organizador (`/admin`)
Panel individual para los productores y creadores de eventos aprobados.

1. **Ingreso:**
   - Ve a `http://localhost:3000/admin`.
   - Ingresa con:
     - **Número Celular:** Tus 10 dígitos (ej. `9671234567`).
     - **Contraseña:** La clave recibida por WhatsApp enviada por el Super Admin.
2. **Funciones Clave:**
   - **Crear Eventos:** Pulsa en *"+ Crear Nuevo Evento"* (`/admin/evento/nuevo`). Define título, fecha, lugar, descripción, precio y cupos.
   - **Administración del Evento (`/admin/evento/[id]`):**
     - **Revisión de Pagos:** Si el evento es de pago, aquí revisas los comprobantes de transferencia subidos por los asistentes y los apruebas para liberar su boleto con QR.
     - **Lista de Asistentes:** Exportación y visualización en tiempo real de inscritos.
     - **Acceso para Staff:** Genera el PIN o el enlace directo para que tu equipo en puerta pueda escanear boletos sin tener acceso a tus finanzas ni a editar el evento.

---

### 3. 📱 Staff en Puerta y Escáner QR (`/staff`)
Módulo ligero optimizado como PWA móvil para validación de boletos.

1. **Ingreso:**
   - El organizador comparte el link directo con el PIN del evento (`/staff?event=...&pin=...`) o el personal ingresa a `/staff` e introduce el PIN del evento.
2. **Uso:**
   - Enciende la cámara del dispositivo móvil.
   - Apunta al código QR del boleto del asistente (físico o desde su pantalla).
   - **Respuestas visuales y sonoras:**
     - 🟢 **Verde (Válido):** El boleto es legítimo y se registra la asistencia con fecha y hora.
     - 🟡 **Amarillo (Ya utilizado):** El boleto ya fue escaneado previamente (evita reingresos no autorizados).
     - 🔴 **Rojo (No válido / Error):** Boleto inexistente, no pagado o correspondiente a otro evento.
   - Permite búsqueda manual por folio en caso de que el asistente tenga la pantalla rota o sin brillo.

---

### 4. 🎟️ Flujo del Asistente / Comprador
1. Ingresa a la Cartelera (`/`) y elige un evento.
2. Completa su nombre, WhatsApp y correo.
3. Si el evento es de pago, sube su comprobante de transferencia bancaria.
4. Consulta y descarga su boleto en cualquier momento desde `/mis-boletos` usando su número celular o correo.

---

## 🔒 Notas de Seguridad

- **Archivos de Entorno (`.env.local`):** Las credenciales de Firebase, Base de Datos y SMTP para envío de correos residen únicamente en `.env.local` y están excluidas de Git mediante `.gitignore`.
- **Cierre de Sesión:** Las sesiones de Super Admin y Organizador pueden cerrarse en cualquier momento mediante el botón *"Cerrar Sesión"* en la barra superior.
