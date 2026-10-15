import { Router } from "express";
import { verificarToken } from "../middleware/verificarToken.js";
import {
  crear,
  listar,
  opcionesMateriales,
  opcionesPrestatarios,
  renovar,
} from "../controllers/prestamosController.js";

const router = Router();

router.use(verificarToken);
router.get("/opciones/prestatarios", opcionesPrestatarios);
router.get("/opciones/materiales", opcionesMateriales);
router.get("/", listar);
router.post("/", crear);
router.post("/:id/renovar", renovar);

export default router;
