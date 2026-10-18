# Sistema de Gestión de Biblioteca BUAP

Aplicación web local para que el personal bibliotecario administre el catálogo,
los prestatarios, los préstamos, las devoluciones y las multas de una biblioteca.
El proyecto se desarrolló para la materia de Arquitectura de Software y organiza
la aplicación en capas.

El único tipo de usuario que inicia sesión y opera el sistema es el bibliotecario
(rol `administrativo`). Los alumnos, docentes y demás prestatarios se registran
como personas a quienes se les pueden otorgar préstamos; no tienen una cuenta de
acceso al sistema.

## Funcionalidades

- **RF1 — Materiales:** alta, consulta, edición y baja del catálogo; formulario
  dinámico según el tipo de material, búsqueda, filtros acumulables y paginación.
- **RF2 — Prestatarios:** administración de datos, perfiles, identificación,
  vigencia de credencial y estado del registro bibliotecario.
- **RF3 — Préstamos:** validación de elegibilidad y disponibilidad, registro de
  préstamos y renovaciones.
- **RF4 — Devoluciones y multas:** registro de devolución, actualización de
  disponibilidad, cálculo de multas y captura de pagos.
- **RF5 — Exploración del catálogo:** búsqueda por datos bibliográficos y filtros
  combinables por tipo, categoría, disponibilidad y consulta en sala.
- **Acceso administrativo:** inicio de sesión con correo y contraseña. En modo
  local se puede registrar una cuenta bibliotecaria desde la pantalla de acceso.

El sistema **no implementa apartados o reservas**, cuentas para prestatarios,
sedes, ubicación en estantería, fotografías ni un inventario de ejemplares
individuales.

## Arquitectura

```mermaid
flowchart LR
    UI[Cliente React] -->|HTTP JSON y JWT| API[Rutas y controladores Express]
    API --> LOGICA[Servicios y reglas de negocio]
    LOGICA --> DATOS[Capa de datos y consultas SQL]
    DATOS --> DB[(PostgreSQL en Supabase)]
    AUTH[Middleware JWT] -. protege .-> API
```

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Presentación | `cliente/src/` | Interfaz React, formularios, navegación y consumo de API. |
| API | `servidor/routes/`, `servidor/controllers/` | Recibe HTTP, aplica autenticación y coordina respuestas. |
| Negocio | `servidor/services/` | Valida entradas y aplica las reglas de la biblioteca. |
| Datos | `servidor/data/`, `servidor/db/` | Ejecuta SQL y administra la conexión PostgreSQL. |
| Persistencia | Proyecto Supabase | Almacena prestatarios, materiales, préstamos y multas. |

El navegador se comunica únicamente con la API de Express. El cliente no se
conecta directamente a Supabase ni contiene credenciales de la base de datos.

## Tecnologías

- Node.js y npm
- React 19, Vite 8 y Tailwind CSS 4
- Express 5
- PostgreSQL administrado por Supabase
- `pg` para acceso a PostgreSQL, `bcryptjs` para hashes de contraseñas y JWT para
  sesiones administrativas
- Node.js **20.19 o posterior**, o **22.12 o posterior** (requisito de Vite 8)

## Requisitos para ejecutar en local

1. Instala una versión compatible de [Node.js](https://nodejs.org/), que incluye
   npm.
2. Ten acceso a un proyecto Supabase con el esquema descrito en
   [Base de datos](#base-de-datos).
3. Clona o descarga este repositorio.

Si vas a clonarlo con Git:

```powershell
git clone <URL-del-repositorio>
cd biblioteca-buap
```

## Instalación y configuración

Los pasos siguientes están escritos para Windows y PowerShell. Ejecuta los
comandos desde la carpeta raíz `biblioteca-buap`.

### 1. Configura el servidor

Abre una terminal en VS Code o PowerShell:

```powershell
cd .\servidor
Copy-Item .env.example .env
npm ci
```

Edita `servidor/.env` y asigna:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | URI PostgreSQL de Supabase, con usuario, contraseña, host, puerto y base de datos. |
| `JWT_SECRET` | Sí | Secreto largo y aleatorio para firmar sesiones. No lo compartas ni lo subas al repositorio. |
| `REGISTRO_BIBLIOTECARIOS_HABILITADO` | No | `true` habilita el registro; `false` lo bloquea. Si se omite, queda habilitado fuera de producción y deshabilitado cuando `NODE_ENV=production`. |

Ejemplo de formato, con valores ficticios:

```env
DATABASE_URL=postgresql://postgres:CONTRASENA@db.PROJECT_REF.supabase.co:5432/postgres
JWT_SECRET=reemplaza-esto-por-un-secreto-largo-y-aleatorio
REGISTRO_BIBLIOTECARIOS_HABILITADO=
```

Obtén la URI desde **Supabase → Connect → Direct connection**. Si tu red no
permite conexiones IPv6, utiliza el método de conexión compatible con IPv4 que
ofrece Supabase, por ejemplo su *Session pooler*. Si la contraseña contiene
caracteres especiales, codifícalos para usarlos dentro de una URI.

El archivo `.env` contiene secretos y está excluido de Git. No pegues sus valores
en capturas, chats o documentación compartida.

### 2. Configura el cliente

En otra terminal, desde la raíz del repositorio:

```powershell
cd .\cliente
npm ci
```

El cliente local espera que la API esté disponible en
`http://localhost:3000/api`, según `cliente/src/api.js`. No requiere un archivo
`.env` para ejecutarse en local.

## Ejecutar el sistema

Mantén abiertas **dos terminales**, una para cada proceso.

**Terminal 1 — API**, desde la raíz:

```powershell
cd .\servidor
node .\index.js
```

El servidor escucha en `http://localhost:3000`. Para confirmar que está activo,
abre esa dirección; debe responder un JSON indicando que la API funciona.

**Terminal 2 — interfaz**, desde la raíz:

```powershell
cd .\cliente
npm run dev
```

Abre la dirección que indique Vite, normalmente
[`http://localhost:5173`](http://localhost:5173).

El orden recomendado es iniciar primero el servidor y luego el cliente. Para
detener cualquiera de los procesos, enfoca su terminal y presiona `Ctrl+C`.

## Primer acceso y cuentas bibliotecarias

En modo local, la pantalla `/login` permite alternar entre iniciar sesión y
crear una cuenta bibliotecaria. El alta guarda la contraseña como hash y abre la
sesión al terminar. El correo debe ser único en `usuarios`.

El registro está habilitado por defecto si `NODE_ENV` no es `production`. En
producción queda deshabilitado salvo que se configure explícitamente
`REGISTRO_BIBLIOTECARIOS_HABILITADO=true`. Como el registro habilitado permite
crear cuentas con rol administrativo, úsalo en entornos locales o de
demostración controlados; desactívalo si la API se expone a usuarios externos.

Las sesiones JWT duran 8 horas. Para cerrar la sesión, usa **Cerrar sesión** en
el menú lateral.

## Base de datos

La persistencia usa PostgreSQL de Supabase y estas tablas relacionadas:

- `usuarios`: almacena tanto prestatarios (`rol = 'prestatario'`) como cuentas
  del personal (`rol = 'administrativo'`). Los prestatarios no inician sesión.
- `materiales`: catálogo bibliográfico y equipos, con campos específicos por tipo.
- `prestamos`: prestatario, material, fechas, renovaciones, estado y devolución.
- `multas`: días de atraso, monto y estado de pago asociados a un préstamo.

La base conectada a `DATABASE_URL` debe contar con las tablas, columnas,
restricciones e índices requeridos por la aplicación. El servidor **no crea ni
migra el esquema al arrancar**. Los scripts de `servidor/migrations/` son cambios
SQL incrementales para revisar y ejecutar manualmente en Supabase cuando sean
necesarios; no son un inicializador completo ni se ejecutan automáticamente.

El proyecto incluye scripts para cambios específicos:

| Archivo | Propósito |
|---|---|
| `20261015_perfil_prestatario_buap.sql` | Añade perfil y fecha de actualización del registro bibliotecario. |
| `20261015_unicidad_identificador_prestatario.sql` | Evita identificadores duplicados entre prestatarios internos. |
| `20261015_rf3_prestamos.sql` | Añade fecha de devolución, restricciones e índices de RF3. |
| `20261015_rf4_devoluciones.sql` | Asegura una multa por préstamo e indexa devoluciones pendientes. |

Revisa el estado actual de la base antes de ejecutar cualquier script. No ejecutes
migraciones a ciegas sobre una base que ya tiene esos cambios.

### Esquema para pruebas de integración

`servidor/tests/esquema_pruebas.sql` crea las tablas y restricciones necesarias
para las pruebas en una base vacía. Es **exclusivo para una base de pruebas** y
se detiene si encuentra tablas del sistema. No lo ejecutes en la base original,
de demostración o de producción.

## Pantallas y reglas implementadas

| Ruta | Función |
|---|---|
| `/login` | Inicio de sesión y registro de bibliotecarios según configuración. |
| `/catalogo` | Catálogo, CRUD de materiales, búsqueda y filtros. |
| `/usuarios` | CRUD y seguimiento de prestatarios. |
| `/prestamos` | Registro y consulta de préstamos, renovaciones y multas. |
| `/devoluciones` | Devoluciones, historial y pago de multas. |

Todas las pantallas de operación requieren una sesión administrativa.

Reglas principales aplicadas por el sistema:

- Los tipos de material son `libro`, `tesis`, `revista`, `material_especial`,
  `cd`, `dvd`, `ipad` y `equipo_computo`. Las tesis, revistas y materiales
  especiales son de consulta en sala; los iPads y equipos se controlan como una
  unidad y su número de serie no se puede duplicar.
- Los prestatarios se clasifican por perfiles BUAP y grupo de préstamo:
  `prepa_lic_tecnica` tiene 15 días, `posgrado` 20 e
  `investigador_instituto` 28. Los equipos pueden usar
  `materiales.dias_prestamo`.
- Solo prestatarios internos elegibles pueden llevar materiales a domicilio. Se
  valida su perfil, vigencia, actualización del registro, adeudos, préstamos
  vencidos y disponibilidad del material.
- El máximo es de 15 préstamos activos por prestatario. Se permiten hasta dos
  renovaciones, cada una por cinco días, antes del vencimiento.
- Los materiales marcados para consulta en sala no se prestan a domicilio.
- La multa del proyecto es de **$1.30 MXN por cada día natural de atraso**.

Los plazos y reglas anteriores describen la configuración actual del proyecto;
si cambia el reglamento que se desea aplicar, actualiza las reglas del servidor,
las restricciones de la base y sus pruebas de manera coordinada.

## API principal

Las rutas `/api` devuelven y reciben JSON. Salvo las rutas públicas de acceso y
registro indicadas, requieren el encabezado `Authorization: Bearer <token>`.

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /` | Público | Comprobación básica de que Express está activo. |
| `POST /api/auth/login` | Público | Inicia sesión con correo y contraseña. |
| `GET /api/auth/registro-disponible` | Público | Indica si el registro administrativo está habilitado. |
| `POST /api/auth/registro` | Según configuración | Registra una cuenta bibliotecaria. |
| `GET /api/auth/me` | JWT | Devuelve la cuenta de la sesión actual. |
| `/api/materiales` | JWT | Consulta, categorías y CRUD del catálogo. |
| `/api/usuarios` | JWT | Estadísticas, consulta y CRUD de prestatarios. |
| `/api/prestamos` | JWT | Préstamos, renovaciones, devoluciones, multas y pagos. |

La búsqueda y paginación del catálogo usan query params; sus filtros se acumulan,
por ejemplo: `GET /api/materiales?search=redes&tipo=libro&disponibilidad=disponibles&limit=10&offset=0`.

## Pruebas y comandos de desarrollo

Ejecuta cada comando desde la carpeta indicada.

**Pruebas unitarias del backend** — no se conectan a Supabase:

```powershell
cd .\servidor
npm test
```

**Pruebas del cliente:**

```powershell
cd .\cliente
npm test
```

**Lint y compilación del cliente:**

```powershell
cd .\cliente
npm run lint
npm run build
```

**Pruebas de integración del backend** — usan PostgreSQL real y escriben datos
temporales:

1. Crea una base de datos Supabase separada para pruebas. Nunca uses la base
   original en este comando.
2. En el SQL Editor de esa base de pruebas vacía, ejecuta
   `servidor/tests/esquema_pruebas.sql` una sola vez.
3. En otra terminal, desde la raíz del repositorio:

   ```powershell
   cd .\servidor
   Copy-Item .env.test.example .env.test
   ```

4. Edita `servidor/.env.test` y coloca la URI de la base separada en
   `TEST_DATABASE_URL`. Mantén `TEST_DATABASE_SSL=true` para Supabase.
5. Ejecuta:

   ```powershell
   npm run test:integration
   ```

La suite verifica que `TEST_DATABASE_URL` no apunte al mismo proyecto que
`DATABASE_URL`, y elimina los registros temporales que crea. Aun así, conserva
una base de pruebas desechable y sin información importante.

## Estructura del repositorio

```text
biblioteca-buap/
├── cliente/
│   ├── src/
│   │   ├── components/     # Layout y rutas protegidas
│   │   ├── context/        # Estado de sesión
│   │   ├── pages/          # Login, catálogo y pantallas operativas
│   │   └── api.js          # Cliente HTTP hacia Express
│   └── tests/              # Pruebas del cliente API
├── servidor/
│   ├── controllers/        # Coordinación de solicitudes y respuestas
│   ├── data/               # Consultas SQL
│   ├── db/                 # Pool de PostgreSQL
│   ├── middleware/         # Verificación JWT
│   ├── migrations/         # SQL incremental para revisión manual
│   ├── routes/             # Rutas HTTP
│   ├── scripts/            # Utilidades administrativas
│   ├── services/            # Casos de uso y reglas de negocio
│   └── tests/              # Pruebas y esquema desechable de integración
└── README.md
```

## Solución de problemas

### El cliente avisa que no puede conectar con el servidor

- Comprueba que la terminal del backend sigue activa y muestra que escucha en el
  puerto `3000`.
- Abre `http://localhost:3000`; la API debe responder con un JSON.
- El cliente usa `http://localhost:3000/api`. Si cambias el puerto del backend,
  actualiza también `API_URL` en `cliente/src/api.js`.

### No conecta con Supabase

- Confirma que `servidor/.env` existe y que `DATABASE_URL` contiene la URI
  PostgreSQL correcta, no la URL del sitio web ni una clave anon.
- Revisa la contraseña y codifica los caracteres especiales dentro de la URI.
- Si tu conexión de red es IPv4, selecciona un método de conexión Supabase
  compatible con esa red.

### El login no acepta las credenciales

- En modo local puedes usar **¿Eres nuevo? Crea una cuenta aquí** para registrar
  otra cuenta bibliotecaria.
- Si el servidor informa que el registro está deshabilitado, revisa
  `NODE_ENV` y `REGISTRO_BIBLIOTECARIOS_HABILITADO` en `servidor/.env`, y reinicia
  Node después de modificarlos.
- Si el mensaje indica que el correo ya existe, inicia sesión con esa cuenta o
  usa un correo distinto.

### PostgreSQL indica que falta una columna o restricción

La base no coincide con el esquema que requiere la versión actual del servidor.
Compara su estado con la configuración Supabase del proyecto y revisa el SQL de
`servidor/migrations/` antes de aplicar cambios.

## Alcance de esta guía

Estas instrucciones cubren el uso local y las pruebas. La configuración de
despliegue y el endurecimiento para exponer el sistema en Internet no forman
parte de esta guía.
