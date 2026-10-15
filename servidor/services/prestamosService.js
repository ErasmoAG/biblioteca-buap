import {
  bloquearPrestatario,
  bloquearPrestamo,
  crearPrestamoEnTransaccion,
  enTransaccion,
  listarMaterialesParaPrestamo,
  listarPrestatariosParaPrestamo,
  listarPrestamos,
  obtenerEstadoPrestatario,
  obtenerMaterialPrestamo,
  obtenerUsuarioDePrestamo,
  renovarPrestamoEnTransaccion,
} from "../data/prestamosData.js";

export const MAX_PRESTAMOS_ACTIVOS = 15;
export const MAX_RENOVACIONES = 2;
export const DIAS_POR_RENOVACION = 5;

const DIAS_POR_GRUPO = {
  prepa_lic_tecnica: 15,
  posgrado: 20,
  investigador_instituto: 28,
};
const PERFILES_INTERNOS = new Set([
  "preparatoria", "licenciatura", "carrera_tecnica", "egresado_pasante",
  "intercambio", "trabajador_administrativo", "jubilado", "docente",
  "maestria", "doctorado", "investigador", "estudiante_instituto",
]);
const TIPOS_EQUIPO = new Set(["ipad", "equipo_computo"]);
const MAX_LIMIT = 100;

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarId(id, etiqueta) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero < 1) {
    throw errorHttp(400, `El identificador de ${etiqueta} no es válido.`);
  }
  return numero;
}

function numeroConsulta(valor, defecto, minimo, maximo = Number.MAX_SAFE_INTEGER) {
  if (valor === undefined) return defecto;
  if (!/^\d+$/.test(String(valor))) return null;
  const numero = Number(valor);
  return numero >= minimo && numero <= maximo ? numero : null;
}

function validarPrestatario(usuario, estado) {
  if (!usuario) throw errorHttp(404, "No se encontró al prestatario.");
  if (usuario.perfil_prestatario === "externo" || usuario.tipo_prestatario === "externo") {
    throw errorHttp(403, "Los usuarios externos solo pueden consultar material en sala.");
  }
  if (!PERFILES_INTERNOS.has(usuario.perfil_prestatario)
      || !Object.hasOwn(DIAS_POR_GRUPO, usuario.tipo_prestatario)) {
    throw errorHttp(409, "El prestatario aún no tiene un perfil BUAP válido. Actualiza su registro antes de prestar.");
  }
  if (!usuario.credencial_vigente) {
    throw errorHttp(409, "La credencial BUAP está vencida o no tiene vigencia registrada.");
  }
  if (!usuario.registro_vigente) {
    throw errorHttp(409, "El registro bibliotecario no está actualizado para el periodo escolar vigente.");
  }
  if (Number(estado.prestamos_vencidos) > 0) {
    throw errorHttp(409, "El prestatario tiene préstamos vencidos; recibe el material antes de registrar otro préstamo.");
  }
  if (Number(estado.multas_pendientes) > 0 || Number(estado.adeudo_pendiente) > 0) {
    throw errorHttp(409, "El prestatario tiene multas pendientes de pago.");
  }
}

function validarIdMaterial(id) {
  return validarId(id, "material");
}

export async function obtenerPrestamos(query) {
  const limit = numeroConsulta(query.limit, 10, 1, MAX_LIMIT);
  const offset = numeroConsulta(query.offset, 0, 0);
  if (limit === null || offset === null) {
    throw errorHttp(400, `La paginación debe ser válida (limit de 1 a ${MAX_LIMIT} y offset igual o mayor a 0).`);
  }

  const estados = ["activos", "vencidos", "devueltos"];
  const estado = typeof query.estado === "string" ? query.estado.trim() : "";
  if (estado && !estados.includes(estado)) {
    throw errorHttp(400, "El filtro de estado no es válido.");
  }
  const busqueda = typeof query.search === "string" ? query.search.trim().slice(0, 200) : "";
  return { ...(await listarPrestamos({ busqueda, estado, limit, offset })), limit, offset };
}

export async function obtenerOpcionesPrestatarios(query) {
  const busqueda = typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";
  return listarPrestatariosParaPrestamo(busqueda);
}

export async function obtenerOpcionesMateriales(query) {
  const busqueda = typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";
  return listarMaterialesParaPrestamo(busqueda);
}

export async function registrarPrestamo(entrada) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw errorHttp(400, "Envía el prestatario y el material del préstamo.");
  }
  const idUsuario = validarId(entrada.id_usuario, "prestatario");
  const idMaterial = validarIdMaterial(entrada.id_material);

  return enTransaccion(async (client) => {
    const usuario = await bloquearPrestatario(client, idUsuario);
    if (!usuario) throw errorHttp(404, "No se encontró al prestatario.");
    const estado = await obtenerEstadoPrestatario(client, idUsuario);
    validarPrestatario(usuario, estado);
    if (Number(estado.prestamos_activos) >= MAX_PRESTAMOS_ACTIVOS) {
      throw errorHttp(409, `El prestatario ya alcanzó el límite de ${MAX_PRESTAMOS_ACTIVOS} préstamos activos.`);
    }

    const material = await obtenerMaterialPrestamo(client, idMaterial);
    if (!material) throw errorHttp(404, "No se encontró el material.");
    if (material.solo_consulta) {
      throw errorHttp(409, "Este material es solo para consulta en sala y no puede prestarse a domicilio.");
    }
    if (Number(material.ejemplares_disponibles) < 1) {
      throw errorHttp(409, "No hay ejemplares disponibles de este material.");
    }

    const dias = TIPOS_EQUIPO.has(material.tipo)
      ? Number(material.dias_prestamo)
      : DIAS_POR_GRUPO[usuario.tipo_prestatario];
    if (!Number.isInteger(dias) || dias < 1) {
      throw errorHttp(409, "Configura un plazo de préstamo válido en el catálogo para este equipo.");
    }
    const prestamo = await crearPrestamoEnTransaccion(client, idUsuario, material, dias);
    return { ...prestamo, dias_plazo: dias };
  });
}

export async function renovarPrestamo(id, entrada) {
  const idPrestamo = validarId(id, "préstamo");
  if (!entrada || entrada.confirmo_sin_apartado !== true) {
    throw errorHttp(400, "Confirma que no existe un apartado pendiente antes de renovar.");
  }

  const primerDato = await obtenerUsuarioDePrestamo(idPrestamo);
  if (!primerDato) throw errorHttp(404, "No se encontró el préstamo.");

  return enTransaccion(async (client) => {
    const usuario = await bloquearPrestatario(client, primerDato.id_usuario);
    if (!usuario) throw errorHttp(404, "No se encontró al prestatario.");
    const estado = await obtenerEstadoPrestatario(client, usuario.id);
    validarPrestatario(usuario, estado);

    const prestamo = await bloquearPrestamo(client, idPrestamo);
    if (!prestamo || prestamo.id_usuario !== usuario.id) {
      throw errorHttp(404, "No se encontró el préstamo.");
    }
    if (prestamo.fecha_devolucion || prestamo.estado === "devuelto") {
      throw errorHttp(409, "El préstamo ya fue devuelto y no puede renovarse.");
    }
    if (prestamo.fecha_vencimiento < estado.fecha_hoy) {
      throw errorHttp(409, "El préstamo ya está vencido y no se puede renovar.");
    }
    if (Number(prestamo.renovaciones_usadas) >= MAX_RENOVACIONES) {
      throw errorHttp(409, `Este préstamo ya alcanzó el máximo de ${MAX_RENOVACIONES} renovaciones.`);
    }

    const renovado = await renovarPrestamoEnTransaccion(
      client,
      idPrestamo,
      DIAS_POR_RENOVACION,
      MAX_RENOVACIONES
    );
    return { ...renovado, dias_extension: DIAS_POR_RENOVACION };
  });
}
