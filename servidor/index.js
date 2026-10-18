import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const PUERTO = 3000;
app.listen(PUERTO, () => {
  console.log(`Servidor corriendo en http://localhost:${PUERTO}`);
});
