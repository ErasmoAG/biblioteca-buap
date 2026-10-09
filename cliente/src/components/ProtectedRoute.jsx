import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-500">
        Verificando sesión…
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;

  return <Outlet />;
}
