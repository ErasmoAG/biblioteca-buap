import {
  actualizarPrestatario,
  buscarPrestatarioPorId,
  crearPrestatario,
  eliminarPrestatario,
  existeIdentificadorPrestatario,
  listarPrestatarios,
  obtenerResumenPrestatarios,
} from "../data/usuariosData.js";

// El perfil captura quién es la persona; tipo_prestatario conserva el grupo
// de política que ya usa la base de datos y que RF3 podrá consultar.
export const PERFILES_PRESTATARIO = {
  preparatoria: { tipo: "prepa_lic_tecnica" },
  licenciatura: { tipo: "prepa_lic_tecnica" },
  carrera_tecnica: { tipo: "prepa_lic_tecnica" },
  egresado_pasante: { tipo: "prepa_lic_tecnica" },
  intercambio: { tipo: "prepa_lic_tecnica" },
  trabajador_administrativo: { tipo: "prepa_lic_tecnica" },
  jubilado: { tipo: "prepa_lic_tecnica" },
  docente: { tipo: "posgrado" },
  maestria: { tipo: "posgrado" },
  doctorado: { tipo: "posgrado" },
  investigador: { tipo: "investigador_instituto" },
  estudiante_instituto: { tipo: "investigador_instituto" },
  externo: { tipo: "externo" },
};

export const TIPOS_PRESTATARIO = [
  "prepa_lic_tecnica",
  "posgrado",
  "investigador_instituto",
  "externo",
];

const VIGENCIAS = ["vigente", "por_vencer", "vencida", "sin_vigencia"];
const MAX_LIMIT = 100;

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero < 1) {
    throw errorHttp(400, "El identificador del usuario no es válido.");
  }
  return numero;
}

function leerFecha(valor, nombreCampo) {
  if (valor == null || valor === "") return null;
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw errorHttp(400, `${nombreCampo} debe ser una fecha válida.`);
  }
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
    throw errorHttp(400, `${nombreCampo} debe ser una fecha válida.`);
  }
  return valor;
}

function normalizarPrestatario(entrada) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw errorHttp(400, "Envía los datos del prestatario.");
  }

  const nombre = typeof entrada.nombre === "string" ? entrada.nombre.trim() : "";
  if (!nombre) throw errorHttp(400, "El nombre es obligatorio.");
  if (nombre.length > 150) throw errorHttp(400, "El nombre no puede superar los 150 caracteres.");

  const perfil_prestatario = entrada.perfil_prestatario;
  const perfil = Object.hasOwn(PERFILES_PRESTATARIO, perfil_prestatario)
    ? PERFILES_PRESTATARIO[perfil_prestatario]
    : null;
  if (!perfil) {
    throw errorHttp(400, "Selecciona un perfil de prestatario válido.");
  }

  if (perfil_prestatario === "externo") {
    return {
      nombre,
      perfil_prestatario,
      tipo_prestatario: perfil.tipo,
      matricula_o_num_trabajador: null,
      vigencia_credencial: null,
      fecha_actualizacion_registro: null,
    };
  }

  const matricula_o_num_trabajador = typeof entrada.matricula_o_num_trabajador === "string"
    ? entrada.matricula_o_num_trabajador.trim()
    : "";
  if (!matricula_o_num_trabajador) {
    throw errorHttp(400, "La matrícula o número de trabajador es obligatorio para usuarios internos.");
  }
  if (matricula_o_num_trabajador.length > 30) {
    throw errorHttp(400, "La matrícula o número de trabajador no puede superar los 30 caracteres.");
  }

  return {
    nombre,
    perfil_prestatario,
    tipo_prestatario: perfil.tipo,
    matricula_o_num_trabajador,
    // Se permiten credenciales vencidas para conservar el registro y mostrar su estado.
    vigencia_credencial: leerFecha(entrada.vigencia_credencial, "La vigencia de la credencial"),
    fecha_actualizacion_registro: leerFecha(
      entrada.fecha_actualizacion_registro,
      "La fecha de actualización del registro bibliotecario"
    ),
  };
}

function numeroConsulta(valor, defecto, minimo, maximo = Number.MAX_SAFE_INTEGER) {
  if (valor === undefined) return defecto;
  if (!/^\d+$/.test(String(valor))) return null;
  const numero = Number(valor);
  return numero >= minimo && numero <= maximo ? numero : null;
}

export async function obtenerPrestatarios(query) {
  const limit = numeroConsulta(query.limit, 10, 1, MAX_LIMIT);
  const offset = numeroConsulta(query.offset, 0, 0);
  if (limit === null || offset === null) {
    throw errorHttp(400, `La paginación debe ser válida (limit de 1 a ${MAX_LIMIT} y offset igual o mayor a 0).`);
  }

  const busqueda = typeof query.search === "string" ? query.search.trim().slice(0, 200) : "";
  const tipo = typeof query.tipo_prestatario === "string" ? query.tipo_prestatario.trim() : "";
  const perfil = typeof query.perfil_prestatario === "string" ? query.perfil_prestatario.trim() : "";
  const vigencia = typeof query.vigencia === "string" ? query.vigencia.trim() : "";
  if (tipo && !TIPOS_PRESTATARIO.includes(tipo)) {
    throw errorHttp(400, "El filtro de tipo de prestatario no es válido.");
  }
  if (perfil && perfil !== "pendiente_clasificacion" && !Object.hasOwn(PERFILES_PRESTATARIO, perfil)) {
    throw errorHttp(400, "El filtro de perfil de prestatario no es válido.");
  }
  if (vigencia && !VIGENCIAS.includes(vigencia)) {
    throw errorHttp(400, "El filtro de vigencia no es válido.");
  }

  return {
    ...(await listarPrestatarios({ busqueda, tipo, perfil, vigencia, limit, offset })),
    limit,
    offset,
  };
}

export function obtenerEstadisticasPrestatarios() {
  return obtenerResumenPrestatarios();
}

export async function obtenerPrestatario(id) {
  const usuario = await buscarPrestatarioPorId(validarId(id));
  if (!usuario) throw errorHttp(404, "No se encontró el prestatario.");
  return usuario;
}

export async function registrarPrestatario(entrada) {
  const usuario = normalizarPrestatario(entrada);
  if (await existeIdentificadorPrestatario(usuario.matricula_o_num_trabajador)) {
    throw errorHttp(409, "Ya existe un prestatario con esa matrícula o número de trabajador.");
  }
  return crearPrestatario(usuario);
}

export async function modificarPrestatario(id, entrada) {
  const idValidado = validarId(id);
  if (!(await buscarPrestatarioPorId(idValidado))) {
    throw errorHttp(404, "No se encontró el prestatario.");
  }

  const usuario = normalizarPrestatario(entrada);
  if (await existeIdentificadorPrestatario(usuario.matricula_o_num_trabajador, idValidado)) {
    throw errorHttp(409, "Ya existe un prestatario con esa matrícula o número de trabajador.");
  }
  const actualizado = await actualizarPrestatario(idValidado, usuario);
  if (!actualizado) throw errorHttp(404, "No se encontró el prestatario.");
  return actualizado;
}

export async function quitarPrestatario(id) {
  const eliminado = await eliminarPrestatario(validarId(id));
  if (!eliminado) throw errorHttp(404, "No se encontró el prestatario.");
}
