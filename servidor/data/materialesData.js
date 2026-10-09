// Consultas SQL del catálogo de materiales.
import { pool } from "../db/pool.js";

const COLUMNAS = `id, tipo, titulo, autor, categoria, ejemplares_totales,
                  ejemplares_disponibles, solo_consulta`;

export async function listarMateriales({ busqueda, tipo, categoria, limit, offset }) {
  const filtros = [];
  const valores = [];

  if (busqueda) {
    valores.push(`%${busqueda}%`);
    filtros.push(`(titulo ILIKE $${valores.length} OR autor ILIKE $${valores.length})`);
  }
  if (tipo) {
    valores.push(tipo);
    filtros.push(`tipo = $${valores.length}`);
  }
  if (categoria) {
    valores.push(categoria);
    filtros.push(`categoria = $${valores.length}`);
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
       (tipo, titulo, autor, categoria, ejemplares_totales, ejemplares_disponibles, solo_consulta)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNAS}`,
    [
      material.tipo,
      material.titulo,
      material.autor,
      material.categoria,
      material.ejemplares_totales,
      material.ejemplares_disponibles,
      material.solo_consulta,
    ]
  );
  return result.rows[0];
}

export async function actualizarMaterial(id, material) {
  const result = await pool.query(
    `UPDATE materiales
        SET tipo = $1, titulo = $2, autor = $3, categoria = $4,
            ejemplares_totales = $5, ejemplares_disponibles = $6, solo_consulta = $7
      WHERE id = $8
      RETURNING ${COLUMNAS}`,
    [
      material.tipo,
      material.titulo,
      material.autor,
      material.categoria,
      material.ejemplares_totales,
      material.ejemplares_disponibles,
      material.solo_consulta,
      id,
    ]
  );
  return result.rows[0] || null;
}

export async function eliminarMaterial(id) {
  const result = await pool.query("DELETE FROM materiales WHERE id = $1 RETURNING id", [id]);
  return result.rowCount > 0;
}
