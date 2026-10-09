import { Router } from "express";
import { verificarToken } from "../middleware/verificarToken.js";
import { actualizar, categorias, crear, detalle, eliminar, listar } from "../controllers/materialesController.js";

const router = Router();

// Lecturas disponibles para usuarios autenticados; mutaciones protegidas explícitamente.
router.get("/", verificarToken, listar);
router.get("/categorias", verificarToken, categorias);
router.get("/:id", verificarToken, detalle);
router.post("/", verificarToken, crear);
router.put("/:id", verificarToken, actualizar);
router.delete("/:id", verificarToken, eliminar);

export default router;
