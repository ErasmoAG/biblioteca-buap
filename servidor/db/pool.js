// Conexión a la base de datos (Supabase / PostgreSQL).
// Es la única puerta de entrada a los datos: todo el servidor la reutiliza.
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

// En las pruebas de integración jamás se reutiliza DATABASE_URL. La URL de
// pruebas es explícita para evitar que una ejecución de test toque Supabase
// o la base configurada para el servidor normal por accidente.
const enPruebas = process.env.NODE_ENV === "test";
const connectionString = enPruebas
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

if (enPruebas && !connectionString) {
  throw new Error("Falta TEST_DATABASE_URL para ejecutar pruebas de integración.");
}

const ssl = enPruebas && process.env.TEST_DATABASE_SSL === "false"
  ? false
  : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl,
});
