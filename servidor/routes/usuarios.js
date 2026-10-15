import { Router } from "express";
import { verificarToken } from "../middleware/verificarToken.js";
import {
  actualizar,
  crear,
  detalle,
  eliminar,
  estadisticas,
  listar,
} from "../controllers/usuariosController.js";

const router = Router();

router.use(verificarToken);
router.get("/estadisticas", estadisticas);
router.get("/", listar);
router.get("/:id", detalle);
router.post("/", crear);
router.put("/:id", actualizar);
router.delete("/:id", eliminar);

export default router;
