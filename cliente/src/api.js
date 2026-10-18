// Único punto por donde React habla con el servidor.
// Nunca se conecta a la base de datos: solo llama a la API de Node.js/Express.
const API_URL = "http://localhost:3000/api";

export async function api(ruta, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");

  let respuesta;
  const metodo = method.toUpperCase();
  // Repetir lecturas y login es seguro; nunca se reintentan altas, cambios o bajas.
  // Esto cubre el instante en que el cliente intenta conectar mientras Express
  // termina de iniciar o cuando localhost falla de forma transitoria.
  const maxReintentosRed = metodo === "GET" || ruta === "/auth/login" ? 2 : 0;
  const esperas = [350, 900];

  for (let intento = 0; ; intento += 1) {
    try {
      respuesta = await fetch(`${API_URL}${ruta}`, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      break;
    } catch (error) {
      if (intento < maxReintentosRed) {
        await new Promise((resolve) => setTimeout(resolve, esperas[intento]));
        continue;
      }
      console.error("No se pudo conectar con la API de la biblioteca:", error);
      throw new Error("No se pudo conectar con el servidor. ¿Está encendido?");
    }
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const error = new Error(datos.error || "Ocurrió un error inesperado.");
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}
