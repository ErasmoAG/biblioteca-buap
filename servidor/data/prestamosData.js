// Consultas y transacciones SQL para préstamos. Las validaciones de negocio
// viven en services/prestamosService.js.
import { pool } from "../db/pool.js";

const COLUMNAS_PRESTAMO = `
  p.id,
  p.id_usuario,
  p.id_material,
  p.fecha_prestamo,
  p.fecha_vencimiento,
  p.renovaciones_usadas,
  p.estado AS estado_registro,
  p.fecha_devolucion,
  CASE
    WHEN p.fecha_devolucion IS NOT NULL OR p.estado = 'devuelto' THEN 'devuelto'
    WHEN p.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
    ELSE 'activo'
  END AS estado,
  CASE
    WHEN p.fecha_devolucion IS NULL AND p.estado <> 'devuelto'
      AND p.fecha_vencimiento < CURRENT_DATE
    THEN (CURRENT_DATE - p.fecha_vencimiento)::int
    ELSE 0
  END AS dias_atraso,
  u.nombre AS usuario_nombre,
  u.perfil_prestatario,
  u.matricula_o_num_trabajador,
  m.tipo AS material_tipo,
  m.titulo AS material_titulo,
  m.autor AS material_autor,
  m.signatura AS material_signatura,
  m.marca AS material_marca,
  m.modelo AS material_modelo,
  COALESCE(multas.adeudo_pendiente, 0)::numeric(12, 2) AS adeudo_pendiente,
  COALESCE(multas.multas_pendientes, 0)::int AS multas_pendientes`;

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

export async function enTransaccion(operacion) {
  const client = await pool.connect();
  let iniciada = false;
  try {
    await client.query("BEGIN");
    iniciada = true;
    const resultado = await operacion(client);
    await client.query("COMMIT");
    return resultado;
  } catch (error) {
    if (iniciada) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listarPrestamos({ busqueda, estado, limit, offset }) {
  const filtros = [];
  const valores = [];

  if (busqueda) {
    valores.push(`%${busqueda}%`);
    filtros.push(`(u.nombre ILIKE $${valores.length}
      OR u.matricula_o_num_trabajador ILIKE $${valores.length}
      OR m.titulo ILIKE $${valores.length}
      OR m.autor ILIKE $${valores.length}
      OR m.signatura ILIKE $${valores.length})`);
  }
  if (estado === "activos") {
    filtros.push("p.fecha_devolucion IS NULL AND p.estado <> 'devuelto' AND p.fecha_vencimiento >= CURRENT_DATE");
  } else if (estado === "vencidos") {
    filtros.push("p.fecha_devolucion IS NULL AND p.estado <> 'devuelto' AND p.fecha_vencimiento < CURRENT_DATE");
  } else if (estado === "devueltos") {
    filtros.push("(p.fecha_devolucion IS NOT NULL OR p.estado = 'devuelto')");
  }

  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
  const joins = `
    FROM prestamos p
    JOIN usuarios u ON u.id = p.id_usuario
    JOIN materiales m ON m.id = p.id_material
    LEFT JOIN LATERAL (
      SELECT SUM(mu.monto) FILTER (WHERE mu.pagada = FALSE) AS adeudo_pendiente,
             COUNT(*) FILTER (WHERE mu.pagada = FALSE) AS multas_pendientes
        FROM multas mu WHERE mu.id_prestamo = p.id
    ) multas ON TRUE`;

  const totalResult = await pool.query(
    `SELECT COUNT(*)::int AS total ${joins} ${where}`,
    valores
  );
  const pageValues = [...valores, limit, offset];
  const result = await pool.query(
    `SELECT ${COLUMNAS_PRESTAMO} ${joins} ${where}
      ORDER BY
        CASE WHEN p.fecha_devolucion IS NULL AND p.estado <> 'devuelto' THEN 0 ELSE 1 END,
        p.fecha_vencimiento ASC,
        p.id DESC
      LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );
  return { prestamos: result.rows, total: totalResult.rows[0].total };
}

export async function listarPrestatariosParaPrestamo(busqueda) {
  const patron = `%${busqueda}%`;
  const result = await pool.query(
    `SELECT u.id, u.nombre, u.tipo_prestatario, u.perfil_prestatario,
            u.matricula_o_num_trabajador, u.vigencia_credencial,
            u.fecha_actualizacion_registro,
            CASE WHEN u.vigencia_credencial >= CURRENT_DATE THEN TRUE ELSE FALSE END AS credencial_vigente,
            CASE
              WHEN u.fecha_actualizacion_registro IS NULL THEN FALSE
              WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8
                THEN u.fecha_actualizacion_registro >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 8, 1)
                     AND u.fecha_actualizacion_registro <= CURRENT_DATE
              ELSE u.fecha_actualizacion_registro >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 1, 1)
                   AND u.fecha_actualizacion_registro <= CURRENT_DATE
            END AS registro_vigente,
            COALESCE(p.prestamos_activos, 0)::int AS prestamos_activos,
            COALESCE(p.prestamos_vencidos, 0)::int AS prestamos_vencidos,
            COALESCE(f.adeudo_pendiente, 0)::numeric(12, 2) AS adeudo_pendiente,
            COALESCE(f.multas_pendientes, 0)::int AS multas_pendientes
       FROM usuarios u
       LEFT JOIN LATERAL (
         SELECT COUNT(*) FILTER (
                  WHERE pr.fecha_devolucion IS NULL AND pr.estado <> 'devuelto'
                ) AS prestamos_activos,
                COUNT(*) FILTER (
                  WHERE pr.fecha_devolucion IS NULL AND pr.estado <> 'devuelto'
                    AND pr.fecha_vencimiento < CURRENT_DATE
                ) AS prestamos_vencidos
           FROM prestamos pr WHERE pr.id_usuario = u.id
       ) p ON TRUE
       LEFT JOIN LATERAL (
         SELECT SUM(mu.monto) FILTER (WHERE mu.pagada = FALSE) AS adeudo_pendiente,
                COUNT(*) FILTER (WHERE mu.pagada = FALSE) AS multas_pendientes
           FROM multas mu JOIN prestamos pr ON pr.id = mu.id_prestamo
          WHERE pr.id_usuario = u.id
       ) f ON TRUE
      WHERE u.rol = 'prestatario'
        AND ($1 = '%%' OR u.nombre ILIKE $1 OR u.matricula_o_num_trabajador ILIKE $1)
      ORDER BY u.nombre ASC
      LIMIT 20`,
    [patron]
  );
  return result.rows;
}

export async function listarMaterialesParaPrestamo(busqueda) {
  const patron = `%${busqueda}%`;
  const result = await pool.query(
    `SELECT id, tipo, titulo, autor, categoria, signatura, marca, modelo,
            dias_prestamo, ejemplares_totales, ejemplares_disponibles, solo_consulta
       FROM materiales
      WHERE ejemplares_disponibles > 0
        AND solo_consulta IS FALSE
        AND ($1 = '%%' OR titulo ILIKE $1 OR autor ILIKE $1 OR signatura ILIKE $1
             OR marca ILIKE $1 OR modelo ILIKE $1)
      ORDER BY titulo ASC, id ASC
      LIMIT 20`,
    [patron]
  );
  return result.rows;
}

export async function bloquearPrestatario(client, id) {
  const result = await client.query(
    `SELECT id, nombre, tipo_prestatario, perfil_prestatario,
            vigencia_credencial, fecha_actualizacion_registro,
            CASE WHEN vigencia_credencial >= CURRENT_DATE THEN TRUE ELSE FALSE END AS credencial_vigente,
            CASE
              WHEN fecha_actualizacion_registro IS NULL THEN FALSE
              WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8
                THEN fecha_actualizacion_registro >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 8, 1)
                     AND fecha_actualizacion_registro <= CURRENT_DATE
              ELSE fecha_actualizacion_registro >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 1, 1)
                   AND fecha_actualizacion_registro <= CURRENT_DATE
            END AS registro_vigente
       FROM usuarios
      WHERE id = $1 AND rol = 'prestatario'
      FOR UPDATE`,
    [id]
  );
  return result.rows[0] || null;
}

export async function obtenerEstadoPrestatario(client, id) {
  const result = await client.query(
    `SELECT COUNT(*) FILTER (
              WHERE fecha_devolucion IS NULL AND estado <> 'devuelto'
            )::int AS prestamos_activos,
            COUNT(*) FILTER (
              WHERE fecha_devolucion IS NULL AND estado <> 'devuelto'
                AND fecha_vencimiento < CURRENT_DATE
            )::int AS prestamos_vencidos,
            CURRENT_DATE::text AS fecha_hoy
       FROM prestamos WHERE id_usuario = $1`,
    [id]
  );
  const multas = await client.query(
    `SELECT COALESCE(SUM(mu.monto), 0)::numeric(12, 2) AS adeudo_pendiente,
            COUNT(*) FILTER (WHERE mu.pagada = FALSE)::int AS multas_pendientes
       FROM multas mu JOIN prestamos p ON p.id = mu.id_prestamo
      WHERE p.id_usuario = $1`,
    [id]
  );
  return { ...result.rows[0], ...multas.rows[0] };
}

export async function bloquearPrestamo(client, id) {
  const result = await client.query(
    `SELECT id, id_usuario, id_material, fecha_prestamo, fecha_vencimiento,
            renovaciones_usadas, estado, fecha_devolucion
       FROM prestamos WHERE id = $1 FOR UPDATE`,
    [id]
  );
  return result.rows[0] || null;
}

export async function obtenerMaterialPrestamo(client, id) {
  const result = await client.query(
    `SELECT id, tipo, titulo, dias_prestamo, ejemplares_disponibles, solo_consulta
       FROM materiales WHERE id = $1 FOR UPDATE`,
    [id]
  );
  return result.rows[0] || null;
}

export async function crearPrestamoEnTransaccion(client, idUsuario, material, dias) {
  const disponibilidad = await client.query(
    `UPDATE materiales
        SET ejemplares_disponibles = ejemplares_disponibles - 1
      WHERE id = $1 AND ejemplares_disponibles > 0 AND solo_consulta IS FALSE
      RETURNING id`,
    [material.id]
  );
  if (!disponibilidad.rows[0]) {
    throw errorHttp(409, "El material ya no está disponible para préstamo.");
  }

  const result = await client.query(
    `INSERT INTO prestamos
       (id_usuario, id_material, fecha_prestamo, fecha_vencimiento,
        renovaciones_usadas, estado)
     VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + $3::int, 0, 'activo')
     RETURNING id`,
    [idUsuario, material.id, dias]
  );
  return obtenerPrestamoPorIdEnTransaccion(client, result.rows[0].id);
}

export async function renovarPrestamoEnTransaccion(client, id, diasExtension, maxRenovaciones) {
  const result = await client.query(
    `UPDATE prestamos
        SET fecha_vencimiento = fecha_vencimiento + $2::int,
            renovaciones_usadas = renovaciones_usadas + 1,
            estado = 'activo'
      WHERE id = $1
        AND fecha_devolucion IS NULL
        AND estado <> 'devuelto'
        AND fecha_vencimiento >= CURRENT_DATE
        AND renovaciones_usadas < $3
      RETURNING id`,
    [id, diasExtension, maxRenovaciones]
  );
  if (!result.rows[0]) {
    throw errorHttp(409, "El préstamo cambió o ya no cumple las condiciones para renovarse.");
  }
  return obtenerPrestamoPorIdEnTransaccion(client, id);
}

async function obtenerPrestamoPorIdEnTransaccion(client, id) {
  const result = await client.query(
    `SELECT p.id, p.id_usuario, p.id_material, p.fecha_prestamo,
            p.fecha_vencimiento, p.renovaciones_usadas, p.estado AS estado_registro,
            p.fecha_devolucion,
            CASE WHEN p.fecha_devolucion IS NOT NULL OR p.estado = 'devuelto' THEN 'devuelto'
                 WHEN p.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
                 ELSE 'activo' END AS estado,
            u.nombre AS usuario_nombre,
            m.titulo AS material_titulo, m.tipo AS material_tipo
       FROM prestamos p
       JOIN usuarios u ON u.id = p.id_usuario
       JOIN materiales m ON m.id = p.id_material
      WHERE p.id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function obtenerUsuarioDePrestamo(id) {
  const result = await pool.query("SELECT id_usuario FROM prestamos WHERE id = $1", [id]);
  return result.rows[0] || null;
}
