import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizarConsultaMateriales,
  normalizarMaterial,
} from "../services/materialesReglas.js";
import { construirFiltrosMateriales } from "../data/materialesFiltros.js";
import { normalizarPrestatario } from "../services/usuariosReglas.js";
import { normalizarRegistroAdministrativo } from "../services/authReglas.js";
import {
  calcularDiasPrestamo,
  calcularMultaEstimada,
  validarLimitePrestamos,
  validarMaterialParaPrestamo,
  validarPrestatario,
  validarRenovacion,
} from "../services/prestamosReglas.js";

function debeFallar(operacion, status, mensaje) {
  assert.throws(operacion, (error) => {
    assert.equal(error.status, status);
    if (mensaje) assert.match(error.message, mensaje);
    return true;
  });
}

test("autenticación normaliza nombre y correo del registro inicial", () => {
  assert.deepEqual(normalizarRegistroAdministrativo({
    nombre: "  Bibliotecaria BUAP  ",
    email: "  BIBLIOTECA@EXAMPLE.COM ",
    password: "Clave-segura-123",
  }), {
    nombre: "Bibliotecaria BUAP",
    email: "biblioteca@example.com",
    password: "Clave-segura-123",
  });
});

test("autenticación rechaza registro inicial con datos inválidos", () => {
  debeFallar(() => normalizarRegistroAdministrativo({
    nombre: " ", email: "biblioteca@example.com", password: "Clave-12345",
  }), 400, /nombre/);
  debeFallar(() => normalizarRegistroAdministrativo({
    nombre: "Biblioteca", email: "no-es-correo", password: "Clave-12345",
  }), 400, /correo/);
  debeFallar(() => normalizarRegistroAdministrativo({
    nombre: "Biblioteca", email: "biblioteca@example.com", password: "corta",
  }), 400, /8 caracteres/);
});

test("RF1 normaliza un libro y sus campos opcionales", () => {
  const material = normalizarMaterial({
    tipo: "libro",
    titulo: "  Arquitectura de software  ",
    autor: "  Pressman ",
    categoria: " Tecnología ",
    signatura: " QA76.9",
    editorial: "Pearson",
    anio: "2024",
    isbn_issn: "9780133943030",
    ejemplares_totales: "3",
  });

  assert.equal(material.titulo, "Arquitectura de software");
  assert.equal(material.autor, "Pressman");
  assert.equal(material.anio, 2024);
  assert.equal(material.ejemplares_totales, 3);
  assert.equal(material.ejemplares_disponibles, 3);
  assert.equal(material.solo_consulta, false);
  assert.equal(material.marca, null);
});

test("RF1 exige los campos bibliográficos de una tesis y fuerza consulta en sala", () => {
  const entrada = {
    tipo: "tesis",
    titulo: "Tesis BUAP",
    autor: "Ana Pérez",
    categoria: "Computación",
    signatura: "T-001",
    anio: 2023,
    grado_academico: "maestria",
    ejemplares_totales: 1,
    solo_consulta: false,
  };

  const material = normalizarMaterial(entrada);
  assert.equal(material.solo_consulta, true);
  assert.equal(material.grado_academico, "maestria");
  debeFallar(() => normalizarMaterial({ ...entrada, signatura: "", anio: null }), 400, /signatura|anio/);
});

test("RF1 permite CD sin autor y limpia campos que no aplican", () => {
  const material = normalizarMaterial({
    tipo: "cd",
    titulo: "Disco de audio",
    ejemplares_totales: 2,
    marca: "Campo que no aplica",
    grado_academico: "doctorado",
  });

  assert.equal(material.autor, null);
  assert.equal(material.marca, null);
  assert.equal(material.grado_academico, null);
  assert.equal(material.ejemplares_disponibles, 2);
});

test("RF1 fuerza un ejemplar para equipo y exige marca, modelo y número de serie", () => {
  const equipo = normalizarMaterial({
    tipo: "ipad",
    titulo: "iPad biblioteca",
    marca: "Apple",
    modelo: "Air",
    numero_serie: "SN-001",
    ejemplares_totales: 9,
    dias_prestamo: "4",
  });

  assert.equal(equipo.ejemplares_totales, 1);
  assert.equal(equipo.ejemplares_disponibles, 1);
  assert.equal(equipo.dias_prestamo, 4);
  debeFallar(() => normalizarMaterial({ tipo: "equipo_computo", titulo: "PC" }), 400, /marca/);
});

test("RF1 rechaza tipo y grado académico fuera de catálogo", () => {
  debeFallar(() => normalizarMaterial({ tipo: "libre", titulo: "X" }), 400, /tipo/);
  debeFallar(() => normalizarMaterial({
    tipo: "tesis", titulo: "X", autor: "A", categoria: "C", signatura: "S",
    anio: 2020, grado_academico: "especialidad", ejemplares_totales: 1,
  }), 400, /grado académico/);
});

test("RF5 acumula búsqueda y filtros de catálogo con parámetros seguros", () => {
  const filtros = normalizarConsultaMateriales({
    search: "  algoritmos  ",
    tipo: "libro",
    categoria: "Computación",
    disponibilidad: "disponibles",
    solo_consulta: "false",
    limit: "20",
    offset: "40",
  });
  const consulta = construirFiltrosMateriales(filtros);

  assert.deepEqual(filtros, {
    busqueda: "algoritmos",
    tipo: "libro",
    categoria: "Computación",
    disponibilidad: "disponibles",
    soloConsulta: false,
    limit: 20,
    offset: 40,
  });
  assert.match(consulta.where, /titulo ILIKE \$1/);
  assert.match(consulta.where, /signatura ILIKE \$1/);
  assert.match(consulta.where, /tipo = \$2/);
  assert.match(consulta.where, /categoria = \$3/);
  assert.match(consulta.where, /ejemplares_disponibles > 0/);
  assert.match(consulta.where, /solo_consulta = \$4/);
  assert.deepEqual(consulta.valores, ["%algoritmos%", "libro", "Computación", false]);
});

test("RF5 rechaza filtros y paginación fuera de catálogo", () => {
  debeFallar(() => normalizarConsultaMateriales({ tipo: "otro" }), 400, /tipo/);
  debeFallar(() => normalizarConsultaMateriales({ disponibilidad: "reservado" }), 400, /disponibilidad/);
  debeFallar(() => normalizarConsultaMateriales({ solo_consulta: "sí" }), 400, /modalidad/);
  debeFallar(() => normalizarConsultaMateriales({ limit: "0" }), 400, /paginación/);
});

test("RF2 deriva el grupo de préstamo a partir del perfil", () => {
  assert.equal(normalizarPrestatario({
    nombre: "  Luz  ",
    perfil_prestatario: "licenciatura",
    matricula_o_num_trabajador: "  20250001 ",
    vigencia_credencial: "2027-06-30",
    fecha_actualizacion_registro: "2026-09-01",
  }).tipo_prestatario, "prepa_lic_tecnica");

  assert.equal(normalizarPrestatario({
    nombre: "Mario",
    perfil_prestatario: "docente",
    matricula_o_num_trabajador: "T-55",
  }).tipo_prestatario, "posgrado");
});

test("RF2 deja sin matrícula y vigencias a una persona externa", () => {
  const usuario = normalizarPrestatario({ nombre: "Visitante", perfil_prestatario: "externo" });
  assert.equal(usuario.tipo_prestatario, "externo");
  assert.equal(usuario.matricula_o_num_trabajador, null);
  assert.equal(usuario.vigencia_credencial, null);
  assert.equal(usuario.fecha_actualizacion_registro, null);
});

test("RF2 exige identificación interna y valida fechas reales", () => {
  debeFallar(() => normalizarPrestatario({ nombre: "A", perfil_prestatario: "licenciatura" }), 400, /matrícula/);
  debeFallar(() => normalizarPrestatario({
    nombre: "A", perfil_prestatario: "licenciatura", matricula_o_num_trabajador: "123",
    vigencia_credencial: "2026-02-30",
  }), 400, /fecha válida/);
  debeFallar(() => normalizarPrestatario({ nombre: "A", perfil_prestatario: "visitante" }), 400, /perfil/);
});

const usuarioElegible = {
  perfil_prestatario: "licenciatura",
  tipo_prestatario: "prepa_lic_tecnica",
  credencial_vigente: true,
  registro_vigente: true,
};
const estadoElegible = {
  prestamos_activos: 0,
  prestamos_vencidos: 0,
  multas_pendientes: 0,
  adeudo_pendiente: 0,
};

test("RF3 permite préstamo solo a prestatario interno elegible", () => {
  assert.doesNotThrow(() => validarPrestatario(usuarioElegible, estadoElegible));
  debeFallar(() => validarPrestatario({ ...usuarioElegible, perfil_prestatario: "externo" }, estadoElegible), 403, /externos/);
  debeFallar(() => validarPrestatario({ ...usuarioElegible, credencial_vigente: false }, estadoElegible), 409, /credencial/);
  debeFallar(() => validarPrestatario(usuarioElegible, { ...estadoElegible, prestamos_vencidos: 1 }), 409, /vencidos/);
  debeFallar(() => validarPrestatario(usuarioElegible, { ...estadoElegible, multas_pendientes: 1 }), 409, /multas/);
  debeFallar(() => validarPrestatario({ ...usuarioElegible, registro_vigente: false }, estadoElegible), 409, /registro/);
});

test("RF3 aplica límite de 15 préstamos activos por prestatario", () => {
  assert.doesNotThrow(() => validarLimitePrestamos({ prestamos_activos: 14 }));
  debeFallar(() => validarLimitePrestamos({ prestamos_activos: 15 }), 409, /15 préstamos activos/);
});

test("RF3 bloquea materiales de consulta y materiales sin disponibilidad", () => {
  assert.doesNotThrow(() => validarMaterialParaPrestamo({ solo_consulta: false, ejemplares_disponibles: 1 }));
  debeFallar(() => validarMaterialParaPrestamo({ solo_consulta: true, ejemplares_disponibles: 1 }), 409, /consulta en sala/);
  debeFallar(() => validarMaterialParaPrestamo({ solo_consulta: false, ejemplares_disponibles: 0 }), 409, /disponibles/);
});

test("RF3 calcula plazos por grupo y usa el plazo configurado para equipos", () => {
  assert.equal(calcularDiasPrestamo({ tipo_prestatario: "prepa_lic_tecnica" }, { tipo: "libro" }), 15);
  assert.equal(calcularDiasPrestamo({ tipo_prestatario: "posgrado" }, { tipo: "dvd" }), 20);
  assert.equal(calcularDiasPrestamo({ tipo_prestatario: "investigador_instituto" }, { tipo: "cd" }), 28);
  assert.equal(calcularDiasPrestamo({ tipo_prestatario: "posgrado" }, { tipo: "ipad", dias_prestamo: 3 }), 3);
  debeFallar(() => calcularDiasPrestamo(usuarioElegible, { tipo: "ipad", dias_prestamo: null }), 409, /plazo/);
});

test("RF3 permite renovar hasta dos veces antes del vencimiento", () => {
  const prestamo = {
    fecha_devolucion: null,
    fecha_vencimiento: "2026-10-17",
    renovaciones_usadas: 1,
    estado: "activo",
  };

  assert.doesNotThrow(() => validarRenovacion(prestamo, "2026-10-17"));
  debeFallar(() => validarRenovacion({ ...prestamo, fecha_vencimiento: "2026-10-16" }, "2026-10-17"), 409, /vencido/);
  debeFallar(() => validarRenovacion({ ...prestamo, renovaciones_usadas: 2 }, "2026-10-17"), 409, /máximo/);
  debeFallar(() => validarRenovacion({ ...prestamo, fecha_devolucion: "2026-10-17", estado: "devuelto" }, "2026-10-17"), 409, /devuelto/);
});

test("RF4 calcula la multa estimada a $1.30 por día con dos decimales", () => {
  assert.equal(calcularMultaEstimada(0), 0);
  assert.equal(calcularMultaEstimada(1), 1.3);
  assert.equal(calcularMultaEstimada(3), 3.9);
});
