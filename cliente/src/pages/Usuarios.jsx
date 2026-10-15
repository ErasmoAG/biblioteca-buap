import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { api } from "../api.js";

const GRUPOS_PERFIL = [
  { valor: "general", etiqueta: "Comunidad BUAP · grupo general", regla: "Regla del proyecto: 15 días; dos renovaciones de 5 días." },
  { valor: "academico", etiqueta: "Docencia y posgrado", regla: "Regla del proyecto: 20 días; dos renovaciones de 5 días." },
  { valor: "investigacion", etiqueta: "Investigación e institutos", regla: "Regla del proyecto: 28 días; dos renovaciones de 5 días." },
  { valor: "externo", etiqueta: "Público externo", regla: "Solo consulta en sala; sin préstamo a domicilio." },
];

const PERFILES_PRESTATARIO = [
  { valor: "preparatoria", etiqueta: "Estudiante de preparatoria", grupo: "general", identificador: "Matrícula", requisito: "Credencial BUAP vigente y póliza de inscripción pagada." },
  { valor: "licenciatura", etiqueta: "Estudiante de licenciatura", grupo: "general", identificador: "Matrícula", requisito: "Credencial BUAP vigente y póliza de inscripción pagada." },
  { valor: "carrera_tecnica", etiqueta: "Estudiante de carrera técnica", grupo: "general", identificador: "Matrícula", requisito: "Credencial BUAP vigente y documento de inscripción." },
  { valor: "egresado_pasante", etiqueta: "Egresado o pasante", grupo: "general", identificador: "Matrícula / identificador BUAP", requisito: "Validar requisitos del servicio de préstamo para egresados o pasantes." },
  { valor: "intercambio", etiqueta: "Estudiante de intercambio", grupo: "general", identificador: "Matrícula / identificador BUAP", requisito: "Credencial o constancia vigente de intercambio; confirmar periodo autorizado." },
  { valor: "trabajador_administrativo", etiqueta: "Personal administrativo", grupo: "general", identificador: "Número de trabajador", requisito: "Credencial BUAP vigente y último comprobante de nómina." },
  { valor: "jubilado", etiqueta: "Personal jubilado", grupo: "general", identificador: "Número de trabajador", requisito: "Credencial BUAP y documentación vigente que valide su registro." },
  { valor: "docente", etiqueta: "Docente o académico", grupo: "academico", identificador: "Número de trabajador", requisito: "Credencial BUAP vigente y último comprobante de nómina." },
  { valor: "maestria", etiqueta: "Estudiante de maestría", grupo: "academico", identificador: "Matrícula", requisito: "Credencial BUAP vigente y ficha de depósito o constancia de beca." },
  { valor: "doctorado", etiqueta: "Estudiante de doctorado", grupo: "academico", identificador: "Matrícula", requisito: "Credencial BUAP vigente y ficha de depósito o constancia de beca." },
  { valor: "investigador", etiqueta: "Investigador", grupo: "investigacion", identificador: "Número de trabajador", requisito: "Credencial BUAP vigente y adscripción institucional verificable." },
  { valor: "estudiante_instituto", etiqueta: "Estudiante de instituto", grupo: "investigacion", identificador: "Matrícula", requisito: "Credencial BUAP vigente y adscripción al instituto verificable." },
  { valor: "externo", etiqueta: "Persona externa", grupo: "externo", identificador: null, requisito: "Identificación oficial si la biblioteca la solicita; consulta únicamente en sala." },
];

const TAMANO_PAGINA = 10;
const FORM_VACIO = {
  nombre: "",
  perfil_prestatario: "",
  matricula_o_num_trabajador: "",
  vigencia_credencial: "",
  fecha_actualizacion_registro: "",
};

const GRUPO_POR_VALOR = Object.fromEntries(GRUPOS_PERFIL.map((grupo) => [grupo.valor, grupo]));
const PERFILES_POR_GRUPO = GRUPOS_PERFIL.map((grupo) => ({
  ...grupo,
  perfiles: PERFILES_PRESTATARIO.filter((perfil) => perfil.grupo === grupo.valor),
}));

function claseSelect() {
  return "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-buap-cyan focus:ring-2 focus:ring-buap-cyan/20";
}

function fechaLegible(valor) {
  if (!valor) return "—";
  const [anio, mes, dia] = String(valor).slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return "—";
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function estadoCredencial(usuario) {
  if (usuario.perfil_prestatario === "externo") {
    return { etiqueta: "No requiere credencial BUAP", clase: "bg-amber-50 text-amber-800" };
  }
  if (!usuario.vigencia_credencial) {
    return { etiqueta: "Sin vigencia registrada", clase: "bg-slate-100 text-slate-700" };
  }

  const valor = String(usuario.vigencia_credencial).slice(0, 10);
  const [anio, mes, dia] = valor.split("-").map(Number);
  const vigencia = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.ceil((vigencia.getTime() - hoy.getTime()) / 86400000);

  if (dias < 0) return { etiqueta: "Vencida", clase: "bg-red-50 text-red-700" };
  if (dias <= 30) return { etiqueta: "Por vencer", clase: "bg-amber-50 text-amber-800" };
  return { etiqueta: "Vigente", clase: "bg-emerald-50 text-emerald-800" };
}

function perfilLegible(valor) {
  return PERFILES_PRESTATARIO.find((perfil) => perfil.valor === valor)?.etiqueta
    || (valor === "pendiente_clasificacion" ? "Pendiente de clasificar" : valor || "Sin perfil");
}

function perfilSeleccionado(valor) {
  return PERFILES_PRESTATARIO.find((perfil) => perfil.valor === valor) || null;
}

function Modal({ titulo, onCerrar, children, ancho = "max-w-xl" }) {
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
      <section role="dialog" aria-modal="true" aria-labelledby="usuarios-modal-titulo" className={`my-auto w-full ${ancho} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 id="usuarios-modal-titulo" className="text-lg font-bold text-buap-navy">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar ventana" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function TarjetaResumen({ etiqueta, valor, detalle, icono: Icono, tono = "navy" }) {
  const colores = {
    navy: "bg-[#003b5c]/10 text-[#003b5c]",
    cyan: "bg-[#00b5e2]/15 text-[#006d8c]",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{etiqueta}</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">{valor}</p>
          <p className="mt-1 text-xs text-slate-500">{detalle}</p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${colores[tono]}`}>
          <Icono size={20} />
        </span>
      </div>
    </article>
  );
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaEstable, setBusquedaEstable] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroVigencia, setFiltroVigencia] = useState("");
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [recarga, setRecarga] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setBusquedaEstable(busqueda.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [busqueda]);

  useEffect(() => {
    let vigente = true;
    api("/usuarios/estadisticas")
      .then((data) => {
        if (vigente) setEstadisticas(data.estadisticas);
      })
      .catch(() => {
        if (vigente) setEstadisticas(null);
      });
    return () => { vigente = false; };
  }, [recarga]);

  useEffect(() => {
    let vigente = true;
    const params = new URLSearchParams({
      limit: String(TAMANO_PAGINA),
      offset: String(pagina * TAMANO_PAGINA),
    });
    if (busquedaEstable) params.set("search", busquedaEstable);
    if (filtroPerfil) params.set("perfil_prestatario", filtroPerfil);
    if (filtroVigencia) params.set("vigencia", filtroVigencia);

    setCargando(true);
    setError("");
    api(`/usuarios?${params.toString()}`)
      .then((data) => {
        if (!vigente) return;
        setUsuarios(data.usuarios || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        if (vigente) setError(err.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, [busquedaEstable, filtroPerfil, filtroVigencia, pagina, recarga]);

  useEffect(() => {
    if (!aviso) return undefined;
    const timeout = window.setTimeout(() => setAviso(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [aviso]);

  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const rango = useMemo(() => ({
    inicio: total === 0 ? 0 : pagina * TAMANO_PAGINA + 1,
    fin: Math.min((pagina + 1) * TAMANO_PAGINA, total),
  }), [pagina, total]);

  function limpiarFiltros() {
    setBusqueda("");
    setBusquedaEstable("");
    setFiltroPerfil("");
    setFiltroVigencia("");
    setPagina(0);
  }

  function abrirCrear() {
    setForm(FORM_VACIO);
    setErrorFormulario("");
    setModal({ tipo: "formulario", usuario: null });
  }

  function abrirEditar(usuario) {
    setForm({
      nombre: usuario.nombre || "",
      perfil_prestatario: usuario.perfil_prestatario || "pendiente_clasificacion",
      matricula_o_num_trabajador: usuario.matricula_o_num_trabajador || "",
      vigencia_credencial: usuario.vigencia_credencial ? String(usuario.vigencia_credencial).slice(0, 10) : "",
      fecha_actualizacion_registro: usuario.fecha_actualizacion_registro ? String(usuario.fecha_actualizacion_registro).slice(0, 10) : "",
    });
    setErrorFormulario("");
    setModal({ tipo: "formulario", usuario });
  }

  function cambiarPerfil(perfil_prestatario) {
    setForm((actual) => ({
      ...actual,
      perfil_prestatario,
      ...(perfil_prestatario === "externo"
        ? { matricula_o_num_trabajador: "", vigencia_credencial: "", fecha_actualizacion_registro: "" }
        : {}),
    }));
    setErrorFormulario("");
  }

  async function guardar(event) {
    event.preventDefault();
    setErrorFormulario("");
    setGuardando(true);
    try {
      const editando = Boolean(modal.usuario);
      await api(editando ? `/usuarios/${modal.usuario.id}` : "/usuarios", {
        method: editando ? "PUT" : "POST",
        body: {
          nombre: form.nombre.trim(),
          perfil_prestatario: form.perfil_prestatario,
          matricula_o_num_trabajador: form.perfil_prestatario === "externo"
            ? null
            : form.matricula_o_num_trabajador.trim(),
          vigencia_credencial: form.perfil_prestatario === "externo"
            ? null
            : form.vigencia_credencial || null,
          fecha_actualizacion_registro: form.perfil_prestatario === "externo"
            ? null
            : form.fecha_actualizacion_registro || null,
        },
      });
      setModal(null);
      setAviso({ tipo: "exito", mensaje: editando ? "Prestatario actualizado correctamente." : "Prestatario registrado correctamente." });
      setPagina(0);
      setRecarga((actual) => actual + 1);
    } catch (err) {
      setErrorFormulario(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!modal?.usuario) return;
    setEliminando(true);
    try {
      await api(`/usuarios/${modal.usuario.id}`, { method: "DELETE" });
      setModal(null);
      setAviso({ tipo: "exito", mensaje: "Prestatario eliminado." });
      if (pagina > 0 && usuarios.length === 1) setPagina(pagina - 1);
      setRecarga((actual) => actual + 1);
    } catch (err) {
      setModal(null);
      setAviso({ tipo: "error", mensaje: err.message });
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-buap-cyan">GESTIÓN DE PRESTATARIOS</p>
          <h1 className="mt-1 text-2xl font-extrabold text-buap-navy sm:text-3xl">Usuarios</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Administra a las personas que solicitan préstamos. El perfil específico ayuda a aplicar las reglas de biblioteca; sus cuentas administrativas se gestionan por separado.
          </p>
        </div>
        <button type="button" onClick={abrirCrear} className="inline-flex items-center justify-center gap-2 rounded-lg bg-buap-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-buap-navy-dark">
          <Plus size={18} /> Registrar prestatario
        </button>
      </div>

      {aviso && (
        <div role="status" className={`fixed right-5 top-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${aviso.tipo === "error" ? "border-red-200 bg-white text-red-700" : "border-emerald-200 bg-white text-emerald-800"}`}>
          {aviso.tipo === "error" ? <AlertTriangle size={19} className="mt-0.5 shrink-0" /> : <BadgeCheck size={19} className="mt-0.5 shrink-0" />}
          <span className="text-sm font-medium">{aviso.mensaje}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="ml-2 text-slate-400 hover:text-slate-700"><X size={17} /></button>
        </div>
      )}

      <section aria-label="Resumen de prestatarios" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaResumen etiqueta="Prestatarios registrados" valor={estadisticas?.total ?? "—"} detalle="Personas registradas para servicios bibliotecarios" icono={UsersIcon} />
        <TarjetaResumen etiqueta="Usuarios internos" valor={estadisticas?.internos ?? "—"} detalle="Comunidad universitaria agrupada por tipo" icono={BadgeCheck} tono="cyan" />
        <TarjetaResumen etiqueta="Usuarios externos" valor={estadisticas?.externos ?? "—"} detalle="Consulta de materiales dentro de la biblioteca" icono={UsersIcon} tono="amber" />
        <TarjetaResumen etiqueta="Credencial vencida o pendiente" valor={estadisticas?.credenciales_no_vigentes ?? "—"} detalle="Revisar antes de tramitar un préstamo" icono={CalendarClock} tono="green" />
      </section>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Buscar prestatario</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-buap-cyan focus-within:ring-2 focus-within:ring-buap-cyan/20">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(0); }} placeholder="Nombre, matrícula o número de trabajador" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400" />
              {busqueda && <button type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda" className="text-slate-400 hover:text-slate-700"><X size={16} /></button>}
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Perfil de prestatario</span>
            <select value={filtroPerfil} onChange={(event) => { setFiltroPerfil(event.target.value); setPagina(0); }} className={claseSelect()}>
              <option value="">Todos los perfiles</option>
              {PERFILES_PRESTATARIO.map((perfil) => <option key={perfil.valor} value={perfil.valor}>{perfil.etiqueta}</option>)}
              <option value="pendiente_clasificacion">Pendiente de clasificar (registro anterior)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Estado de credencial</span>
            <select value={filtroVigencia} onChange={(event) => { setFiltroVigencia(event.target.value); setPagina(0); }} className={claseSelect()}>
              <option value="">Cualquier estado</option>
              <option value="vigente">Vigente (más de 30 días)</option>
              <option value="por_vencer">Por vencer (próximos 30 días)</option>
              <option value="vencida">Vencida</option>
              <option value="sin_vigencia">Sin vigencia registrada</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Los filtros se combinan. Las personas externas solo pueden consultar material en sala.</span>
          {(busqueda || filtroPerfil || filtroVigencia) && (
            <button type="button" onClick={limpiarFiltros} className="font-semibold text-buap-navy underline underline-offset-2 hover:text-buap-cyan">Limpiar filtros</button>
          )}
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">Prestatario</th>
                <th scope="col" className="px-4 py-3 font-bold">Tipo</th>
                <th scope="col" className="px-4 py-3 font-bold">Matrícula / trabajador</th>
                <th scope="col" className="px-4 py-3 font-bold">Credencial</th>
                <th scope="col" className="px-4 py-3 font-bold">Préstamos y adeudos</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr><td colSpan="6" className="px-4 py-14 text-center text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin" /> Cargando prestatarios…</span></td></tr>
              ) : error ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setRecarga((actual) => actual + 1)} className="mt-2 text-sm font-semibold text-buap-navy underline">Reintentar</button></td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-14 text-center"><div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500"><UsersIcon size={21} /></div><p className="mt-3 font-semibold text-slate-700">No hay prestatarios para mostrar</p><p className="mt-1 text-sm text-slate-500">Prueba otros filtros o registra una persona.</p></td></tr>
              ) : usuarios.map((usuario) => {
                const credencial = estadoCredencial(usuario);
                return (
                  <tr key={usuario.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3.5"><p className="font-semibold text-slate-800">{usuario.nombre}</p><p className="mt-0.5 text-xs text-slate-500">Registro {fechaLegible(usuario.fecha_registro)}</p></td>
                    <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${usuario.perfil_prestatario === "externo" ? "bg-amber-50 text-amber-800" : usuario.perfil_prestatario === "pendiente_clasificacion" ? "bg-slate-100 text-slate-700" : "bg-[#00b5e2]/15 text-[#003b5c]"}`}>{perfilLegible(usuario.perfil_prestatario)}</span><p className="mt-1 text-xs text-slate-500">{GRUPO_POR_VALOR[perfilSeleccionado(usuario.perfil_prestatario)?.grupo]?.etiqueta || "Revisar perfil al editar"}</p></td>
                    <td className="px-4 py-3.5 text-slate-600">{usuario.matricula_o_num_trabajador || "—"}</td>
                    <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${credencial.clase}`}>{credencial.etiqueta}</span>{usuario.vigencia_credencial && <p className="mt-1 text-xs text-slate-500">Credencial hasta {fechaLegible(usuario.vigencia_credencial)}</p>}{usuario.perfil_prestatario !== "externo" && <p className="mt-1 text-xs text-slate-500">{usuario.fecha_actualizacion_registro ? `Registro verificado ${fechaLegible(usuario.fecha_actualizacion_registro)}` : "Sin actualización periódica registrada"}</p>}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-700">{usuario.prestamos_activos} activo{usuario.prestamos_activos === 1 ? "" : "s"}</p>
                      {Number(usuario.prestamos_vencidos) > 0 && <p className="mt-0.5 text-xs font-semibold text-red-700">{usuario.prestamos_vencidos} vencido{usuario.prestamos_vencidos === 1 ? "" : "s"}</p>}
                      {Number(usuario.adeudo_pendiente) > 0 && <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><CircleDollarSign size={13} /> Adeudo ${Number(usuario.adeudo_pendiente).toFixed(2)}</p>}
                    </td>
                    <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button type="button" onClick={() => abrirEditar(usuario)} aria-label={`Editar a ${usuario.nombre}`} className="rounded-lg p-2 text-slate-500 hover:bg-[#00b5e2]/15 hover:text-[#003b5c]"><Pencil size={17} /></button><button type="button" onClick={() => setModal({ tipo: "eliminar", usuario })} aria-label={`Eliminar a ${usuario.nombre}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={17} /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-500">Mostrando <span className="font-semibold text-slate-700">{rango.inicio}–{rango.fin}</span> de <span className="font-semibold text-slate-700">{total}</span> prestatarios</p>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" disabled={pagina === 0 || cargando} onClick={() => setPagina((actual) => Math.max(0, actual - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /> Anterior</button>
            <span className="min-w-20 text-center text-slate-500">Página {Math.min(pagina + 1, paginas)} de {paginas}</span>
            <button type="button" disabled={pagina + 1 >= paginas || cargando} onClick={() => setPagina((actual) => Math.min(paginas - 1, actual + 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {estadisticas?.credenciales_por_vencer > 0 && (
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-amber-800"><CalendarClock size={15} /> {estadisticas.credenciales_por_vencer} credencial{estadisticas.credenciales_por_vencer === 1 ? "" : "es"} vence{estadisticas.credenciales_por_vencer === 1 ? "" : "n"} en los próximos 30 días.</p>
      )}

      {modal?.tipo === "formulario" && (
        <Modal titulo={modal.usuario ? "Editar prestatario" : "Registrar prestatario"} onCerrar={() => !guardando && setModal(null)}>
          <form onSubmit={guardar} className="space-y-4 px-5 py-5 sm:px-6">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Nombre completo <span className="text-red-600">*</span></span>
              <input required maxLength={150} autoFocus value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className={claseSelect()} placeholder="Nombre y apellidos" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Perfil de prestatario <span className="text-red-600">*</span></span>
              <select required value={form.perfil_prestatario === "pendiente_clasificacion" ? "" : form.perfil_prestatario} onChange={(event) => cambiarPerfil(event.target.value)} className={claseSelect()}>
                <option value="" disabled>Selecciona el perfil específico</option>
                {PERFILES_POR_GRUPO.map((grupo) => (
                  <optgroup key={grupo.valor} label={grupo.etiqueta}>
                    {grupo.perfiles.map((perfil) => <option key={perfil.valor} value={perfil.valor}>{perfil.etiqueta}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>

            {form.perfil_prestatario === "pendiente_clasificacion" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                Este registro viene del formulario anterior. Selecciona el perfil BUAP correcto para guardar sus cambios y asignarle la regla correspondiente.
              </div>
            )}

            {form.perfil_prestatario === "externo" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                {perfilSeleccionado(form.perfil_prestatario)?.requisito} No registres matrícula ni vigencia de credencial BUAP.
              </div>
            ) : form.perfil_prestatario && form.perfil_prestatario !== "pendiente_clasificacion" ? (
              <>
                <div className="rounded-lg border border-[#00b5e2]/30 bg-[#00b5e2]/5 p-3.5 text-sm text-slate-700">
                  <p className="font-semibold text-[#003b5c]">{perfilSeleccionado(form.perfil_prestatario)?.requisito}</p>
                  <p className="mt-1">{GRUPO_POR_VALOR[perfilSeleccionado(form.perfil_prestatario)?.grupo]?.regla}</p>
                  <p className="mt-1 text-xs text-slate-500">El proyecto conserva los plazos 15/20/28 días del reglamento detallado anterior. La DGB publica actualmente 20 días y una renovación de 10 días para el préstamo general; confirma cuál aplica en tu biblioteca antes de tramitar préstamos.</p>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{perfilSeleccionado(form.perfil_prestatario)?.identificador} <span className="text-red-600">*</span></span>
                  <input required maxLength={30} value={form.matricula_o_num_trabajador} onChange={(event) => setForm({ ...form, matricula_o_num_trabajador: event.target.value })} className={claseSelect()} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Vigencia de credencial BUAP</span>
                  <input type="date" value={form.vigencia_credencial} onChange={(event) => setForm({ ...form, vigencia_credencial: event.target.value })} className={claseSelect()} />
                  <span className="mt-1 block text-xs leading-5 text-slate-500">Captura la fecha que indique la credencial. Si falta o venció, el registro queda pendiente y no debe autorizarse préstamo.</span>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Última actualización del registro bibliotecario</span>
                  <input type="date" value={form.fecha_actualizacion_registro} onChange={(event) => setForm({ ...form, fecha_actualizacion_registro: event.target.value })} className={claseSelect()} />
                  <span className="mt-1 block text-xs leading-5 text-slate-500">La DGB indica actualizar el registro en cada periodo escolar (el portal menciona enero y agosto). Captura esta fecha solo después de revisar los documentos del perfil.</span>
                </label>
              </>
            ) : null}

            {errorFormulario && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorFormulario}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={guardando} onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={guardando} className="inline-flex items-center gap-2 rounded-lg bg-buap-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-buap-navy-dark disabled:cursor-wait disabled:opacity-60">{guardando && <LoaderCircle size={16} className="animate-spin" />}{guardando ? "Guardando…" : modal.usuario ? "Guardar cambios" : "Registrar prestatario"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.tipo === "eliminar" && (
        <Modal titulo="Confirmar eliminación" onCerrar={() => !eliminando && setModal(null)} ancho="max-w-md">
          <div className="px-5 py-5 sm:px-6">
            <div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle size={20} /></div><p className="text-sm leading-6 text-slate-600">¿Seguro que deseas eliminar a <strong className="text-slate-800">{modal.usuario.nombre}</strong>? Si tiene préstamos registrados, el historial se conservará y la base de datos rechazará la eliminación.</p></div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={eliminando} onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button><button type="button" disabled={eliminando} onClick={confirmarEliminar} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">{eliminando && <LoaderCircle size={16} className="animate-spin" />}{eliminando ? "Eliminando…" : "Sí, eliminar"}</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
