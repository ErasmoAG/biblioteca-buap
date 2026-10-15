import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { api } from "../api.js";

const TAMANO_PAGINA = 10;

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

function moneda(valor) {
  return Number(valor || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

function claseCampo() {
  return "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-buap-cyan focus:ring-2 focus:ring-buap-cyan/20";
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
      <section role="dialog" aria-modal="true" aria-labelledby="modal-devolucion-titulo" className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 id="modal-devolucion-titulo" className="text-lg font-bold text-buap-navy">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar ventana" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function EtiquetaEstado({ estado }) {
  const clases = estado === "vencido"
    ? "bg-red-50 text-red-700"
    : estado === "devuelto"
      ? "bg-slate-100 text-slate-600"
      : "bg-emerald-50 text-emerald-800";
  const texto = estado === "vencido" ? "Vencido" : estado === "devuelto" ? "Devuelto" : "Vigente";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${clases}`}>{texto}</span>;
}

function Paginacion({ pagina, total, cargando, alCambiar }) {
  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const inicio = total === 0 ? 0 : pagina * TAMANO_PAGINA + 1;
  const fin = Math.min((pagina + 1) * TAMANO_PAGINA, total);

  return (
    <div className="flex flex-col gap-3 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-slate-500">Mostrando <span className="font-semibold text-slate-700">{inicio}–{fin}</span> de <span className="font-semibold text-slate-700">{total}</span></p>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button type="button" disabled={pagina === 0 || cargando} onClick={() => alCambiar(pagina - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /> Anterior</button>
        <span className="min-w-20 text-center text-slate-500">Página {Math.min(pagina + 1, paginas)} de {paginas}</span>
        <button type="button" disabled={pagina + 1 >= paginas || cargando} onClick={() => alCambiar(pagina + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Siguiente <ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export default function Devoluciones() {
  const [seccion, setSeccion] = useState("devoluciones");
  const [estadoPrestamo, setEstadoPrestamo] = useState("pendientes");
  const [estadoMulta, setEstadoMulta] = useState("pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [prestamos, setPrestamos] = useState([]);
  const [multas, setMultas] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState(null);
  const [multaSeleccionada, setMultaSeleccionada] = useState(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    let vigente = true;
    const parametros = new URLSearchParams({
      limit: String(TAMANO_PAGINA),
      offset: String(pagina * TAMANO_PAGINA),
    });
    if (busqueda.trim()) parametros.set("search", busqueda.trim());

    if (seccion === "devoluciones") {
      if (estadoPrestamo) parametros.set("estado", estadoPrestamo);
      setCargando(true);
      setError("");
      api(`/prestamos?${parametros.toString()}`)
        .then((datos) => {
          if (!vigente) return;
          setPrestamos(datos.prestamos || []);
          setTotal(Number(datos.total || 0));
        })
        .catch((err) => {
          if (vigente) setError(err.message);
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
    } else {
      if (estadoMulta) parametros.set("estado", estadoMulta);
      setCargando(true);
      setError("");
      api(`/prestamos/multas?${parametros.toString()}`)
        .then((datos) => {
          if (!vigente) return;
          setMultas(datos.multas || []);
          setTotal(Number(datos.total || 0));
        })
        .catch((err) => {
          if (vigente) setError(err.message);
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
    }

    return () => { vigente = false; };
  }, [seccion, estadoPrestamo, estadoMulta, busqueda, pagina, recarga]);

  function cambiarSeccion(nuevaSeccion) {
    setSeccion(nuevaSeccion);
    setPagina(0);
    setBusqueda("");
    setError("");
    setAviso(null);
  }

  async function confirmarDevolucion() {
    if (!prestamoSeleccionado) return;
    setProcesando(true);
    setError("");
    try {
      const resultado = await api(`/prestamos/${prestamoSeleccionado.id}/devolver`, { method: "POST" });
      const atraso = Number(resultado.prestamo?.dias_atraso || 0);
      setAviso({
        tipo: "exito",
        mensaje: atraso > 0
          ? `Devolución registrada con ${atraso} día(s) de atraso. Se generó una multa pendiente de ${moneda(resultado.multa?.monto)}.`
          : "Devolución registrada. El ejemplar quedó disponible y no generó multa.",
      });
      setPrestamoSeleccionado(null);
      setRecarga((actual) => actual + 1);
    } catch (err) {
      setAviso({ tipo: "error", mensaje: err.message });
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarPagoMulta() {
    if (!multaSeleccionada) return;
    setProcesando(true);
    try {
      const resultado = await api(`/prestamos/multas/${multaSeleccionada.id}/pagar`, { method: "POST" });
      setAviso({
        tipo: "exito",
        mensaje: resultado.ya_estaba_pagada
          ? "Esta multa ya estaba marcada como pagada."
          : `Pago de ${moneda(resultado.multa?.monto)} registrado.`,
      });
      setMultaSeleccionada(null);
      setRecarga((actual) => actual + 1);
    } catch (err) {
      setAviso({ tipo: "error", mensaje: err.message });
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-buap-navy"><RotateCcw size={17} /> Operación bibliotecaria</div>
          <h1 className="mt-1 text-2xl font-extrabold text-buap-navy">Devoluciones y multas</h1>
          <p className="mt-1 text-sm text-slate-500">Recibe materiales, calcula atrasos y lleva el control de adeudos.</p>
        </div>
        <div className="rounded-lg border border-buap-cyan/30 bg-buap-cyan-light px-3.5 py-2.5 text-sm text-buap-navy">
          <span className="font-semibold">Tarifa del proyecto:</span> $1.30 MXN por día natural y ejemplar
        </div>
      </div>

      {aviso && (
        <div role={aviso.tipo === "error" ? "alert" : "status"} className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${aviso.tipo === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          <p>{aviso.mensaje}</p>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar notificación"><X size={17} /></button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200">
        <button type="button" onClick={() => cambiarSeccion("devoluciones")} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${seccion === "devoluciones" ? "border-buap-cyan text-buap-navy" : "border-transparent text-slate-500 hover:text-slate-800"}`}><RotateCcw size={16} /> Devoluciones</button>
        <button type="button" onClick={() => cambiarSeccion("multas")} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${seccion === "multas" ? "border-buap-cyan text-buap-navy" : "border-transparent text-slate-500 hover:text-slate-800"}`}><CircleDollarSign size={16} /> Multas</button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{seccion === "devoluciones" ? "Préstamos" : "Registro de multas"}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {seccion === "devoluciones"
                ? "Busca por prestatario, matrícula, título o signatura."
                : "Consulta adeudos y registra el pago recibido en biblioteca."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Búsqueda</span>
              <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(0); }} className={`${claseCampo()} pl-9`} placeholder="Nombre, matrícula o material" /></div>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Estado</span>
              {seccion === "devoluciones" ? (
                <select value={estadoPrestamo} onChange={(event) => { setEstadoPrestamo(event.target.value); setPagina(0); }} className={claseCampo()}>
                  <option value="pendientes">Pendientes de devolución</option>
                  <option value="activos">Vigentes</option>
                  <option value="vencidos">Vencidos</option>
                  <option value="devueltos">Historial devuelto</option>
                </select>
              ) : (
                <select value={estadoMulta} onChange={(event) => { setEstadoMulta(event.target.value); setPagina(0); }} className={claseCampo()}>
                  <option value="pendientes">Pendientes de pago</option>
                  <option value="pagadas">Pagadas</option>
                  <option value="">Todas</option>
                </select>
              )}
            </label>
          </div>
        </div>

        {seccion === "devoluciones" ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Prestatario</th>
                  <th className="px-4 py-3 font-bold">Material</th>
                  <th className="px-4 py-3 font-bold">Préstamo</th>
                  <th className="px-4 py-3 font-bold">Vencimiento / atraso</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 text-right font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargando ? (
                  <tr><td colSpan="6" className="px-4 py-14 text-center text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin" /> Cargando préstamos…</span></td></tr>
                ) : error ? (
                  <tr><td colSpan="6" className="px-4 py-12 text-center"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setRecarga((actual) => actual + 1)} className="mt-2 text-sm font-semibold text-buap-navy underline">Reintentar</button></td></tr>
                ) : prestamos.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-14 text-center"><div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500"><BookOpen size={21} /></div><p className="mt-3 font-semibold text-slate-700">No hay préstamos para mostrar</p><p className="mt-1 text-sm text-slate-500">Prueba otra búsqueda o cambia el filtro de estado.</p></td></tr>
                ) : prestamos.map((prestamo) => {
                  const esEquipo = ["ipad", "equipo_computo"].includes(prestamo.material_tipo);
                  const detalle = esEquipo
                    ? [prestamo.material_marca, prestamo.material_modelo].filter(Boolean).join(" ")
                    : prestamo.material_autor;
                  const puedeDevolver = !prestamo.fecha_devolucion && prestamo.estado !== "devuelto";
                  return (
                    <tr key={prestamo.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-3.5"><p className="font-semibold text-slate-800">{prestamo.usuario_nombre}</p><p className="mt-0.5 text-xs text-slate-500">{prestamo.matricula_o_num_trabajador || "Sin identificador"}</p></td>
                      <td className="px-4 py-3.5"><p className="font-semibold text-slate-800">{prestamo.material_titulo}</p><p className="mt-0.5 text-xs text-slate-500">{ETIQUETAS_TIPO[prestamo.material_tipo] || prestamo.material_tipo}{detalle ? ` · ${detalle}` : ""}</p></td>
                      <td className="px-4 py-3.5 text-slate-600">{fechaLegible(prestamo.fecha_prestamo)}{prestamo.fecha_devolucion && <p className="mt-0.5 text-xs text-slate-500">Recibido {fechaLegible(prestamo.fecha_devolucion)}</p>}</td>
                      <td className="px-4 py-3.5"><span className={prestamo.estado === "vencido" ? "font-semibold text-red-700" : "text-slate-600"}>{fechaLegible(prestamo.fecha_vencimiento)}</span>{prestamo.estado === "vencido" && <p className="mt-1 text-xs text-red-700">{prestamo.dias_atraso} día(s) · multa estimada {moneda(prestamo.multa_estimada)}</p>}</td>
                      <td className="px-4 py-3.5"><EtiquetaEstado estado={prestamo.estado} />{prestamo.estado === "devuelto" && !prestamo.fecha_devolucion && <p className="mt-1 text-xs text-slate-500">Fecha no registrada (histórico)</p>}</td>
                      <td className="px-4 py-3.5 text-right">{puedeDevolver ? <button type="button" onClick={() => setPrestamoSeleccionado(prestamo)} className="inline-flex items-center gap-1.5 rounded-lg bg-buap-navy px-3 py-2 text-xs font-bold text-white hover:bg-buap-navy-dark"><RotateCcw size={14} /> Recibir</button> : <span className="text-xs text-slate-400">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Prestatario</th>
                  <th className="px-4 py-3 font-bold">Material</th>
                  <th className="px-4 py-3 font-bold">Devolución</th>
                  <th className="px-4 py-3 font-bold">Atraso</th>
                  <th className="px-4 py-3 font-bold">Monto / estado</th>
                  <th className="px-4 py-3 text-right font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargando ? (
                  <tr><td colSpan="6" className="px-4 py-14 text-center text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin" /> Cargando multas…</span></td></tr>
                ) : error ? (
                  <tr><td colSpan="6" className="px-4 py-12 text-center"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setRecarga((actual) => actual + 1)} className="mt-2 text-sm font-semibold text-buap-navy underline">Reintentar</button></td></tr>
                ) : multas.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-14 text-center"><div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500"><ReceiptText size={21} /></div><p className="mt-3 font-semibold text-slate-700">No hay multas para mostrar</p><p className="mt-1 text-sm text-slate-500">No se encontraron registros con este filtro.</p></td></tr>
                ) : multas.map((multa) => (
                  <tr key={multa.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3.5"><p className="font-semibold text-slate-800">{multa.usuario_nombre}</p><p className="mt-0.5 text-xs text-slate-500">{multa.matricula_o_num_trabajador || "Sin identificador"}</p></td>
                    <td className="px-4 py-3.5"><p className="font-semibold text-slate-800">{multa.material_titulo}</p><p className="mt-0.5 text-xs text-slate-500">{ETIQUETAS_TIPO[multa.material_tipo] || multa.material_tipo} · Préstamo #{multa.id_prestamo}</p></td>
                    <td className="px-4 py-3.5 text-slate-600">{fechaLegible(multa.fecha_devolucion)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{multa.dias_atraso} día(s)</td>
                    <td className="px-4 py-3.5"><p className="font-bold text-slate-800">{moneda(multa.monto)}</p><span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${multa.pagada ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{multa.pagada ? "Pagada" : "Pendiente"}</span></td>
                    <td className="px-4 py-3.5 text-right">{!multa.pagada ? <button type="button" onClick={() => setMultaSeleccionada(multa)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-buap-navy hover:border-buap-cyan hover:bg-buap-cyan-light"><Check size={14} /> Marcar pagada</button> : <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><BadgeCheck size={15} /> Registrado</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Paginacion pagina={pagina} total={total} cargando={cargando} alCambiar={setPagina} />
      </section>

      {prestamoSeleccionado && (
        <Modal titulo="Confirmar devolución" onCerrar={() => !procesando && setPrestamoSeleccionado(null)}>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{prestamoSeleccionado.material_titulo}</p>
              <p className="mt-1">Prestatario: {prestamoSeleccionado.usuario_nombre}</p>
              <p>Vencimiento: {fechaLegible(prestamoSeleccionado.fecha_vencimiento)}</p>
            </div>
            {Number(prestamoSeleccionado.dias_atraso) > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} /> Devolución con atraso</p>
                <p className="mt-1.5">Se registrarán {prestamoSeleccionado.dias_atraso} días de atraso y una multa de <strong>{moneda(prestamoSeleccionado.multa_estimada)}</strong>, pendiente de pago.</p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800"><Check size={17} className="mt-0.5 shrink-0" /><p>La devolución está dentro del plazo. No se generará multa.</p></div>
            )}
            <p className="text-sm text-slate-500">La fecha se tomará del servidor y el ejemplar se agregará nuevamente a la disponibilidad.</p>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={procesando} onClick={() => setPrestamoSeleccionado(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button type="button" disabled={procesando} onClick={confirmarDevolucion} className="inline-flex items-center gap-2 rounded-lg bg-buap-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-buap-navy-dark disabled:cursor-not-allowed disabled:opacity-50">{procesando ? <LoaderCircle size={16} className="animate-spin" /> : <RotateCcw size={16} />}{procesando ? "Registrando…" : "Confirmar recepción"}</button>
            </div>
          </div>
        </Modal>
      )}

      {multaSeleccionada && (
        <Modal titulo="Confirmar pago recibido" onCerrar={() => !procesando && setMultaSeleccionada(null)}>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              <CircleDollarSign size={20} className="mt-0.5 shrink-0" />
              <div><p className="font-semibold">{multaSeleccionada.usuario_nombre}</p><p className="mt-1">{multaSeleccionada.material_titulo} · {multaSeleccionada.dias_atraso} día(s) de atraso</p><p className="mt-2 text-base font-extrabold">{moneda(multaSeleccionada.monto)}</p></div>
            </div>
            <p className="text-sm text-slate-600">Esta acción solo registra que el bibliotecario recibió el pago; no procesa una transacción bancaria.</p>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={procesando} onClick={() => setMultaSeleccionada(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button type="button" disabled={procesando} onClick={confirmarPagoMulta} className="inline-flex items-center gap-2 rounded-lg bg-buap-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-buap-navy-dark disabled:cursor-not-allowed disabled:opacity-50">{procesando ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{procesando ? "Guardando…" : "Confirmar pago recibido"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
