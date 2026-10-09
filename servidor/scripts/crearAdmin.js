// Crea el primer usuario administrativo (alguien tiene que poder entrar).
// Uso:  node scripts/crearAdmin.js "Nombre Completo" correo@ejemplo.com contraseña
import bcrypt from "bcryptjs";
import { crearAdministrativo } from "../data/usuariosData.js";
import { pool } from "../db/pool.js";

const [nombre, email, password] = process.argv.slice(2);

if (!nombre || !email || !password) {
  console.log('Uso: node scripts/crearAdmin.js "Nombre Completo" correo@ejemplo.com contraseña');
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, 10);
  const admin = await crearAdministrativo(nombre, email.trim().toLowerCase(), hash);
  console.log("Administrativo creado:", admin);
} catch (error) {
  console.error("No se pudo crear el usuario:", error.message);
} finally {
  await pool.end();
}
