// CAPA DE DATOS: aquí solo se escriben consultas SQL.
// No hay reglas de negocio, únicamente "guardar" y "leer".
import { pool } from "../db/pool.js";

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
