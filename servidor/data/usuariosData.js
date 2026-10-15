// CAPA DE DATOS: aquí solo se escriben consultas SQL.
// No hay reglas de negocio, únicamente "guardar" y "leer".
import { pool } from "../db/pool.js";

const COLUMNAS_PRESTATARIO = `
  u.id,
  u.nombre,
  u.rol,
  u.tipo_prestatario,
  u.perfil_prestatario,
  u.matricula_o_num_trabajador,
  u.vigencia_credencial,
  u.fecha_actualizacion_registro,
  u.fecha_registro,
  COALESCE(p.prestamos_activos, 0)::int AS prestamos_activos,
  COALESCE(p.prestamos_vencidos, 0)::int AS prestamos_vencidos,
  COALESCE(m.adeudo_pendiente, 0)::numeric(12, 2) AS adeudo_pendiente`;

const RESUMEN_PRESTATARIOS = `
  LEFT JOIN (
    SELECT id_usuario,
           COUNT(*) FILTER (
             WHERE fecha_devolucion IS NULL AND estado <> 'devuelto'
           ) AS prestamos_activos,
           COUNT(*) FILTER (
             WHERE fecha_devolucion IS NULL AND estado <> 'devuelto'
               AND fecha_vencimiento < CURRENT_DATE
           ) AS prestamos_vencidos
      FROM prestamos
     GROUP BY id_usuario
  ) p ON p.id_usuario = u.id
  LEFT JOIN (
    SELECT pr.id_usuario,
           SUM(mu.monto) FILTER (WHERE mu.pagada = FALSE) AS adeudo_pendiente
      FROM multas mu
      JOIN prestamos pr ON pr.id = mu.id_prestamo
     GROUP BY pr.id_usuario
  ) m ON m.id_usuario = u.id`;

function construirFiltros({ busqueda, tipo, perfil, vigencia }) {
  const filtros = ["u.rol = 'prestatario'"];
  const valores = [];

  if (busqueda) {
    valores.push(`%${busqueda}%`);
    filtros.push(`(u.nombre ILIKE $${valores.length}
      OR u.matricula_o_num_trabajador ILIKE $${valores.length})`);
  }
  if (tipo) {
    valores.push(tipo);
    filtros.push(`u.tipo_prestatario = $${valores.length}`);
  }
  if (perfil) {
    valores.push(perfil);
    filtros.push(`u.perfil_prestatario = $${valores.length}`);
  }
  if (vigencia === "vigente") {
    filtros.push("u.perfil_prestatario IS DISTINCT FROM 'externo' AND u.vigencia_credencial > CURRENT_DATE + 30");
  } else if (vigencia === "por_vencer") {
    filtros.push(`u.perfil_prestatario IS DISTINCT FROM 'externo'
      AND u.vigencia_credencial BETWEEN CURRENT_DATE AND CURRENT_DATE + 30`);
  } else if (vigencia === "vencida") {
    filtros.push("u.perfil_prestatario IS DISTINCT FROM 'externo' AND u.vigencia_credencial < CURRENT_DATE");
  } else if (vigencia === "sin_vigencia") {
    filtros.push("u.perfil_prestatario IS DISTINCT FROM 'externo' AND u.vigencia_credencial IS NULL");
  }

  return { where: `WHERE ${filtros.join(" AND ")}`, valores };
}

export async function buscarAdministrativoPorEmail(email) {
  const resultado = await pool.query(
    `SELECT id, nombre, email, password_hash
       FROM usuarios
      WHERE email = $1 AND rol = 'administrativo'`,
    [email]
  );
  return resultado.rows[0] || null;
}

export async function buscarAdministrativoPorId(id) {
  const resultado = await pool.query(
    `SELECT id, nombre, email
       FROM usuarios
      WHERE id = $1 AND rol = 'administrativo'`,
    [id]
  );
  return resultado.rows[0] || null;
}

export async function crearAdministrativo(nombre, email, passwordHash) {
  const resultado = await pool.query(
    `INSERT INTO usuarios (nombre, rol, email, password_hash)
     VALUES ($1, 'administrativo', $2, $3)
     RETURNING id, nombre, email`,
    [nombre, email, passwordHash]
  );
  return resultado.rows[0];
}

export async function listarPrestatarios({ busqueda, tipo, perfil, vigencia, limit, offset }) {
  const { where, valores } = construirFiltros({ busqueda, tipo, perfil, vigencia });
  const totalResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM usuarios u ${where}`,
    valores
  );
  const pageValues = [...valores, limit, offset];
  const result = await pool.query(
    `SELECT ${COLUMNAS_PRESTATARIO}
       FROM usuarios u
       ${RESUMEN_PRESTATARIOS}
       ${where}
      ORDER BY u.nombre ASC, u.id ASC
      LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );
  return { usuarios: result.rows, total: totalResult.rows[0].total };
}

export async function obtenerResumenPrestatarios() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE perfil_prestatario IS DISTINCT FROM 'externo')::int AS internos,
            COUNT(*) FILTER (WHERE perfil_prestatario = 'externo')::int AS externos,
            COUNT(*) FILTER (
              WHERE perfil_prestatario IS DISTINCT FROM 'externo'
                AND (vigencia_credencial IS NULL OR vigencia_credencial < CURRENT_DATE)
            )::int AS credenciales_no_vigentes,
            COUNT(*) FILTER (
              WHERE perfil_prestatario IS DISTINCT FROM 'externo'
                AND vigencia_credencial BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
            )::int AS credenciales_por_vencer
       FROM usuarios
      WHERE rol = 'prestatario'`
  );
  return result.rows[0];
}

export async function buscarPrestatarioPorId(id) {
  const result = await pool.query(
    `SELECT ${COLUMNAS_PRESTATARIO}
       FROM usuarios u
       ${RESUMEN_PRESTATARIOS}
      WHERE u.id = $1 AND u.rol = 'prestatario'`,
    [id]
  );
  return result.rows[0] || null;
}

export async function existeIdentificadorPrestatario(identificador, excluirId = null) {
  const result = await pool.query(
    `SELECT 1
       FROM usuarios
      WHERE rol = 'prestatario'
        AND perfil_prestatario IS DISTINCT FROM 'externo'
        AND matricula_o_num_trabajador IS NOT NULL
        AND LOWER(BTRIM(matricula_o_num_trabajador)) = LOWER(BTRIM($1))
        AND ($2::int IS NULL OR id <> $2)
      LIMIT 1`,
    [identificador, excluirId]
  );
  return result.rowCount > 0;
}

export async function crearPrestatario(usuario) {
  const result = await pool.query(
    `INSERT INTO usuarios
       (nombre, rol, tipo_prestatario, perfil_prestatario, matricula_o_num_trabajador,
        vigencia_credencial, fecha_actualizacion_registro)
     VALUES ($1, 'prestatario', $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      usuario.nombre,
      usuario.tipo_prestatario,
      usuario.perfil_prestatario,
      usuario.matricula_o_num_trabajador,
      usuario.vigencia_credencial,
      usuario.fecha_actualizacion_registro,
    ]
  );
  return buscarPrestatarioPorId(result.rows[0].id);
}

export async function actualizarPrestatario(id, usuario) {
  const result = await pool.query(
    `UPDATE usuarios
        SET nombre = $1,
            tipo_prestatario = $2,
            perfil_prestatario = $3,
            matricula_o_num_trabajador = $4,
            vigencia_credencial = $5,
            fecha_actualizacion_registro = $6
      WHERE id = $7 AND rol = 'prestatario'
      RETURNING id`,
    [
      usuario.nombre,
      usuario.tipo_prestatario,
      usuario.perfil_prestatario,
      usuario.matricula_o_num_trabajador,
      usuario.vigencia_credencial,
      usuario.fecha_actualizacion_registro,
      id,
    ]
  );
  if (!result.rows[0]) return null;
  return buscarPrestatarioPorId(result.rows[0].id);
}

export async function eliminarPrestatario(id) {
  const result = await pool.query(
    "DELETE FROM usuarios WHERE id = $1 AND rol = 'prestatario' RETURNING id",
    [id]
  );
  return result.rowCount > 0;
}
