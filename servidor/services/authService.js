// CAPA DE LÓGICA DE NEGOCIO: aquí viven las reglas del inicio de sesión.
// Usa la capa de datos para consultar, pero decide por su cuenta si el acceso es válido.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  buscarAdministrativoPorEmail,
  buscarAdministrativoPorId,
  crearAdministrativo,
} from "../data/usuariosData.js";
import { normalizarRegistroAdministrativo } from "./authReglas.js";

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

export async function iniciarSesion(email, password) {
  if (!email || !password) {
    throw errorHttp(400, "Escribe tu correo y tu contraseña.");
  }

  const admin = await buscarAdministrativoPorEmail(email.trim().toLowerCase());

  // Se compara la contraseña escrita contra el hash guardado (nunca contra texto plano).
  const contrasenaCorrecta =
    admin && admin.password_hash
      ? await bcrypt.compare(password, admin.password_hash)
      : false;

  // Mismo mensaje si falla el correo o la contraseña, para no revelar qué correos existen.
  if (!contrasenaCorrecta) {
    throw errorHttp(401, "Correo o contraseña incorrectos.");
  }

  return crearSesion(admin);
}

function crearSesion(admin) {
  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
  return {
    token,
    usuario: { id: admin.id, nombre: admin.nombre, email: admin.email },
  };
}

export async function obtenerEstadoRegistro() {
  return { disponible: registroAdministrativoHabilitado() };
}

function registroAdministrativoHabilitado() {
  const configuracion = process.env.REGISTRO_BIBLIOTECARIOS_HABILITADO;
  if (configuracion === "true") return true;
  if (configuracion === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export async function registrarBibliotecario(entrada) {
  if (!registroAdministrativoHabilitado()) {
    throw errorHttp(403, "El registro de bibliotecarios está deshabilitado en esta instalación.");
  }

  const { nombre, email, password } = normalizarRegistroAdministrativo(entrada);
  const passwordHash = await bcrypt.hash(password, 10);

  let admin;
  try {
    admin = await crearAdministrativo(nombre, email, passwordHash);
  } catch (error) {
    if (error.code === "23505") {
      throw errorHttp(409, "Ya existe una cuenta con ese correo.");
    }
    throw error;
  }

  return crearSesion(admin);
}

export async function obtenerUsuario(id) {
  return buscarAdministrativoPorId(id);
}
