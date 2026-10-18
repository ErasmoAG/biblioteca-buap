import {
  actualizarMaterial,
  buscarMaterialPorId,
  crearMaterial,
  eliminarMaterial,
  listarCategorias,
  listarMateriales,
} from "../data/materialesData.js";
import {
  normalizarConsultaMateriales,
  normalizarMaterial,
} from "./materialesReglas.js";
export { TIPOS_MATERIAL } from "./materialesReglas.js";

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero < 1) {
    throw errorHttp(400, "El identificador del material no es válido.");
  }
  return numero;
}

export async function obtenerMateriales(query) {
  const filtros = normalizarConsultaMateriales(query);

  return {
    ...(await listarMateriales(filtros)),
    limit: filtros.limit,
    offset: filtros.offset,
  };
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
  return crearMaterial(normalizarMaterial(entrada));
}

export async function modificarMaterial(id, entrada) {
  const idValidado = validarId(id);
  const anterior = await buscarMaterialPorId(idValidado);
  if (!anterior) throw errorHttp(404, "No se encontró el material.");
  return actualizarMaterial(idValidado, normalizarMaterial(entrada, anterior));
}

export async function quitarMaterial(id) {
  const eliminado = await eliminarMaterial(validarId(id));
  if (!eliminado) throw errorHttp(404, "No se encontró el material.");
}
