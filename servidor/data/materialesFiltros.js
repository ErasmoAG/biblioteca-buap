// Constructor puro de filtros SQL del catálogo; no abre conexiones.
export function construirFiltrosMateriales({ busqueda, tipo, categoria, disponibilidad, soloConsulta }) {
  const filtros = [];
  const valores = [];

  if (busqueda) {
    valores.push(`%${busqueda}%`);
    filtros.push(`(titulo ILIKE $${valores.length} OR autor ILIKE $${valores.length}
      OR signatura ILIKE $${valores.length} OR marca ILIKE $${valores.length}
      OR modelo ILIKE $${valores.length} OR numero_serie ILIKE $${valores.length})`);
  }
  if (tipo) {
    valores.push(tipo);
    filtros.push(`tipo = $${valores.length}`);
  }
  if (categoria) {
    valores.push(categoria);
    filtros.push(`categoria = $${valores.length}`);
  }
  if (disponibilidad === "disponibles") {
    filtros.push("ejemplares_disponibles > 0");
  } else if (disponibilidad === "agotados") {
    filtros.push("ejemplares_disponibles = 0");
  }
  if (typeof soloConsulta === "boolean") {
    valores.push(soloConsulta);
    filtros.push(`solo_consulta = $${valores.length}`);
  }

  return {
    where: filtros.length ? `WHERE ${filtros.join(" AND ")}` : "",
    valores,
  };
}
