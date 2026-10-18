import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Si hay un token guardado, hay que verificarlo con el servidor antes de mostrar nada.
  const [cargando, setCargando] = useState(() => Boolean(localStorage.getItem("token")));

  useEffect(() => {
    if (!localStorage.getItem("token")) return;

    api("/auth/me")
      .then((datos) => setUsuario(datos.usuario))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setCargando(false));
  }, []);

  async function iniciarSesion(email, password) {
    const datos = await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    localStorage.setItem("token", datos.token);
    setUsuario(datos.usuario);
  }

  async function registrarBibliotecario(nombre, email, password) {
    const datos = await api("/auth/registro", {
      method: "POST",
      body: { nombre, email, password },
    });
    localStorage.setItem("token", datos.token);
    setUsuario(datos.usuario);
  }

  function cerrarSesion() {
    localStorage.removeItem("token");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{
      usuario,
      cargando,
      iniciarSesion,
      registrarBibliotecario,
      cerrarSesion,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
