// Único punto por donde React habla con el servidor.
// Nunca se conecta a la base de datos: solo llama a la API de Node.js/Express.
const API_URL = "http://localhost:3000/api";

export async function api(ruta, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. ¿Está encendido?");
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const error = new Error(datos.error || "Ocurrió un error inesperado.");
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}
