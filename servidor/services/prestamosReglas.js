// Reglas puras de préstamos y multas. No importa ni consulta la base de datos.
export const MAX_PRESTAMOS_ACTIVOS = 15;
export const MAX_RENOVACIONES = 2;
export const DIAS_POR_RENOVACION = 5;
export const TARIFA_DIARIA_MULTA = 1.3;

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

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

export function validarPrestatario(usuario, estado) {
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

export function validarLimitePrestamos(estado) {
  if (Number(estado.prestamos_activos) >= MAX_PRESTAMOS_ACTIVOS) {
    throw errorHttp(409, `El prestatario ya alcanzó el límite de ${MAX_PRESTAMOS_ACTIVOS} préstamos activos.`);
  }
}

export function validarMaterialParaPrestamo(material) {
  if (material.solo_consulta) {
    throw errorHttp(409, "Este material es solo para consulta en sala y no puede prestarse a domicilio.");
  }
  if (Number(material.ejemplares_disponibles) < 1) {
    throw errorHttp(409, "No hay ejemplares disponibles de este material.");
  }
}

export function calcularDiasPrestamo(usuario, material) {
  const dias = TIPOS_EQUIPO.has(material.tipo)
    ? Number(material.dias_prestamo)
    : DIAS_POR_GRUPO[usuario.tipo_prestatario];
  if (!Number.isInteger(dias) || dias < 1) {
    throw errorHttp(409, "Configura un plazo de préstamo válido en el catálogo para este equipo.");
  }
  return dias;
}

export function validarRenovacion(prestamo, fechaHoy) {
  if (prestamo.fecha_devolucion || prestamo.estado === "devuelto") {
    throw errorHttp(409, "El préstamo ya fue devuelto y no puede renovarse.");
  }
  if (prestamo.fecha_vencimiento < fechaHoy) {
    throw errorHttp(409, "El préstamo ya está vencido y no se puede renovar.");
  }
  if (Number(prestamo.renovaciones_usadas) >= MAX_RENOVACIONES) {
    throw errorHttp(409, `Este préstamo ya alcanzó el máximo de ${MAX_RENOVACIONES} renovaciones.`);
  }
}

export function calcularMultaEstimada(diasAtraso) {
  return Number((Number(diasAtraso || 0) * TARIFA_DIARIA_MULTA).toFixed(2));
}
