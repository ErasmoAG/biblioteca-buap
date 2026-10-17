import {
  obtenerOpcionesMateriales,
  obtenerOpcionesPrestatarios,
  obtenerMultas,
  obtenerPrestamos,
  registrarDevolucion,
  registrarPagoMulta,
  registrarPrestamo,
  renovarPrestamo,
} from "../services/prestamosService.js";

function responderError(res, error) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.code === "23505") {
    return res.status(409).json({ error: "Ya existe una multa para este préstamo; revisa el historial antes de volver a procesarlo." });
  }
  if (error.code === "23503") {
    return res.status(409).json({ error: "El usuario o material ya no existe; actualiza la pantalla e inténtalo de nuevo." });
  }
  if (error.code === "23514" || error.code === "23502" || error.code === "22P02") {
    return res.status(400).json({ error: "Los datos del préstamo no cumplen las reglas de la base de datos." });
  }
  console.error("Error en préstamos:", error);
  return res.status(500).json({ error: "Ocurrió un error al procesar el préstamo." });
}

export async function listar(req, res) {
  try {
    res.json(await obtenerPrestamos(req.query));
  } catch (error) {
    responderError(res, error);
  }
}

export async function listarMultas(req, res) {
  try {
    res.json(await obtenerMultas(req.query));
  } catch (error) {
    responderError(res, error);
  }
}

export async function opcionesPrestatarios(req, res) {
  try {
    res.json({ prestatarios: await obtenerOpcionesPrestatarios(req.query) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function opcionesMateriales(req, res) {
  try {
    res.json({ materiales: await obtenerOpcionesMateriales(req.query) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function crear(req, res) {
  try {
    res.status(201).json({ prestamo: await registrarPrestamo(req.body) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function renovar(req, res) {
  try {
    res.json({ prestamo: await renovarPrestamo(req.params.id) });
  } catch (error) {
    responderError(res, error);
  }
}

export async function devolver(req, res) {
  try {
    res.json(await registrarDevolucion(req.params.id));
  } catch (error) {
    responderError(res, error);
  }
}

export async function pagarMulta(req, res) {
  try {
    res.json(await registrarPagoMulta(req.params.id));
  } catch (error) {
    responderError(res, error);
  }
}
