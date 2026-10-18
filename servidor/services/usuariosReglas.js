// Reglas puras de prestatarios. No importa ni consulta la base de datos.
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

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
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

export function normalizarPrestatario(entrada) {
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
