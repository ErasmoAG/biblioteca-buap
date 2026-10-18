// RUTAS: la "ventanilla" que recibe las peticiones de React y llama a la lógica.
import { Router } from "express";
import {
  iniciarSesion,
  obtenerEstadoRegistro,
  obtenerUsuario,
  registrarBibliotecario,
} from "../services/authService.js";
import { verificarToken } from "../middleware/verificarToken.js";

const router = Router();

// El alta pública depende del entorno y de REGISTRO_BIBLIOTECARIOS_HABILITADO.
router.get("/registro-disponible", async (_req, res) => {
  try {
    res.json(await obtenerEstadoRegistro());
  } catch (error) {
    console.error("Error al consultar el estado del registro administrativo:", error);
    res.status(500).json({ error: "No se pudo consultar el estado del registro." });
  }
});

router.post("/registro", async (req, res) => {
  try {
    res.status(201).json(await registrarBibliotecario(req.body));
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error al registrar al bibliotecario:", error);
    res.status(500).json({ error: "No se pudo crear la cuenta. Intenta de nuevo." });
  }
});

// POST /api/auth/login  ->  { email, password }  ->  { token, usuario }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const resultado = await iniciarSesion(email, password);
    res.json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: "Error del servidor. Intenta de nuevo." });
  }
});

// GET /api/auth/me  ->  devuelve quién es el usuario del token (ruta protegida)
router.get("/me", verificarToken, async (req, res) => {
  try {
    const usuario = await obtenerUsuario(req.usuarioId);
    if (!usuario) {
      return res.status(401).json({ error: "Usuario no encontrado." });
    }
    res.json({ usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error del servidor. Intenta de nuevo." });
  }
});

export default router;
