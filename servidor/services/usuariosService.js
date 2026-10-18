import {
  actualizarPrestatario,
  buscarPrestatarioPorId,
  crearPrestatario,
  eliminarPrestatario,
  existeIdentificadorPrestatario,
  listarPrestatarios,
  obtenerResumenPrestatarios,
} from "../data/usuariosData.js";
import {
  normalizarPrestatario,
  PERFILES_PRESTATARIO,
  TIPOS_PRESTATARIO,
} from "./usuariosReglas.js";
export { PERFILES_PRESTATARIO, TIPOS_PRESTATARIO } from "./usuariosReglas.js";

const VIGENCIAS = ["vigente", "por_vencer", "vencida", "sin_vigencia"];
const MAX_LIMIT = 100;

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero < 1) {
    throw errorHttp(400, "El identificador del usuario no es válido.");
  }
  return numero;
}

function numeroConsulta(valor, defecto, minimo, maximo = Number.MAX_SAFE_INTEGER) {
  if (valor === undefined) return defecto;
  if (!/^\d+$/.test(String(valor))) return null;
  const numero = Number(valor);
  return numero >= minimo && numero <= maximo ? numero : null;
}

export async function obtenerPrestatarios(query) {
  const limit = numeroConsulta(query.limit, 10, 1, MAX_LIMIT);
  const offset = numeroConsulta(query.offset, 0, 0);
  if (limit === null || offset === null) {
    throw errorHttp(400, `La paginación debe ser válida (limit de 1 a ${MAX_LIMIT} y offset igual o mayor a 0).`);
  }

  const busqueda = typeof query.search === "string" ? query.search.trim().slice(0, 200) : "";
  const tipo = typeof query.tipo_prestatario === "string" ? query.tipo_prestatario.trim() : "";
  const perfil = typeof query.perfil_prestatario === "string" ? query.perfil_prestatario.trim() : "";
  const vigencia = typeof query.vigencia === "string" ? query.vigencia.trim() : "";
  if (tipo && !TIPOS_PRESTATARIO.includes(tipo)) {
    throw errorHttp(400, "El filtro de tipo de prestatario no es válido.");
  }
  if (perfil && perfil !== "pendiente_clasificacion" && !Object.hasOwn(PERFILES_PRESTATARIO, perfil)) {
    throw errorHttp(400, "El filtro de perfil de prestatario no es válido.");
  }
  if (vigencia && !VIGENCIAS.includes(vigencia)) {
    throw errorHttp(400, "El filtro de vigencia no es válido.");
  }

  return {
    ...(await listarPrestatarios({ busqueda, tipo, perfil, vigencia, limit, offset })),
    limit,
    offset,
  };
}

export function obtenerEstadisticasPrestatarios() {
  return obtenerResumenPrestatarios();
}

export async function obtenerPrestatario(id) {
  const usuario = await buscarPrestatarioPorId(validarId(id));
  if (!usuario) throw errorHttp(404, "No se encontró el prestatario.");
  return usuario;
}

export async function registrarPrestatario(entrada) {
  const usuario = normalizarPrestatario(entrada);
  if (await existeIdentificadorPrestatario(usuario.matricula_o_num_trabajador)) {
    throw errorHttp(409, "Ya existe un prestatario con esa matrícula o número de trabajador.");
  }
  return crearPrestatario(usuario);
}

export async function modificarPrestatario(id, entrada) {
  const idValidado = validarId(id);
  if (!(await buscarPrestatarioPorId(idValidado))) {
    throw errorHttp(404, "No se encontró el prestatario.");
  }

  const usuario = normalizarPrestatario(entrada);
  if (await existeIdentificadorPrestatario(usuario.matricula_o_num_trabajador, idValidado)) {
    throw errorHttp(409, "Ya existe un prestatario con esa matrícula o número de trabajador.");
  }
  const actualizado = await actualizarPrestatario(idValidado, usuario);
  if (!actualizado) throw errorHttp(404, "No se encontró el prestatario.");
  return actualizado;
}

export async function quitarPrestatario(id) {
  const eliminado = await eliminarPrestatario(validarId(id));
  if (!eliminado) throw errorHttp(404, "No se encontró el prestatario.");
}
