// Consultas SQL del catálogo de materiales.
import { pool } from "../db/pool.js";

const COLUMNAS = `id, tipo, titulo, autor, categoria, signatura, editorial, anio,
                  isbn_issn, grado_academico, marca, modelo, numero_serie,
                  dias_prestamo, ejemplares_totales, ejemplares_disponibles,
                  solo_consulta`;

export async function listarMateriales({ busqueda, tipo, categoria, disponibilidad, soloConsulta, limit, offset }) {
  const filtros = [];
  const valores = [];

  if (busqueda) {
    valores.push(`%${busqueda}%`);
    filtros.push(`(titulo ILIKE $${valores.length} OR autor ILIKE $${valores.length}
      OR signatura ILIKE $${valores.length} OR marca ILIKE $${valores.length}
      OR modelo ILIKE $${valores.length} OR numero_serie ILIKE $${valores.length})`);
  }
  if (tipo) {
    valores.push(tipo);
    filtros.push(`tipo = $${valores.length}`);
  }
  if (categoria) {
    valores.push(categoria);
    filtros.push(`categoria = $${valores.length}`);
  }
  if (disponibilidad === "disponibles") {
    filtros.push("ejemplares_disponibles > 0");
  } else if (disponibilidad === "agotados") {
    filtros.push("ejemplares_disponibles = 0");
  }
  if (typeof soloConsulta === "boolean") {
    valores.push(soloConsulta);
    filtros.push(`solo_consulta = $${valores.length}`);
  }

  const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
  const totalResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM materiales ${where}`,
    valores
  );
  const pageValues = [...valores, limit, offset];
  const result = await pool.query(
    `SELECT ${COLUMNAS} FROM materiales ${where}
     ORDER BY titulo ASC, id ASC
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );

  return { materiales: result.rows, total: totalResult.rows[0].total };
}

export async function listarCategorias() {
  const result = await pool.query(
    `SELECT DISTINCT categoria FROM materiales
      WHERE categoria IS NOT NULL AND BTRIM(categoria) <> ''
      ORDER BY categoria ASC`
  );
  return result.rows.map((row) => row.categoria);
}

export async function buscarMaterialPorId(id) {
  const result = await pool.query(`SELECT ${COLUMNAS} FROM materiales WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function crearMaterial(material) {
  const result = await pool.query(
    `INSERT INTO materiales
       (tipo, titulo, autor, categoria, signatura, editorial, anio, isbn_issn,
        grado_academico, marca, modelo, numero_serie, dias_prestamo,
        ejemplares_totales, ejemplares_disponibles, solo_consulta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING ${COLUMNAS}`,
    [
      material.tipo,
      material.titulo,
      material.autor,
      material.categoria,
      material.signatura,
      material.editorial,
      material.anio,
      material.isbn_issn,
      material.grado_academico,
      material.marca,
      material.modelo,
      material.numero_serie,
      material.dias_prestamo,
      material.ejemplares_totales,
      material.ejemplares_disponibles,
      material.solo_consulta,
    ]
  );
  return result.rows[0];
}

export async function actualizarMaterial(id, material) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const actualResult = await client.query(
      `SELECT id, tipo, solo_consulta, ejemplares_totales, ejemplares_disponibles
         FROM materiales WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const actual = actualResult.rows[0];
    if (!actual) {
      await client.query("COMMIT");
      return null;
    }

    const prestamosResult = await client.query(
      `SELECT COUNT(*)::int AS activos
         FROM prestamos
        WHERE id_material = $1
          AND fecha_devolucion IS NULL
          AND estado <> 'devuelto'`,
      [id]
    );
    const prestamosActivos = prestamosResult.rows[0].activos;
    if (prestamosActivos > 0 && actual.tipo !== material.tipo) {
      const error = new Error("No puedes cambiar el tipo mientras el material tenga préstamos activos.");
      error.status = 409;
      throw error;
    }
    if (prestamosActivos > 0 && !actual.solo_consulta && material.solo_consulta) {
      const error = new Error("No puedes marcar como solo consulta un material con préstamos activos.");
      error.status = 409;
      throw error;
    }
    if (material.ejemplares_totales < prestamosActivos) {
      const error = new Error("El total no puede ser menor que los ejemplares actualmente prestados.");
      error.status = 400;
      throw error;
    }

    const disponibles = material.ejemplares_totales - prestamosActivos;
    const result = await client.query(
      `UPDATE materiales
          SET tipo = $1, titulo = $2, autor = $3, categoria = $4,
              signatura = $5, editorial = $6, anio = $7, isbn_issn = $8,
              grado_academico = $9, marca = $10, modelo = $11, numero_serie = $12,
              dias_prestamo = $13, ejemplares_totales = $14,
              ejemplares_disponibles = $15, solo_consulta = $16
        WHERE id = $17
        RETURNING ${COLUMNAS}`,
      [
        material.tipo,
        material.titulo,
        material.autor,
        material.categoria,
        material.signatura,
        material.editorial,
        material.anio,
        material.isbn_issn,
        material.grado_academico,
        material.marca,
        material.modelo,
        material.numero_serie,
        material.dias_prestamo,
        material.ejemplares_totales,
        disponibles,
        material.solo_consulta,
        id,
      ]
    );
    await client.query("COMMIT");
    return result.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function eliminarMaterial(id) {
  const result = await pool.query("DELETE FROM materiales WHERE id = $1 RETURNING id", [id]);
  return result.rowCount > 0;
}
