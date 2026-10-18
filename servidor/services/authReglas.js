import { Buffer } from "node:buffer";

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

export function normalizarRegistroAdministrativo(entrada) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw errorHttp(400, "Envía los datos del bibliotecario.");
  }

  const nombre = typeof entrada.nombre === "string" ? entrada.nombre.trim() : "";
  if (!nombre) throw errorHttp(400, "El nombre es obligatorio.");
  if (nombre.length > 150) {
    throw errorHttp(400, "El nombre no puede superar los 150 caracteres.");
  }

  const email = typeof entrada.email === "string"
    ? entrada.email.trim().toLowerCase()
    : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw errorHttp(400, "Escribe un correo electrónico válido.");
  }

  const password = typeof entrada.password === "string" ? entrada.password : "";
  if (password.length < 8) {
    throw errorHttp(400, "La contraseña debe tener al menos 8 caracteres.");
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw errorHttp(400, "La contraseña no puede superar 72 bytes.");
  }

  return { nombre, email, password };
}
