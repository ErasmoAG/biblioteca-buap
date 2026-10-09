import {
  modificarMaterial,
  obtenerCategorias,
  obtenerMaterial,
  obtenerMateriales,
  quitarMaterial,
  registrarMaterial,
} from "../services/materialesService.js";

function responderError(res, error) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.code === "23503") {
    return res.status(409).json({ error: "No se puede eliminar este material porque tiene préstamos relacionados." });
  }
  if (error.code === "23514" || error.code === "23502" || error.code === "22P02") {
    return res.status(400).json({ error: "Los datos del material no cumplen con el formato esperado." });
  }
  console.error("Error en materiales:", error);
  return res.status(500).json({ error: "Ocurrió un error al procesar el catálogo." });
}

export async function listar(req, res) {
  try {
    res.json(await obtenerMateriales(req.query));
  } catch (error) {
    responderError(res, error);
  }
}

export async function categorias(req, res) {
  try {
    res.json({ categorias: await obtenerCategorias() });
  } catch (error) {
    responderError(res, error);
  }
}

export async function detalle(req, res) {
  try {
    res.json({ material: await obtenerMaterial(req.params.id) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function crear(req, res) {
  try {
    res.status(201).json({ material: await registrarMaterial(req.body) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function actualizar(req, res) {
  try {
    res.json({ material: await modificarMaterial(req.params.id, req.body) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function eliminar(req, res) {
  try {
    await quitarMaterial(req.params.id);
    res.status(204).end();
  } catch (error) {
    responderError(res, error);
  }
}
