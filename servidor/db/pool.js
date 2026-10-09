// Conexión a la base de datos (Supabase / PostgreSQL).
// Es la única puerta de entrada a los datos: todo el servidor la reutiliza.
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
