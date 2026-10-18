import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import materialesRoutes from "./routes/materiales.js";
import usuariosRoutes from "./routes/usuarios.js";
import prestamosRoutes from "./routes/prestamos.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ mensaje: "API de la Biblioteca BUAP funcionando" });
});

app.use("/api/auth", authRoutes);
app.use("/api/materiales", materialesRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/prestamos", prestamosRoutes);

export default app;
