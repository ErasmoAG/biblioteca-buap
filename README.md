# Sistema de Gestión de Biblioteca (BUAP)

Proyecto de la materia de Arquitectura de Software. Sistema para gestionar el
préstamo de materiales de una biblioteca, basado en las reglas reales de la
Dirección General de Bibliotecas de la BUAP, usando una **arquitectura en
capas (N-Tier)**.

## Arquitectura

| Capa | Carpeta | Tecnología | Qué hace |
|---|---|---|---|
| Presentación | `cliente/` | React + Tailwind | Pantallas que usa el usuario |
| Lógica de negocio | `servidor/` | Node.js + Express | Reglas de préstamos, devoluciones y multas |
| Datos | Supabase (nube) | PostgreSQL | Guarda libros, usuarios, préstamos y multas |

El cliente **nunca** se conecta directo a la base de datos: siempre pasa por
el servidor, que es el único que habla con Supabase.

## Requisitos previos

- [Node.js](https://nodejs.org) (versión LTS)
- Un editor de código, recomendado [VS Code](https://code.visualstudio.com)
- Acceso al proyecto de Supabase del equipo (pídele la contraseña de la base
  de datos a quien lo creó, por un medio privado, nunca por el código)

## Cómo descargar y configurar el proyecto

1. Clona el repositorio:
   ```
   git clone <URL-del-repositorio>
   cd biblioteca-buap
   ```

2. Instala y arranca el cliente (React):
   ```
   cd cliente
   npm install
   npm run dev
   ```
   Se abrirá en `http://localhost:5173`.

3. Instala el servidor (Node.js/Express):
   ```
   cd ../servidor
   npm install
   ```

4. Configura tus variables de entorno:
   - Copia `.env.example` y renómbralo como `.env` (dentro de `servidor/`).
   - Reemplaza el valor de `DATABASE_URL` con la cadena de conexión real de
     Supabase (pídesela a tu equipo).

5. Arranca el servidor:
   ```
   node index.js
   ```
   Si todo está bien configurado, verás un mensaje confirmando la conexión
   en `http://localhost:3000`.

## Estructura del proyecto

```
biblioteca-buap/
├── cliente/      # Capa de presentación (React + Tailwind)
├── servidor/     # Capa de lógica de negocio (Node.js + Express)
│   └── .env      # Tus credenciales locales (no se sube a GitHub)
└── README.md
```

## Reglas de negocio principales

- Tipos de usuario: prepa/licenciatura/técnica (15 días de préstamo),
  posgrado (20 días), investigador/instituto (28 días), externo (solo
  consulta en sala), y administrativo/bibliotecario (gestiona el sistema).
- Máximo 15 artículos prestados por usuario, hasta 2 renovaciones de 5 días.
- Multa de $1.30 MXN por día de atraso.