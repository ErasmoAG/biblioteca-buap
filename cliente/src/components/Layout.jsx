import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, Users, ArrowLeftRight, RotateCcw, LogOut, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const enlaces = [
  { to: "/catalogo", texto: "Catálogo", icono: BookOpen },
  { to: "/usuarios", texto: "Usuarios", icono: Users },
  { to: "/prestamos", texto: "Préstamos", icono: ArrowLeftRight },
  { to: "/devoluciones", texto: "Devoluciones", icono: RotateCcw },
];

function Reloj() {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const fecha = ahora.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const hora = ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <span className="flex items-center gap-2 text-sm text-slate-500">
      <Clock size={16} />
      {fecha}, {hora}
    </span>
  );
}

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  function salir() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Barra lateral */}
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-buap-navy text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-xl font-extrabold tracking-tight">BUAP</p>
          <p className="text-xs leading-tight text-white/70">
            Sistema
            <br />
            Bibliotecario
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {enlaces.map(({ to, texto, icono: Icono }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-buap-cyan text-buap-navy-dark"
                    : "text-white/85 hover:bg-white/10"
                }`
              }
            >
              <Icono size={18} />
              {texto}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={salir}
          className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </aside>

      {/* Zona principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <Reloj />
          <div className="text-right leading-tight">
            <p className="text-sm font-bold">{usuario.nombre}</p>
            <p className="text-xs text-slate-500">Personal administrativo</p>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
