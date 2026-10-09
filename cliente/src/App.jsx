import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import EnConstruccion from "./pages/EnConstruccion.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Todo lo que está aquí dentro exige haber iniciado sesión */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route
            path="/catalogo"
            element={
              <EnConstruccion
                titulo="Catálogo de materiales"
                descripcion="Consulta, alta y edición de libros, CDs, DVDs y equipo."
              />
            }
          />
          <Route
            path="/usuarios"
            element={
              <EnConstruccion
                titulo="Usuarios"
                descripcion="Registro y consulta de las personas que piden material prestado."
              />
            }
          />
          <Route
            path="/prestamos"
            element={
              <EnConstruccion
                titulo="Préstamos"
                descripcion="Registro de préstamos y renovaciones."
              />
            }
          />
          <Route
            path="/devoluciones"
            element={
              <EnConstruccion
                titulo="Devoluciones"
                descripcion="Recepción de material y cálculo de multas por atraso."
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/catalogo" replace />} />
    </Routes>
  );
}
