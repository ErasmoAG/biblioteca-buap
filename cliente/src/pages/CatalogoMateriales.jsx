import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../api.js";

// Una sola configuración controla las opciones, campos visibles y reglas de cada tipo.
const CONFIG_TIPOS = {
  libro: {
    etiqueta: "Libros",
    soloConsulta: "editable",
    campos: [
      { nombre: "titulo", etiqueta: "Título", obligatorio: true, max: 200 },
      { nombre: "autor", etiqueta: "Autor", obligatorio: true, max: 150 },
      { nombre: "categoria", etiqueta: "Categoría", obligatorio: true, max: 100 },
      { nombre: "signatura", etiqueta: "Signatura", obligatorio: true, max: 60 },
      { nombre: "ejemplares_totales", etiqueta: "Ejemplares totales", obligatorio: true, tipo: "number", min: 1 },
      { nombre: "editorial", etiqueta: "Editorial", max: 120 },
      { nombre: "anio", etiqueta: "Año", tipo: "number", min: 1400, max: 2100 },
      { nombre: "isbn_issn", etiqueta: "ISBN / ISSN", max: 20 },
    ],
  },
  tesis: {
    etiqueta: "Tesis",
    soloConsulta: "forzada",
    campos: [
      { nombre: "titulo", etiqueta: "Título", obligatorio: true, max: 200 },
      { nombre: "autor", etiqueta: "Autor", obligatorio: true, max: 150 },
      { nombre: "categoria", etiqueta: "Categoría", obligatorio: true, max: 100 },
      { nombre: "signatura", etiqueta: "Signatura", obligatorio: true, max: 60 },
      { nombre: "anio", etiqueta: "Año", obligatorio: true, tipo: "number", min: 1400, max: 2100 },
      { nombre: "grado_academico", etiqueta: "Grado académico", obligatorio: true, tipo: "select", opciones: [{ valor: "licenciatura", etiqueta: "Licenciatura" }, { valor: "maestria", etiqueta: "Maestría" }, { valor: "doctorado", etiqueta: "Doctorado" }] },
      { nombre: "ejemplares_totales", etiqueta: "Ejemplares totales", obligatorio: true, tipo: "number", min: 1 },
    ],
  },
  revista: {
    etiqueta: "Revistas",
    soloConsulta: "forzada",
    campos: [
      { nombre: "titulo", etiqueta: "Título", obligatorio: true, max: 200 },
      { nombre: "categoria", etiqueta: "Categoría", obligatorio: true, max: 100 },
      { nombre: "ejemplares_totales", etiqueta: "Ejemplares totales", obligatorio: true, tipo: "number", min: 1 },
      { nombre: "autor", etiqueta: "Autor", max: 150 },
      { nombre: "signatura", etiqueta: "Signatura", max: 60 },
      { nombre: "editorial", etiqueta: "Editorial", max: 120 },
      { nombre: "anio", etiqueta: "Año", tipo: "number", min: 1400, max: 2100 },
      { nombre: "isbn_issn", etiqueta: "ISBN / ISSN", max: 20 },
    ],
  },
  material_especial: {
    etiqueta: "Material Especial",
    soloConsulta: "forzada",
    campos: [
      { nombre: "titulo", etiqueta: "Título", obligatorio: true, max: 200 },
      { nombre: "ejemplares_totales", etiqueta: "Ejemplares totales", obligatorio: true, tipo: "number", min: 1 },
      { nombre: "autor", etiqueta: "Autor", max: 150 },
      { nombre: "categoria", etiqueta: "Categoría", max: 100 },
      { nombre: "signatura", etiqueta: "Signatura", max: 60 },
      { nombre: "anio", etiqueta: "Año", tipo: "number", min: 1400, max: 2100 },
    ],
  },
  cd: {
    etiqueta: "CD",
    soloConsulta: "editable",
    campos: [
      { nombre: "titulo", etiqueta: "Título", obligatorio: true, max: 200 },
      { nombre: "ejemplares_totales", etiqueta: "Ejemplares totales", obligatorio: true, tipo: "number", min: 1 },
      { nombre: "autor", etiqueta: "Autor", max: 150 },
      { nombre: "categoria", etiqueta: "Categoría", max: 100 },
      { nombre: "signatura", etiqueta: "Signatura", max: 60 },
      { nombre: "anio", etiqueta: "Año", tipo: "number", min: 1400, max: 2100 },
    ],
  },
  dvd: {
    etiqueta: "DVD",
    soloConsulta: "editable",
    campos: [
      { nombre: "titulo", etiqueta: "Título", obligatorio: true, max: 200 },
      { nombre: "ejemplares_totales", etiqueta: "Ejemplares totales", obligatorio: true, tipo: "number", min: 1 },
      { nombre: "autor", etiqueta: "Autor", max: 150 },
      { nombre: "categoria", etiqueta: "Categoría", max: 100 },
      { nombre: "signatura", etiqueta: "Signatura", max: 60 },
      { nombre: "anio", etiqueta: "Año", tipo: "number", min: 1400, max: 2100 },
    ],
  },
  ipad: {
    etiqueta: "iPads",
    soloConsulta: "editable",
    ejemplaresFijos: true,
    campos: [
      { nombre: "titulo", etiqueta: "Nombre del equipo", obligatorio: true, max: 200 },
      { nombre: "marca", etiqueta: "Marca", obligatorio: true, max: 60 },
      { nombre: "modelo", etiqueta: "Modelo", obligatorio: true, max: 60 },
      { nombre: "numero_serie", etiqueta: "Número de serie", obligatorio: true, max: 80 },
      { nombre: "categoria", etiqueta: "Tipo de equipo", max: 100 },
      { nombre: "dias_prestamo", etiqueta: "Días de préstamo", tipo: "number", min: 1 },
    ],
  },
  equipo_computo: {
    etiqueta: "Equipo de Cómputo",
    soloConsulta: "editable",
    ejemplaresFijos: true,
    campos: [
      { nombre: "titulo", etiqueta: "Nombre del equipo", obligatorio: true, max: 200 },
      { nombre: "marca", etiqueta: "Marca", obligatorio: true, max: 60 },
      { nombre: "modelo", etiqueta: "Modelo", obligatorio: true, max: 60 },
      { nombre: "numero_serie", etiqueta: "Número de serie", obligatorio: true, max: 80 },
      { nombre: "categoria", etiqueta: "Tipo de equipo", max: 100 },
      { nombre: "dias_prestamo", etiqueta: "Días de préstamo", tipo: "number", min: 1 },
    ],
  },
};
const TIPOS = Object.entries(CONFIG_TIPOS).map(([valor, config]) => ({ valor, etiqueta: config.etiqueta }));
const TAMANO_PAGINA = 10;
const FORM_VACIO = {
  tipo: "libro",
  titulo: "",
  autor: "",
  categoria: "",
  signatura: "",
  editorial: "",
  anio: "",
  isbn_issn: "",
  grado_academico: "",
  marca: "",
  modelo: "",
  numero_serie: "",
  dias_prestamo: "",
  ejemplares_totales: "1",
  ejemplares_disponibles: "1",
  solo_consulta: false,
};

function campoSelectClass() {
  return "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-buap-cyan focus:ring-2 focus:ring-buap-cyan/20";
}

function detalleMaterial(material) {
  if (material.tipo === "ipad" || material.tipo === "equipo_computo") {
    return [material.marca, material.modelo].filter(Boolean).join(" ") || "Equipo";
  }
  return [material.autor, material.signatura ? `Signatura: ${material.signatura}` : null]
    .filter(Boolean)
    .join(" · ") || "Sin datos adicionales";
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
      <section role="dialog" aria-modal="true" aria-labelledby="modal-titulo" className={`my-auto w-full ${ancho} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 id="modal-titulo" className="text-lg font-bold text-buap-navy">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar ventana" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function CatalogoMateriales() {
  const [materiales, setMateriales] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaEstable, setBusquedaEstable] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState("");
  const [filtroSoloConsulta, setFiltroSoloConsulta] = useState("");
  const [pagina, setPagina] = useState(0);
  const [recarga, setRecarga] = useState(0);
  const [total, setTotal] = useState(0);
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
    api("/materiales/categorias")
      .then((data) => {
        if (vigente) setCategorias(data.categorias || []);
      })
      .catch(() => {
        // El catálogo sigue siendo utilizable si no se pudo cargar la lista auxiliar.
      });
    return () => { vigente = false; };
  }, [recarga]);

  useEffect(() => {
    let vigente = true;
    const params = new URLSearchParams({ limit: String(TAMANO_PAGINA), offset: String(pagina * TAMANO_PAGINA) });
    if (busquedaEstable) params.set("search", busquedaEstable);
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroCategoria) params.set("categoria", filtroCategoria);
    if (filtroDisponibilidad) params.set("disponibilidad", filtroDisponibilidad);
    if (filtroSoloConsulta) params.set("solo_consulta", filtroSoloConsulta);

    setCargando(true);
    setError("");
    api(`/materiales?${params.toString()}`)
      .then((data) => {
        if (!vigente) return;
        setMateriales(data.materiales || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        if (vigente) setError(err.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, [busquedaEstable, filtroTipo, filtroCategoria, filtroDisponibilidad, filtroSoloConsulta, pagina, recarga]);

  useEffect(() => {
    if (!aviso) return undefined;
    const timeout = window.setTimeout(() => setAviso(null), 4000);
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
    setFiltroTipo("");
    setFiltroCategoria("");
    setFiltroDisponibilidad("");
    setFiltroSoloConsulta("");
    setPagina(0);
  }

  function abrirCrear() {
    setForm(FORM_VACIO);
    setErrorFormulario("");
    setModal({ tipo: "formulario", material: null });
  }

  function cambiarTipo(nuevoTipo) {
    const nuevaConfig = CONFIG_TIPOS[nuevoTipo];
    setForm((actual) => {
      const configuracionAnterior = CONFIG_TIPOS[actual.tipo];
      const camposAnteriores = new Set(configuracionAnterior.campos.map((campo) => campo.nombre));
      const nuevoFormulario = { ...FORM_VACIO, tipo: nuevoTipo };
      for (const campo of nuevaConfig.campos) {
        if (camposAnteriores.has(campo.nombre)) {
          nuevoFormulario[campo.nombre] = actual[campo.nombre];
        }
      }
      if (nuevaConfig.ejemplaresFijos) {
        nuevoFormulario.ejemplares_totales = "1";
        nuevoFormulario.ejemplares_disponibles = "1";
      }
      nuevoFormulario.solo_consulta = nuevaConfig.soloConsulta === "forzada";
      return nuevoFormulario;
    });
    setErrorFormulario("");
  }

  function abrirEditar(material) {
    setForm({
      tipo: material.tipo,
      titulo: material.titulo,
      autor: material.autor || "",
      categoria: material.categoria || "",
      signatura: material.signatura || "",
      editorial: material.editorial || "",
      anio: material.anio == null ? "" : String(material.anio),
      isbn_issn: material.isbn_issn || "",
      grado_academico: material.grado_academico || "",
      marca: material.marca || "",
      modelo: material.modelo || "",
      numero_serie: material.numero_serie || "",
      dias_prestamo: material.dias_prestamo == null ? "" : String(material.dias_prestamo),
      ejemplares_totales: String(material.ejemplares_totales),
      ejemplares_disponibles: String(material.ejemplares_disponibles),
      solo_consulta: material.solo_consulta,
    });
    setErrorFormulario("");
    setModal({ tipo: "formulario", material });
  }

  async function guardar(event) {
    event.preventDefault();
    setErrorFormulario("");
    const config = CONFIG_TIPOS[form.tipo];
    const totalEjemplares = config.ejemplaresFijos ? 1 : Number(form.ejemplares_totales);
    if (!Number.isInteger(totalEjemplares) || totalEjemplares < 1) {
      setErrorFormulario("Los ejemplares totales deben ser un entero mayor que cero.");
      return;
    }

    setGuardando(true);
    try {
      const material = {
        ...form,
        titulo: form.titulo.trim(),
        autor: form.autor.trim() || null,
        categoria: form.categoria.trim() || null,
        signatura: form.signatura.trim() || null,
        editorial: form.editorial.trim() || null,
        isbn_issn: form.isbn_issn.trim() || null,
        grado_academico: form.grado_academico || null,
        marca: form.marca.trim() || null,
        modelo: form.modelo.trim() || null,
        numero_serie: form.numero_serie.trim() || null,
        anio: form.anio === "" ? null : Number(form.anio),
        dias_prestamo: form.dias_prestamo === "" ? null : Number(form.dias_prestamo),
        ejemplares_totales: totalEjemplares,
        ejemplares_disponibles: config.ejemplaresFijos ? 1 : totalEjemplares,
        solo_consulta: config.soloConsulta === "forzada" || form.solo_consulta,
      };
      const editando = Boolean(modal.material);
      await api(editando ? `/materiales/${modal.material.id}` : "/materiales", {
        method: editando ? "PUT" : "POST",
        body: material,
      });
      setModal(null);
      setAviso({ tipo: "exito", mensaje: editando ? "Material actualizado correctamente." : "Material agregado al catálogo." });
      setPagina(0);
      setRecarga((actual) => actual + 1);
    } catch (err) {
      setErrorFormulario(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!modal?.material) return;
    setEliminando(true);
    try {
      await api(`/materiales/${modal.material.id}`, { method: "DELETE" });
      setModal(null);
      setAviso({ tipo: "exito", mensaje: "Material eliminado del catálogo." });
      if (pagina > 0 && materiales.length === 1) setPagina(pagina - 1);
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
          <p className="text-sm font-semibold text-buap-cyan">COLECCIÓN BIBLIOTECARIA</p>
          <h1 className="mt-1 text-2xl font-extrabold text-buap-navy sm:text-3xl">Catálogo de materiales</h1>
          <p className="mt-1 text-sm text-slate-500">Busca, organiza y administra los recursos de la biblioteca.</p>
        </div>
        <button type="button" onClick={abrirCrear} className="inline-flex items-center justify-center gap-2 rounded-lg bg-buap-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-buap-navy-dark">
          <Plus size={18} /> Agregar material
        </button>
      </div>

      {aviso && (
        <div role="status" className={`fixed right-5 top-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${aviso.tipo === "error" ? "border-red-200 bg-white text-red-700" : "border-emerald-200 bg-white text-emerald-800"}`}>
          {aviso.tipo === "error" ? <AlertTriangle size={19} className="mt-0.5 shrink-0" /> : <Check size={19} className="mt-0.5 shrink-0" />}
          <span className="text-sm font-medium">{aviso.mensaje}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="ml-2 text-slate-400 hover:text-slate-700"><X size={17} /></button>
        </div>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Buscar</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-buap-cyan focus-within:ring-2 focus-within:ring-buap-cyan/20">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(0); }} placeholder="Título, autor, signatura o equipo" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400" />
              {busqueda && <button type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda" className="text-slate-400 hover:text-slate-700"><X size={16} /></button>}
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tipo de material</span>
            <select value={filtroTipo} onChange={(event) => { setFiltroTipo(event.target.value); setPagina(0); }} className={campoSelectClass()}>
              <option value="">Todos los tipos</option>
              {TIPOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Categoría</span>
            <select value={filtroCategoria} onChange={(event) => { setFiltroCategoria(event.target.value); setPagina(0); }} className={campoSelectClass()}>
              <option value="">Todas las categorías</option>
              {categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Existencias</span>
            <select value={filtroDisponibilidad} onChange={(event) => { setFiltroDisponibilidad(event.target.value); setPagina(0); }} className={campoSelectClass()}>
              <option value="">Cualquier existencia</option>
              <option value="disponibles">Con ejemplares disponibles</option>
              <option value="agotados">Agotados</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Modalidad</span>
            <select value={filtroSoloConsulta} onChange={(event) => { setFiltroSoloConsulta(event.target.value); setPagina(0); }} className={campoSelectClass()}>
              <option value="">Préstamo o consulta</option>
              <option value="false">Préstamo a domicilio</option>
              <option value="true">Solo consulta en sala</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Los filtros se combinan para acotar los resultados.</span>
          {(busqueda || filtroTipo || filtroCategoria || filtroDisponibilidad || filtroSoloConsulta) && (
            <button type="button" onClick={limpiarFiltros} className="font-semibold text-buap-navy underline underline-offset-2 hover:text-buap-cyan">Limpiar filtros</button>
          )}
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">Material</th>
                <th scope="col" className="px-4 py-3 font-bold">Tipo</th>
                <th scope="col" className="px-4 py-3 font-bold">Categoría</th>
                <th scope="col" className="px-4 py-3 text-center font-bold">Ejemplares</th>
                <th scope="col" className="px-4 py-3 font-bold">Préstamo</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr><td colSpan="6" className="px-4 py-14 text-center text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin" /> Cargando catálogo…</span></td></tr>
              ) : error ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setRecarga((actual) => actual + 1)} className="mt-2 text-sm font-semibold text-buap-navy underline">Reintentar</button></td></tr>
              ) : materiales.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-14 text-center"><div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500"><BookOpen size={21} /></div><p className="mt-3 font-semibold text-slate-700">No hay materiales para mostrar</p><p className="mt-1 text-sm text-slate-500">Prueba con otros filtros o agrega un material nuevo.</p></td></tr>
              ) : materiales.map((material) => (
                <tr key={material.id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3.5"><p className="font-semibold text-slate-800">{material.titulo}</p><p className="mt-0.5 text-xs text-slate-500">{detalleMaterial(material)}</p></td>
                  <td className="px-4 py-3.5"><span className="rounded-full bg-buap-cyan-light px-2.5 py-1 text-xs font-semibold text-buap-navy">{TIPOS.find((tipo) => tipo.valor === material.tipo)?.etiqueta || material.tipo}</span></td>
                  <td className="px-4 py-3.5 text-slate-600">{material.categoria || "—"}</td>
                  <td className="px-4 py-3.5 text-center"><span className="font-semibold text-slate-700">{material.ejemplares_disponibles}</span><span className="text-slate-400"> / {material.ejemplares_totales}</span></td>
                  <td className="px-4 py-3.5"><span className={material.solo_consulta ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800" : "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"}>{material.solo_consulta ? "Solo consulta" : "Préstamo permitido"}</span>{material.dias_prestamo != null && <p className="mt-1 text-xs text-slate-500">{material.dias_prestamo} días de préstamo</p>}</td>
                  <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button type="button" onClick={() => abrirEditar(material)} aria-label={`Editar ${material.titulo}`} className="rounded-lg p-2 text-slate-500 hover:bg-buap-cyan-light hover:text-buap-navy"><Pencil size={17} /></button><button type="button" onClick={() => setModal({ tipo: "eliminar", material })} aria-label={`Eliminar ${material.titulo}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={17} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-500">Mostrando <span className="font-semibold text-slate-700">{rango.inicio}–{rango.fin}</span> de <span className="font-semibold text-slate-700">{total}</span> materiales</p>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" disabled={pagina === 0 || cargando} onClick={() => setPagina((actual) => Math.max(0, actual - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /> Anterior</button>
            <span className="min-w-20 text-center text-slate-500">Página {Math.min(pagina + 1, paginas)} de {paginas}</span>
            <button type="button" disabled={pagina + 1 >= paginas || cargando} onClick={() => setPagina((actual) => Math.min(paginas - 1, actual + 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Siguiente <ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {modal?.tipo === "formulario" && (
        <Modal titulo={modal.material ? "Editar material" : "Agregar material"} onCerrar={() => !guardando && setModal(null)}>
          <form onSubmit={guardar} className="space-y-4 px-5 py-5 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Tipo de material <span className="text-red-600">*</span></span>
                <select required value={form.tipo} onChange={(event) => cambiarTipo(event.target.value)} className={campoSelectClass()}>
                  {TIPOS.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}
                </select>
              </label>
              {CONFIG_TIPOS[form.tipo].campos.map((campo) => {
                const anchoCompleto = ["titulo", "numero_serie"].includes(campo.nombre);
                const className = `block ${anchoCompleto ? "sm:col-span-2" : ""}`;
                return (
                  <label key={campo.nombre} className={className}>
                    <span className="text-sm font-semibold text-slate-700">
                      {campo.etiqueta} {campo.obligatorio && <span className="text-red-600">*</span>}
                    </span>
                    {campo.tipo === "select" ? (
                      <select
                        required={campo.obligatorio}
                        value={form[campo.nombre]}
                        onChange={(event) => setForm({ ...form, [campo.nombre]: event.target.value })}
                        className={campoSelectClass()}
                      >
                        <option value="">Selecciona un grado</option>
                        {campo.opciones.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
                      </select>
                    ) : (
                      <input
                        required={campo.obligatorio}
                        type={campo.tipo || "text"}
                        min={campo.min}
                        max={campo.max}
                        maxLength={campo.tipo === "number" ? undefined : campo.max}
                        step={campo.tipo === "number" ? "1" : undefined}
                        list={campo.nombre === "categoria" ? "lista-categorias" : undefined}
                        value={form[campo.nombre]}
                        onChange={(event) => setForm({ ...form, [campo.nombre]: event.target.value })}
                        className={campoSelectClass()}
                        placeholder={campo.nombre === "categoria" ? "Ej. Literatura" : undefined}
                      />
                    )}
                    {campo.nombre === "categoria" && <datalist id="lista-categorias">{categorias.map((categoria) => <option key={categoria} value={categoria} />)}</datalist>}
                  </label>
                );
              })}
              {CONFIG_TIPOS[form.tipo].ejemplaresFijos && (
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Ejemplares totales</span><input disabled value="1" className={`${campoSelectClass()} cursor-not-allowed bg-slate-100 text-slate-500`} /></label>
                  <label className="block"><span className="text-sm font-semibold text-slate-700">Disponibles</span><input disabled value="1" className={`${campoSelectClass()} cursor-not-allowed bg-slate-100 text-slate-500`} /></label>
                </div>
              )}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3.5">
              <input type="checkbox" checked={CONFIG_TIPOS[form.tipo].soloConsulta === "forzada" || form.solo_consulta} disabled={CONFIG_TIPOS[form.tipo].soloConsulta === "forzada"} onChange={(event) => setForm({ ...form, solo_consulta: event.target.checked })} className="mt-0.5 size-4 accent-[#003b5c] disabled:cursor-not-allowed" />
              <span><span className="block text-sm font-semibold text-slate-700">Solo consulta en sala</span><span className="mt-0.5 block text-xs text-slate-500">{CONFIG_TIPOS[form.tipo].soloConsulta === "forzada" ? "Este tipo de material debe permanecer en sala por reglamento." : "Actívalo si este material no puede salir de la sala."}</span></span>
            </label>
            {errorFormulario && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorFormulario}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={guardando} onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={guardando} className="inline-flex items-center gap-2 rounded-lg bg-buap-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-buap-navy-dark disabled:cursor-wait disabled:opacity-60">{guardando && <LoaderCircle size={16} className="animate-spin" />}{guardando ? "Guardando…" : modal.material ? "Guardar cambios" : "Agregar material"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.tipo === "eliminar" && (
        <Modal titulo="Confirmar eliminación" onCerrar={() => !eliminando && setModal(null)} ancho="max-w-md">
          <div className="px-5 py-5 sm:px-6">
            <div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle size={20} /></div><p className="text-sm leading-6 text-slate-600">¿Seguro que deseas eliminar <strong className="text-slate-800">{modal.material.titulo}</strong>? Esta acción no se puede deshacer.</p></div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={eliminando} onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button><button type="button" disabled={eliminando} onClick={confirmarEliminar} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">{eliminando && <LoaderCircle size={16} className="animate-spin" />}{eliminando ? "Eliminando…" : "Sí, eliminar"}</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
