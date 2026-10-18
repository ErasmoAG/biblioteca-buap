import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Library, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

export default function Login() {
  const { usuario, iniciarSesion, registrarBibliotecario } = useAuth();
  const [modoRegistro, setModoRegistro] = useState(false);
  const [registroDisponible, setRegistroDisponible] = useState(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    api("/auth/registro-disponible")
      .then((datos) => {
        if (vigente) setRegistroDisponible(datos.disponible === true);
      })
      .catch(() => {
        if (vigente) setRegistroDisponible(null);
      });
    return () => { vigente = false; };
  }, []);

  // Si ya hay sesión, no tiene sentido mostrar el login
  if (usuario) return <Navigate to="/catalogo" replace />;

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    if (modoRegistro && password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    try {
      if (modoRegistro) {
        await registrarBibliotecario(nombre, email, password);
      } else {
        await iniciarSesion(email, password);
      }
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
            {modoRegistro ? <UserRoundPlus size={14} /> : <ShieldCheck size={14} />}
            {modoRegistro ? "Registro de bibliotecario" : "Acceso administrativo"}
          </p>

          <h1 className="mt-3 text-center text-2xl font-extrabold text-buap-navy">
            Sistema de Gestión de Biblioteca
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            {modoRegistro
              ? "Crea una cuenta para acceder y administrar el sistema."
              : "Acceso para personal bibliotecario."}
          </p>

          {modoRegistro && registroDisponible === false && (
            <p role="alert" className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              El registro está deshabilitado en esta instalación. Contacta al administrador.
            </p>
          )}

          <form onSubmit={enviar} className="mt-7 space-y-4">
            {modoRegistro && (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Nombre completo</span>
                <input
                  type="text"
                  required
                  maxLength={150}
                  autoComplete="name"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-slate-100 px-3 py-3 text-sm outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-buap-cyan"
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Correo electrónico</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-slate-100 px-3 ring-2 ring-transparent transition focus-within:bg-white focus-within:ring-buap-cyan">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@correo.com"
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
                  autoComplete={modoRegistro ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={modoRegistro ? 8 : undefined}
                  maxLength={modoRegistro ? 72 : undefined}
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

            {modoRegistro && (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Confirmar contraseña</span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  className="mt-1.5 w-full rounded-lg bg-slate-100 px-3 py-3 text-sm outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-buap-cyan"
                />
                <span className="mt-1 block text-xs text-slate-500">Mínimo 8 caracteres.</span>
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando || (modoRegistro && registroDisponible === false)}
              className="w-full rounded-lg bg-buap-cyan py-3 text-sm font-bold text-buap-navy-dark transition hover:brightness-95 disabled:opacity-60"
            >
              {enviando
                ? (modoRegistro ? "Creando cuenta…" : "Verificando…")
                : (modoRegistro ? "Crear cuenta" : "Iniciar sesión")}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            {modoRegistro ? "¿Ya tienes una cuenta? " : "¿Eres nuevo? "}
            <button
              type="button"
              onClick={() => {
                setModoRegistro((actual) => !actual);
                setError("");
              }}
              className="font-semibold text-buap-navy underline underline-offset-4 hover:text-buap-cyan"
            >
              {modoRegistro ? "Inicia sesión aquí" : "Crea una cuenta aquí"}
            </button>
          </p>
        </div>


      </div>
    </div>
  );
}
