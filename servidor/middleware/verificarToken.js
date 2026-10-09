// Revisa el "gafete digital" en cada ruta protegida.
// Si es válido, deja pasar; si no, responde 401 y la petición se detiene aquí.
import jwt from "jsonwebtoken";

export function verificarToken(req, res, next) {
  const cabecera = req.headers.authorization || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Necesitas iniciar sesión." });
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = datos.id;
    next();
  } catch {
    return res
      .status(401)
      .json({ error: "Tu sesión expiró. Inicia sesión de nuevo." });
  }
}
