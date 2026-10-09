// CAPA DE LÓGICA DE NEGOCIO: aquí viven las reglas del inicio de sesión.
// Usa la capa de datos para consultar, pero decide por su cuenta si el acceso es válido.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  buscarAdministrativoPorEmail,
  buscarAdministrativoPorId,
} from "../data/usuariosData.js";

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

  // El token es el "gafete digital": dura 8 horas y solo el servidor sabe firmarlo.
  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  return {
    token,
    usuario: { id: admin.id, nombre: admin.nombre, email: admin.email },
  };
}

export async function obtenerUsuario(id) {
  return buscarAdministrativoPorId(id);
}
