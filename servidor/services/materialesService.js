import {
  actualizarMaterial,
  buscarMaterialPorId,
  crearMaterial,
  eliminarMaterial,
  listarCategorias,
  listarMateriales,
} from "../data/materialesData.js";

// Valores internos permitidos por el CHECK de Supabase; la interfaz muestra etiquetas amigables.
export const TIPOS_MATERIAL = ["libro", "cd", "dvd", "ipad", "equipo_computo"];
const MAX_LIMIT = 100;

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function enteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

function validarId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero < 1) {
    throw errorHttp(400, "El identificador del material no es válido.");
  }
  return numero;
}

function validarMaterial(entrada) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw errorHttp(400, "Envía los datos del material.");
  }

  const { tipo, titulo, autor, categoria, ejemplares_totales, ejemplares_disponibles, solo_consulta } = entrada;
  if (!TIPOS_MATERIAL.includes(tipo)) {
    throw errorHttp(400, "El tipo de material no es válido.");
  }
  if (typeof titulo !== "string" || !titulo.trim()) {
    throw errorHttp(400, "El título es obligatorio.");
  }
  if (autor != null && typeof autor !== "string") {
    throw errorHttp(400, "El autor debe ser texto.");
  }
  if (categoria != null && typeof categoria !== "string") {
    throw errorHttp(400, "La categoría debe ser texto.");
  }
  if (titulo.trim().length > 200) {
    throw errorHttp(400, "El título no puede superar los 200 caracteres.");
  }
  if (autor?.trim().length > 150) {
    throw errorHttp(400, "El autor no puede superar los 150 caracteres.");
  }
  if (categoria?.trim().length > 100) {
    throw errorHttp(400, "La categoría no puede superar los 100 caracteres.");
  }
  if (!enteroNoNegativo(ejemplares_totales) || !enteroNoNegativo(ejemplares_disponibles)) {
    throw errorHttp(400, "Los ejemplares deben ser números enteros iguales o mayores a cero.");
  }
  if (ejemplares_disponibles > ejemplares_totales) {
    throw errorHttp(400, "Los ejemplares disponibles no pueden superar el total.");
  }
  if (typeof solo_consulta !== "boolean") {
    throw errorHttp(400, "Indica si el material es solo para consulta.");
  }

  return {
    tipo,
    titulo: titulo.trim(),
    autor: autor?.trim() || null,
    categoria: categoria?.trim() || null,
    ejemplares_totales,
    ejemplares_disponibles,
    solo_consulta,
  };
}

function numeroConsulta(valor, defecto, minimo, maximo = Number.MAX_SAFE_INTEGER) {
  if (valor === undefined) return defecto;
  if (!/^\d+$/.test(String(valor))) return null;
  const numero = Number(valor);
  return numero >= minimo && numero <= maximo ? numero : null;
}

export async function obtenerMateriales(query) {
  const limit = numeroConsulta(query.limit, 10, 1, MAX_LIMIT);
  const offset = numeroConsulta(query.offset, 0, 0);
  if (limit === null || offset === null) {
    throw errorHttp(400, `La paginación debe ser válida (limit de 1 a ${MAX_LIMIT} y offset igual o mayor a 0).`);
  }

  const busqueda = typeof query.search === "string" ? query.search.trim().slice(0, 200) : "";
  const tipo = typeof query.tipo === "string" ? query.tipo.trim() : "";
  const categoria = typeof query.categoria === "string" ? query.categoria.trim() : "";
  if (tipo && !TIPOS_MATERIAL.includes(tipo)) {
    throw errorHttp(400, "El filtro de tipo no es válido.");
  }

  return { ...(await listarMateriales({ busqueda, tipo, categoria, limit, offset })), limit, offset };
}

export function obtenerCategorias() {
  return listarCategorias();
}

export async function obtenerMaterial(id) {
  const material = await buscarMaterialPorId(validarId(id));
  if (!material) throw errorHttp(404, "No se encontró el material.");
  return material;
}

export function registrarMaterial(entrada) {
  return crearMaterial(validarMaterial(entrada));
}

export async function modificarMaterial(id, entrada) {
  const material = await actualizarMaterial(validarId(id), validarMaterial(entrada));
  if (!material) throw errorHttp(404, "No se encontró el material.");
  return material;
}

export async function quitarMaterial(id) {
  const eliminado = await eliminarMaterial(validarId(id));
  if (!eliminado) throw errorHttp(404, "No se encontró el material.");
}
