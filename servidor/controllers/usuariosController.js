import {
  modificarPrestatario,
  obtenerEstadisticasPrestatarios,
  obtenerPrestatario,
  obtenerPrestatarios,
  quitarPrestatario,
  registrarPrestatario,
} from "../services/usuariosService.js";

function responderError(res, error) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.code === "23505") {
    return res.status(409).json({ error: "Ya existe un prestatario con esa matrícula o número de trabajador." });
  }
  if (error.code === "23503") {
    return res.status(409).json({ error: "No se puede eliminar a este prestatario porque tiene préstamos registrados." });
  }
  if (["23514", "23502", "22P02", "22001"].includes(error.code)) {
    return res.status(400).json({ error: "Los datos del prestatario no cumplen con el formato permitido." });
  }
  console.error("Error en prestatarios:", error);
  return res.status(500).json({ error: "Ocurrió un error al procesar los prestatarios." });
}

export async function listar(req, res) {
  try {
    res.json(await obtenerPrestatarios(req.query));
  } catch (error) {
    responderError(res, error);
  }
}

export async function estadisticas(_req, res) {
  try {
    res.json({ estadisticas: await obtenerEstadisticasPrestatarios() });
  } catch (error) {
    responderError(res, error);
  }
}

export async function detalle(req, res) {
  try {
    res.json({ usuario: await obtenerPrestatario(req.params.id) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function crear(req, res) {
  try {
    res.status(201).json({ usuario: await registrarPrestatario(req.body) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function actualizar(req, res) {
  try {
    res.json({ usuario: await modificarPrestatario(req.params.id, req.body) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function eliminar(req, res) {
  try {
    await quitarPrestatario(req.params.id);
    res.status(204).end();
  } catch (error) {
    responderError(res, error);
  }
}
