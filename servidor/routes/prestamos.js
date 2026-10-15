import { Router } from "express";
import { verificarToken } from "../middleware/verificarToken.js";
import {
  crear,
  devolver,
  listarMultas,
  listar,
  opcionesMateriales,
  opcionesPrestatarios,
  pagarMulta,
  renovar,
} from "../controllers/prestamosController.js";

const router = Router();

router.use(verificarToken);
router.get("/multas", listarMultas);
router.post("/multas/:id/pagar", pagarMulta);
router.get("/opciones/prestatarios", opcionesPrestatarios);
router.get("/opciones/materiales", opcionesMateriales);
router.get("/", listar);
router.post("/", crear);
router.post("/:id/renovar", renovar);
router.post("/:id/devolver", devolver);

export default router;
