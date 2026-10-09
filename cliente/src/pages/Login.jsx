import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Library, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { usuario, iniciarSesion } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión, no tiene sentido mostrar el login
  if (usuario) return <Navigate to="/catalogo" replace />;

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await iniciarSesion(email, password);
      // Al guardarse el usuario, la línea de arriba redirige sola al catálogo
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border-t-4 border-buap-cyan bg-white shadow-xl shadow-slate-300/50">
        <div className="px-8 pt-8 pb-7">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-buap-navy text-white">
            <Library size={28} />
          </div>

          <p className="mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-full bg-buap-cyan-light px-3 py-1 text-xs font-semibold text-buap-navy">
            <ShieldCheck size={14} />
            Acceso administrativo
          </p>

          <h1 className="mt-3 text-center text-2xl font-extrabold text-buap-navy">
            Sistema de Gestión de Biblioteca
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            Para personal administrativo y bibliotecarios de la BUAP.
          </p>

          <form onSubmit={enviar} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Correo institucional</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-slate-100 px-3 ring-2 ring-transparent transition focus-within:bg-white focus-within:ring-buap-cyan">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre.apellido@correo.buap.mx"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Contraseña</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-slate-100 px-3 ring-2 ring-transparent transition focus-within:bg-white focus-within:ring-buap-cyan">
                <Lock size={18} className="text-slate-400" />
                <input
                  type={verPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-lg bg-buap-cyan py-3 text-sm font-bold text-buap-navy-dark transition hover:brightness-95 disabled:opacity-60"
            >
              {enviando ? "Verificando…" : "Iniciar sesión"}
            </button>
          </form>
        </div>


      </div>
    </div>
  );
}
