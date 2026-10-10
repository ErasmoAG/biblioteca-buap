import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Users,
  ArrowLeftRight,
  RotateCcw,
  LogOut,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
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
  const [contraido, setContraido] = useState(false);

  function salir() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col bg-buap-navy text-white transition-[width] duration-200 ${
          contraido ? "w-20" : "w-56"
        }`}
      >
        <div
          className={`flex items-center border-b border-white/10 py-5 ${
            contraido ? "justify-center px-2" : "justify-between px-5"
          }`}
        >
          {!contraido && (
            <div>
              <p className="text-xl font-extrabold tracking-tight">BUAP</p>
              <p className="text-xs leading-tight text-white/70">
                Sistema
                <br />
                Bibliotecario
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setContraido((actual) => !actual)}
            aria-label={contraido ? "Expandir menú lateral" : "Contraer menú lateral"}
            aria-pressed={contraido}
            title={contraido ? "Expandir menú" : "Contraer menú"}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10"
          >
            {contraido ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {enlaces.map(({ to, texto, icono: Icono }) => (
            <NavLink
              key={to}
              to={to}
              title={contraido ? texto : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  contraido ? "justify-center px-0" : ""
                } ${
                  isActive
                    ? "bg-buap-cyan text-buap-navy-dark"
                    : "text-white/85 hover:bg-white/10"
                }`
              }
            >
              <Icono size={18} className="shrink-0" />
              {!contraido && texto}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={salir}
          title={contraido ? "Cerrar sesión" : undefined}
          className={`m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 ${
            contraido ? "justify-center px-0" : ""
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {!contraido && "Cerrar sesión"}
        </button>
      </aside>

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
