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
  if (error.code === "23505") {
    const detalle = `${error.constraint || ""} ${error.detail || ""}`.toLowerCase();
    if (detalle.includes("numero_serie")) {
      return res.status(409).json({ error: "Ya existe un equipo con ese número de serie" });
    }
    return res.status(409).json({ error: "Ya existe un material con esos datos únicos." });
  }
  if (error.code === "23514") {
    const regla = `${error.constraint || ""} ${error.detail || ""} ${error.message || ""}`.toLowerCase();
    if (regla.includes("solo_consulta") || regla.includes("consulta")) {
      return res.status(400).json({ error: "Las tesis, revistas y materiales especiales deben ser solo para consulta." });
    }
    if (regla.includes("ejemplar") || regla.includes("ipad") || regla.includes("equipo_computo")) {
      return res.status(400).json({ error: "Los iPads y equipos de cómputo deben tener exactamente un ejemplar." });
    }
    if (regla.includes("grado_academico")) {
      return res.status(400).json({ error: "El grado académico de la tesis debe ser licenciatura, maestria o doctorado." });
    }
    if (regla.includes("anio")) {
      return res.status(400).json({ error: "El año debe estar entre 1400 y 2100." });
    }
    if (regla.includes("dias_prestamo")) {
      return res.status(400).json({ error: "Los días de préstamo deben ser un entero mayor que cero." });
    }
    if (regla.includes("tipo")) {
      return res.status(400).json({ error: "El tipo de material no está permitido por la base de datos." });
    }
    return res.status(400).json({ error: "El material no cumple una regla de la base de datos. Revisa el tipo y sus ejemplares." });
  }
  if (error.code === "23502" || error.code === "22P02" || error.code === "22001" || error.code === "22003") {
    return res.status(400).json({ error: "Uno de los campos está vacío o excede el formato permitido." });
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
