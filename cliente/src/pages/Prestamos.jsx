import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LoaderCircle,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { api } from "../api.js";

const TAMANO_PAGINA = 10;
const MAX_PRESTAMOS = 15;
const MAX_RENOVACIONES = 2;
const DIAS_POR_RENOVACION = 5;
const DIAS_POR_GRUPO = {
  prepa_lic_tecnica: 15,
  posgrado: 20,
  investigador_instituto: 28,
};
const ETIQUETAS_TIPO = {
  libro: "Libro",
  tesis: "Tesis",
  revista: "Revista",
  material_especial: "Material especial",
  cd: "CD",
  dvd: "DVD",
  ipad: "iPad",
  equipo_computo: "Equipo de cómputo",
};

function fechaLegible(valor) {
  if (!valor) return "—";
  const fecha = String(valor).slice(0, 10);
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return "—";
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function claseCampo() {
  return "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-buap-cyan focus:ring-2 focus:ring-buap-cyan/20";
}

function perfilLegible(perfil) {
  return String(perfil || "sin perfil")
    .replaceAll("_", " ")
    .replace(/^\w/, (letra) => letra.toUpperCase());
}

function razonesInelegibilidad(usuario) {
  const razones = [];
  const diasBase = DIAS_POR_GRUPO[usuario.tipo_prestatario];
  if (!diasBase || usuario.perfil_prestatario === "pendiente_clasificacion") {
    razones.push("perfil pendiente o inválido");
  }
  if (usuario.perfil_prestatario === "externo" || usuario.tipo_prestatario === "externo") {
    razones.push("usuario externo: solo consulta en sala");
  }
  if (!usuario.credencial_vigente) razones.push("credencial vencida o sin vigencia");
  if (!usuario.registro_vigente) razones.push("registro bibliotecario desactualizado");
  if (Number(usuario.prestamos_vencidos) > 0) razones.push("tiene préstamos vencidos");
  if (Number(usuario.multas_pendientes) > 0 || Number(usuario.adeudo_pendiente) > 0) razones.push("tiene multas pendientes");
  if (Number(usuario.prestamos_activos) >= MAX_PRESTAMOS) razones.push("alcanzó el límite de préstamos activos");
  return [...new Set(razones)];
}

function diasPlazo(usuario, material) {
  if (["ipad", "equipo_computo"].includes(material?.tipo)) {
    const dias = Number(material.dias_prestamo);
    return Number.isInteger(dias) && dias > 0 ? dias : null;
  }
  return DIAS_POR_GRUPO[usuario?.tipo_prestatario] || null;
}

function EtiquetaEstado({ estado }) {
  const clase = estado === "activo"
    ? "bg-emerald-50 text-emerald-800"
    : estado === "vencido"
      ? "bg-red-50 text-red-700"
      : "bg-slate-100 text-slate-600";
  const texto = estado === "vencido" ? "Vencido" : estado === "devuelto" ? "Devuelto" : "Activo";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${clase}`}>{texto}</span>;
}

function Modal({ titulo, onCerrar, children }) {
  useEffect(() => {
    function cerrarConEscape(event) {
      if (event.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCerrar();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="modal-prestamo-titulo" className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 id="modal-prestamo-titulo" className="text-lg font-bold text-buap-navy">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar ventana" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function Prestamos() {
  const [usuarios, setUsuarios] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState("");
  const [busquedaMaterial, setBusquedaMaterial] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [materialSeleccionado, setMaterialSeleccionado] = useState(null);
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [mostrarMateriales, setMostrarMateriales] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [cargandoMateriales, setCargandoMateriales] = useState(false);
  const [errorOpciones, setErrorOpciones] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [prestamos, setPrestamos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("activos");
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState(null);
  const [modalRenovacion, setModalRenovacion] = useState(null);
  const [confirmoSinApartado, setConfirmoSinApartado] = useState(false);
  const [renovando, setRenovando] = useState(false);

  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const rango = useMemo(() => ({
    inicio: total === 0 ? 0 : pagina * TAMANO_PAGINA + 1,
    fin: Math.min((pagina + 1) * TAMANO_PAGINA, total),
  }), [pagina, total]);
  const plazoSeleccionado = diasPlazo(usuarioSeleccionado, materialSeleccionado);

  useEffect(() => {
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      setCargandoUsuarios(true);
      setErrorOpciones("");
      try {
        const datos = await api(`/prestamos/opciones/prestatarios?search=${encodeURIComponent(busquedaUsuario)}`);
        if (!cancelado) setUsuarios(datos.prestatarios);
      } catch (err) {
        if (!cancelado) setErrorOpciones(err.message);
      } finally {
        if (!cancelado) setCargandoUsuarios(false);
      }
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [busquedaUsuario]);

  useEffect(() => {
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      setCargandoMateriales(true);
      setErrorOpciones("");
      try {
        const datos = await api(`/prestamos/opciones/materiales?search=${encodeURIComponent(busquedaMaterial)}`);
        if (!cancelado) setMateriales(datos.materiales);
      } catch (err) {
        if (!cancelado) setErrorOpciones(err.message);
      } finally {
        if (!cancelado) setCargandoMateriales(false);
      }
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [busquedaMaterial]);

  useEffect(() => {
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      setCargando(true);
      setError("");
      const parametros = new URLSearchParams({
        limit: String(TAMANO_PAGINA),
        offset: String(pagina * TAMANO_PAGINA),
      });
      if (busqueda.trim()) parametros.set("search", busqueda.trim());
      if (estado) parametros.set("estado", estado);
      try {
        const datos = await api(`/prestamos?${parametros.toString()}`);
        if (!cancelado) {
          setPrestamos(datos.prestamos);
          setTotal(datos.total);
        }
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, 180);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [busqueda, estado, pagina, recarga]);

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  async function crearPrestamo(event) {
    event.preventDefault();
    if (!usuarioSeleccionado || !materialSeleccionado || !plazoSeleccionado) return;
    setGuardando(true);
    try {
      const datos = await api("/prestamos", {
        method: "POST",
        body: {
          id_usuario: usuarioSeleccionado.id,
          id_material: materialSeleccionado.id,
        },
      });
      setAviso({ tipo: "exito", mensaje: `Préstamo registrado. Vence el ${fechaLegible(datos.prestamo.fecha_vencimiento)}.` });
      setUsuarioSeleccionado(null);
      setMaterialSeleccionado(null);
      setBusquedaUsuario("");
      setBusquedaMaterial("");
      setMostrarUsuarios(false);
      setMostrarMateriales(false);
      setPagina(0);
      setEstado("activos");
      setRecarga((actual) => actual + 1);
    } catch (err) {
      setAviso({ tipo: "error", mensaje: err.message });
    } finally {
      setGuardando(false);
    }
  }

  async function renovar() {
    if (!modalRenovacion || !confirmoSinApartado) return;
    setRenovando(true);
    try {
      const datos = await api(`/prestamos/${modalRenovacion.id}/renovar`, {
        method: "POST",
        body: { confirmo_sin_apartado: true },
      });
      setAviso({ tipo: "exito", mensaje: `Préstamo renovado por ${datos.prestamo.dias_extension} días. Nueva fecha: ${fechaLegible(datos.prestamo.fecha_vencimiento)}.` });
      setModalRenovacion(null);
      setConfirmoSinApartado(false);
      setRecarga((actual) => actual + 1);
    } catch (err) {
      setAviso({ tipo: "error", mensaje: err.message });
    } finally {
      setRenovando(false);
    }
  }

  function abrirRenovacion(prestamo) {
    setModalRenovacion(prestamo);
    setConfirmoSinApartado(false);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-buap-cyan">Circulación</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-buap-navy">Préstamos</h1>
          <p className="mt-1 text-sm text-slate-500">Registra préstamos a domicilio y gestiona las renovaciones.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm sm:self-auto">
          <ArrowLeftRight size={16} className="text-buap-cyan" /> Máximo {MAX_PRESTAMOS} préstamos activos
        </div>
      </div>

      {aviso && (
        <div role={aviso.tipo === "error" ? "alert" : "status"} className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${aviso.tipo === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          <p>{aviso.mensaje}</p>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar notificación"><X size={17} /></button>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-buap-cyan-light text-buap-navy"><BookOpen size={20} /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Registrar préstamo</h2>
            <p className="mt-0.5 text-sm text-slate-500">El sistema valida perfil, credencial, adeudos, vencimientos y disponibilidad antes de guardar.</p>
          </div>
        </div>

        <form onSubmit={crearPrestamo} className="grid gap-4 lg:grid-cols-2">
          <div className="relative">
            <label htmlFor="buscar-prestatario" className="text-sm font-semibold text-slate-700">Prestatario</label>
            <div className="relative">
              <UserRound size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="buscar-prestatario"
                autoComplete="off"
                value={usuarioSeleccionado ? `${usuarioSeleccionado.nombre} · ${usuarioSeleccionado.matricula_o_num_trabajador || perfilLegible(usuarioSeleccionado.perfil_prestatario)}` : busquedaUsuario}
                onFocus={() => setMostrarUsuarios(true)}
                onChange={(event) => {
                  setUsuarioSeleccionado(null);
                  setBusquedaUsuario(event.target.value);
                  setMostrarUsuarios(true);
                }}
                className={`${claseCampo()} pl-9`}
                placeholder="Buscar por nombre o matrícula"
              />
              {cargandoUsuarios && <LoaderCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
            </div>
            {mostrarUsuarios && !usuarioSeleccionado && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {usuarios.length === 0 && !cargandoUsuarios ? <p className="px-3 py-4 text-sm text-slate-500">No se encontraron prestatarios.</p> : usuarios.map((usuario) => {
                  const razones = razonesInelegibilidad(usuario);
                  const elegible = razones.length === 0;
                  return (
                    <button
                      type="button"
                      key={usuario.id}
                      disabled={!elegible}
                      onClick={() => {
                        setUsuarioSeleccionado(usuario);
                        setBusquedaUsuario("");
                        setMostrarUsuarios(false);
                      }}
                      className="block w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50/70"
                    >
                      <span className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-800">{usuario.nombre}</span><span className="text-xs text-slate-500">{usuario.matricula_o_num_trabajador || perfilLegible(usuario.perfil_prestatario)}</span></span>
                      <span className="mt-0.5 block text-xs text-slate-500">{perfilLegible(usuario.perfil_prestatario)} · {usuario.prestamos_activos} préstamos activos</span>
                      {!elegible && <span className="mt-1 block text-xs font-medium text-red-700">No elegible: {razones.join("; ")}.</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {usuarioSeleccionado && <p className="mt-1.5 text-xs text-emerald-700"><Check size={13} className="mr-1 inline" />Perfil y requisitos vigentes.</p>}
          </div>

          <div className="relative">
            <label htmlFor="buscar-material" className="text-sm font-semibold text-slate-700">Material disponible para domicilio</label>
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="buscar-material"
                autoComplete="off"
                value={materialSeleccionado ? `${materialSeleccionado.titulo} · ${ETIQUETAS_TIPO[materialSeleccionado.tipo] || materialSeleccionado.tipo}` : busquedaMaterial}
                onFocus={() => setMostrarMateriales(true)}
                onChange={(event) => {
                  setMaterialSeleccionado(null);
                  setBusquedaMaterial(event.target.value);
                  setMostrarMateriales(true);
                }}
                className={`${claseCampo()} pl-9`}
                placeholder="Buscar por título, autor o signatura"
              />
              {cargandoMateriales && <LoaderCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
            </div>
            {mostrarMateriales && !materialSeleccionado && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {materiales.length === 0 && !cargandoMateriales ? <p className="px-3 py-4 text-sm text-slate-500">No hay coincidencias disponibles para préstamo a domicilio.</p> : materiales.map((material) => {
                  const plazo = diasPlazo(usuarioSeleccionado, material);
                  const requiereConfigurarDias = ["ipad", "equipo_computo"].includes(material.tipo)
                    && (!Number.isInteger(Number(material.dias_prestamo)) || Number(material.dias_prestamo) < 1);
                  return (
                    <button
                      type="button"
                      key={material.id}
                      disabled={requiereConfigurarDias}
                      onClick={() => {
                        setMaterialSeleccionado(material);
                        setBusquedaMaterial("");
                        setMostrarMateriales(false);
                      }}
                      className="block w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50/70"
                    >
                      <span className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-800">{material.titulo}</span><span className="text-xs text-slate-500">{ETIQUETAS_TIPO[material.tipo] || material.tipo}</span></span>
                      <span className="mt-0.5 block text-xs text-slate-500">{material.autor || material.signatura || "Sin autor"} · {material.ejemplares_disponibles} disponible(s)</span>
                      {requiereConfigurarDias && <span className="mt-1 block text-xs font-medium text-amber-800">Configura los días de préstamo en el catálogo antes de prestarlo.</span>}
                      {plazo && <span className="mt-1 block text-xs text-buap-navy">Plazo aplicable: {plazo} días naturales.</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {materialSeleccionado && <p className="mt-1.5 text-xs text-emerald-700"><Check size={13} className="mr-1 inline" />Disponible · {materialSeleccionado.ejemplares_disponibles} de {materialSeleccionado.ejemplares_totales} ejemplar(es).</p>}
          </div>

          {errorOpciones && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 lg:col-span-2">{errorOpciones}</p>}

          {usuarioSeleccionado && materialSeleccionado && (
            <div className="rounded-lg border border-buap-cyan/30 bg-buap-cyan-light/50 p-3.5 text-sm text-slate-700 lg:col-span-2">
              <p className="font-semibold text-buap-navy">Resumen del préstamo</p>
              <p className="mt-1">{usuarioSeleccionado.nombre} recibirá “{materialSeleccionado.titulo}”. Plazo: <strong>{plazoSeleccionado || "sin configurar"} días naturales</strong>; renovaciones: hasta {MAX_RENOVACIONES} de {DIAS_POR_RENOVACION} días cada una.</p>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4 lg:col-span-2">
            <button type="submit" disabled={guardando || !usuarioSeleccionado || !materialSeleccionado || !plazoSeleccionado} className="inline-flex items-center gap-2 rounded-lg bg-buap-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-buap-navy-dark disabled:cursor-not-allowed disabled:opacity-50">
              {guardando ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowLeftRight size={17} />}
              {guardando ? "Registrando…" : "Registrar préstamo"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Historial de préstamos</h2>
            <p className="mt-0.5 text-sm text-slate-500">Busca por prestatario, matrícula, título, autor o signatura.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Búsqueda</span>
              <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(0); }} className={`${claseCampo()} pl-9`} placeholder="Nombre o material" /></div>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Estado</span>
              <select value={estado} onChange={(event) => { setEstado(event.target.value); setPagina(0); }} className={claseCampo()}>
                <option value="">Todos</option>
                <option value="activos">Activos</option>
                <option value="vencidos">Vencidos</option>
                <option value="devueltos">Devueltos</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Prestatario</th>
                <th className="px-4 py-3 font-bold">Material</th>
                <th className="px-4 py-3 font-bold">Préstamo</th>
                <th className="px-4 py-3 font-bold">Vencimiento</th>
                <th className="px-4 py-3 font-bold">Estado / renovaciones</th>
                <th className="px-4 py-3 text-right font-bold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr><td colSpan="6" className="px-4 py-14 text-center text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin" /> Cargando préstamos…</span></td></tr>
              ) : error ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setRecarga((actual) => actual + 1)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-buap-navy underline"><RefreshCw size={14} /> Reintentar</button></td></tr>
              ) : prestamos.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-14 text-center"><div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500"><BookOpen size={21} /></div><p className="mt-3 font-semibold text-slate-700">No hay préstamos para mostrar</p><p className="mt-1 text-sm text-slate-500">Prueba otra búsqueda o registra un préstamo.</p></td></tr>
              ) : prestamos.map((prestamo) => {
                const materialEsEquipo = ["ipad", "equipo_computo"].includes(prestamo.material_tipo);
                const detalleMaterial = materialEsEquipo
                  ? [prestamo.material_marca, prestamo.material_modelo].filter(Boolean).join(" ")
                  : prestamo.material_autor;
                const puedeRenovar = prestamo.estado === "activo" && Number(prestamo.renovaciones_usadas) < MAX_RENOVACIONES;
                return (
                  <tr key={prestamo.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3.5"><p className="font-semibold text-slate-800">{prestamo.usuario_nombre}</p><p className="mt-0.5 text-xs text-slate-500">{prestamo.matricula_o_num_trabajador || perfilLegible(prestamo.perfil_prestatario)}</p></td>
                    <td className="px-4 py-3.5"><p className="font-semibold text-slate-800">{prestamo.material_titulo}</p><p className="mt-0.5 text-xs text-slate-500">{ETIQUETAS_TIPO[prestamo.material_tipo] || prestamo.material_tipo}{detalleMaterial ? ` · ${detalleMaterial}` : ""}</p></td>
                    <td className="px-4 py-3.5 text-slate-600">{fechaLegible(prestamo.fecha_prestamo)}{prestamo.fecha_devolucion && <p className="mt-0.5 text-xs text-slate-500">Devuelto {fechaLegible(prestamo.fecha_devolucion)}</p>}</td>
                    <td className="px-4 py-3.5"><span className={prestamo.estado === "vencido" ? "font-semibold text-red-700" : "text-slate-600"}>{fechaLegible(prestamo.fecha_vencimiento)}</span>{prestamo.estado === "vencido" && <p className="mt-0.5 text-xs text-red-600">{prestamo.dias_atraso} día(s) de atraso</p>}{Number(prestamo.adeudo_pendiente) > 0 && <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><CircleDollarSign size={13} /> ${Number(prestamo.adeudo_pendiente).toFixed(2)} pendiente</p>}</td>
                    <td className="px-4 py-3.5"><EtiquetaEstado estado={prestamo.estado} /><p className="mt-1.5 text-xs text-slate-500">{prestamo.renovaciones_usadas} de {MAX_RENOVACIONES} renovaciones</p></td>
                    <td className="px-4 py-3.5 text-right">{puedeRenovar ? <button type="button" onClick={() => abrirRenovacion(prestamo)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-buap-navy hover:border-buap-cyan hover:bg-buap-cyan-light"><RefreshCw size={14} /> Renovar</button> : <span className="text-xs text-slate-400">{prestamo.estado === "activo" ? "Máximo alcanzado" : "—"}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-500">Mostrando <span className="font-semibold text-slate-700">{rango.inicio}–{rango.fin}</span> de <span className="font-semibold text-slate-700">{total}</span> préstamos</p>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" disabled={pagina === 0 || cargando} onClick={() => setPagina((actual) => Math.max(0, actual - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /> Anterior</button>
            <span className="min-w-20 text-center text-slate-500">Página {Math.min(pagina + 1, paginas)} de {paginas}</span>
            <button type="button" disabled={pagina + 1 >= paginas || cargando} onClick={() => setPagina((actual) => Math.min(paginas - 1, actual + 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {modalRenovacion && (
        <Modal titulo="Confirmar renovación" onCerrar={() => !renovando && setModalRenovacion(null)}>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex gap-3 rounded-lg border border-buap-cyan/30 bg-buap-cyan-light/50 p-3.5 text-sm text-slate-700">
              <CalendarClock size={19} className="mt-0.5 shrink-0 text-buap-navy" />
              <p>“{modalRenovacion.material_titulo}” de {modalRenovacion.usuario_nombre}. Se añadirán {DIAS_POR_RENOVACION} días a la fecha actual de vencimiento ({fechaLegible(modalRenovacion.fecha_vencimiento)}). Esta será la renovación {Number(modalRenovacion.renovaciones_usadas) + 1} de {MAX_RENOVACIONES}.</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} /> Verificación de apartado</p>
              <p className="mt-1.5">El proyecto aún no administra apartados. Confirma con el registro de la biblioteca que ninguna otra persona haya apartado este material.</p>
              <label className="mt-3 flex items-start gap-2.5">
                <input type="checkbox" checked={confirmoSinApartado} onChange={(event) => setConfirmoSinApartado(event.target.checked)} className="mt-0.5 size-4 accent-[#003b5c]" />
                <span>Confirmo que no existe un apartado pendiente para este material.</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={renovando} onClick={() => setModalRenovacion(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button type="button" disabled={renovando || !confirmoSinApartado} onClick={renovar} className="inline-flex items-center gap-2 rounded-lg bg-buap-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-buap-navy-dark disabled:cursor-not-allowed disabled:opacity-50">{renovando && <LoaderCircle size={16} className="animate-spin" />}{renovando ? "Renovando…" : "Confirmar renovación"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
