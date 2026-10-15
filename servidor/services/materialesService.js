import {
  actualizarMaterial,
  buscarMaterialPorId,
  crearMaterial,
  eliminarMaterial,
  listarCategorias,
  listarMateriales,
} from "../data/materialesData.js";

// Los valores son los que acepta el CHECK de Supabase; las etiquetas están en el cliente.
export const TIPOS_MATERIAL = [
  "libro",
  "tesis",
  "revista",
  "material_especial",
  "cd",
  "dvd",
  "ipad",
  "equipo_computo",
];
const TIPOS_SOLO_CONSULTA = new Set(["tesis", "revista", "material_especial"]);
const GRADOS_ACADEMICOS = ["licenciatura", "maestria", "doctorado"];
const MAX_LIMIT = 100;
const CAMPOS_TEXTO = {
  titulo: 200,
  autor: 150,
  categoria: 100,
  signatura: 60,
  editorial: 120,
  isbn_issn: 20,
  marca: 60,
  modelo: 60,
  numero_serie: 80,
};

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero < 1) {
    throw errorHttp(400, "El identificador del material no es válido.");
  }
  return numero;
}

function leerTexto(entrada, campo, { obligatorio = false, maximo = CAMPOS_TEXTO[campo] } = {}) {
  const valor = entrada[campo];
  if (valor == null || (typeof valor === "string" && !valor.trim())) {
    if (obligatorio) throw errorHttp(400, `El campo ${campo} es obligatorio.`);
    return null;
  }
  if (typeof valor !== "string") {
    throw errorHttp(400, `El campo ${campo} debe ser texto.`);
  }
  const limpio = valor.trim();
  if (limpio.length > maximo) {
    throw errorHttp(400, `El campo ${campo} no puede superar los ${maximo} caracteres.`);
  }
  return limpio;
}

function leerEntero(entrada, campo, { obligatorio = false, minimo = 1400, maximo = 2100 } = {}) {
  const valor = entrada[campo];
  if (valor == null || valor === "") {
    if (obligatorio) throw errorHttp(400, `El campo ${campo} es obligatorio.`);
    return null;
  }
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw errorHttp(400, `El campo ${campo} debe ser un entero entre ${minimo} y ${maximo}.`);
  }
  return numero;
}

function normalizarMaterial(entrada, anterior = null) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw errorHttp(400, "Envía los datos del material.");
  }

  const { tipo } = entrada;
  if (!TIPOS_MATERIAL.includes(tipo)) {
    throw errorHttp(400, "El tipo de material no es válido.");
  }

  const requiereAutor = ["libro", "tesis"].includes(tipo);
  const requiereCategoria = ["libro", "tesis", "revista"].includes(tipo);
  const requiereSignatura = ["libro", "tesis"].includes(tipo);
  const requiereAnio = tipo === "tesis";
  const requiereGrado = tipo === "tesis";
  const esEquipo = ["ipad", "equipo_computo"].includes(tipo);

  const titulo = leerTexto(entrada, "titulo", { obligatorio: true });
  const autor = leerTexto(entrada, "autor", { obligatorio: requiereAutor });
  const categoria = leerTexto(entrada, "categoria", { obligatorio: requiereCategoria });
  const signatura = leerTexto(entrada, "signatura", { obligatorio: requiereSignatura });

  const editorial = ["libro", "revista"].includes(tipo)
    ? leerTexto(entrada, "editorial")
    : null;
  const anio = ["libro", "tesis", "revista", "material_especial", "cd", "dvd"].includes(tipo)
    ? leerEntero(entrada, "anio", { obligatorio: requiereAnio })
    : null;
  const isbn_issn = ["libro", "revista"].includes(tipo)
    ? leerTexto(entrada, "isbn_issn")
    : null;
  const grado_academico = tipo === "tesis"
    ? leerTexto(entrada, "grado_academico", { obligatorio: requiereGrado, maximo: 20 })
    : null;
  if (grado_academico && !GRADOS_ACADEMICOS.includes(grado_academico)) {
    throw errorHttp(400, "El grado académico debe ser licenciatura, maestria o doctorado.");
  }

  const marca = esEquipo ? leerTexto(entrada, "marca", { obligatorio: true }) : null;
  const modelo = esEquipo ? leerTexto(entrada, "modelo", { obligatorio: true }) : null;
  const numero_serie = esEquipo ? leerTexto(entrada, "numero_serie", { obligatorio: true }) : null;
  const dias_prestamo = esEquipo
    ? leerEntero(entrada, "dias_prestamo", { minimo: 1, maximo: 2147483647 })
    : null;

  const ejemplares_totales = esEquipo
    ? 1
    : leerEntero(entrada, "ejemplares_totales", { obligatorio: true, minimo: 1, maximo: 2147483647 });
  // La capa de datos recalcula la disponibilidad dentro de una transacción y
  // con el material bloqueado, usando los préstamos activos como fuente real.
  // Aquí solo se conserva un valor para altas; en ediciones no se confía en el
  // número que venga del cliente ni en una lectura anterior posiblemente vieja.
  const ejemplares_disponibles = anterior
    ? anterior.ejemplares_disponibles
    : ejemplares_totales;

  const solo_consulta = TIPOS_SOLO_CONSULTA.has(tipo)
    ? true
    : typeof entrada.solo_consulta === "boolean"
      ? entrada.solo_consulta
      : anterior?.solo_consulta ?? false;

  return {
    tipo,
    titulo,
    autor,
    categoria,
    signatura,
    editorial,
    anio,
    isbn_issn,
    grado_academico,
    marca,
    modelo,
    numero_serie,
    dias_prestamo,
    ejemplares_totales,
    ejemplares_disponibles,
    solo_consulta,
  };
}

function numeroConsulta(valor, defecto, minimo, maximo = Number.MAX_SAFE_INTEGER) {
  if (valor === undefined) return defecto;
  if (!/^\d+$/.test(String(valor))) return null;
  const numero = Number(valor);
  return numero >= minimo && numero <= maximo ? numero : null;
}

export async function obtenerMateriales(query) {
  const limit = numeroConsulta(query.limit, 10, 1, MAX_LIMIT);
  const offset = numeroConsulta(query.offset, 0, 0);
  if (limit === null || offset === null) {
    throw errorHttp(400, `La paginación debe ser válida (limit de 1 a ${MAX_LIMIT} y offset igual o mayor a 0).`);
  }

  const busqueda = typeof query.search === "string" ? query.search.trim().slice(0, 200) : "";
  const tipo = typeof query.tipo === "string" ? query.tipo.trim() : "";
  const categoria = typeof query.categoria === "string" ? query.categoria.trim() : "";
  const disponibilidad = typeof query.disponibilidad === "string" ? query.disponibilidad.trim() : "";
  const soloConsultaRaw = typeof query.solo_consulta === "string" ? query.solo_consulta.trim() : "";
  if (tipo && !TIPOS_MATERIAL.includes(tipo)) {
    throw errorHttp(400, "El filtro de tipo no es válido.");
  }
  if (disponibilidad && !["disponibles", "agotados"].includes(disponibilidad)) {
    throw errorHttp(400, "El filtro de disponibilidad no es válido.");
  }
  if (soloConsultaRaw && !["true", "false"].includes(soloConsultaRaw)) {
    throw errorHttp(400, "El filtro de modalidad no es válido.");
  }
  const soloConsulta = soloConsultaRaw === "" ? null : soloConsultaRaw === "true";

  return {
    ...(await listarMateriales({ busqueda, tipo, categoria, disponibilidad, soloConsulta, limit, offset })),
    limit,
    offset,
  };
}

export function obtenerCategorias() {
  return listarCategorias();
}

export async function obtenerMaterial(id) {
  const material = await buscarMaterialPorId(validarId(id));
  if (!material) throw errorHttp(404, "No se encontró el material.");
  return material;
}

export function registrarMaterial(entrada) {
  return crearMaterial(normalizarMaterial(entrada));
}

export async function modificarMaterial(id, entrada) {
  const idValidado = validarId(id);
  const anterior = await buscarMaterialPorId(idValidado);
  if (!anterior) throw errorHttp(404, "No se encontró el material.");
  return actualizarMaterial(idValidado, normalizarMaterial(entrada, anterior));
}

export async function quitarMaterial(id) {
  const eliminado = await eliminarMaterial(validarId(id));
  if (!eliminado) throw errorHttp(404, "No se encontró el material.");
}
