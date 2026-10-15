import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import CatalogoMateriales from "./pages/CatalogoMateriales.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import Prestamos from "./pages/Prestamos.jsx";
import Devoluciones from "./pages/Devoluciones.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Todo lo que está aquí dentro exige haber iniciado sesión */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route
            path="/catalogo"
            element={<CatalogoMateriales />}
          />
          <Route
            path="/usuarios"
            element={<Usuarios />}
          />
          <Route
            path="/prestamos"
            element={<Prestamos />}
          />
          <Route
            path="/devoluciones"
            element={<Devoluciones />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/catalogo" replace />} />
    </Routes>
  );
}
