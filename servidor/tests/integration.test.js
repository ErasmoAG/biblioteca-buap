import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../.env.test", import.meta.url)) });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "Configura servidor/.env.test con TEST_DATABASE_URL de una base separada antes de ejecutar npm run test:integration."
  );
}

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "solo-para-pruebas-de-integracion";

const [{ default: app }, { pool }] = await Promise.all([
  import("../app.js"),
  import("../db/pool.js"),
]);

const etiqueta = randomUUID().replaceAll("-", "").slice(0, 20);
const ids = { materiales: [], usuarios: [], prestamos: [], administrativos: [] };
let servidor;
let baseUrl;
let token;
let credencialesAdmin;
let datosDeFecha;

function identidadBaseDeDatos(connectionString) {
  const url = new URL(connectionString);
  const host = url.hostname.toLowerCase();
  const refDirecta = host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
  const usuario = decodeURIComponent(url.username);
  const refPooler = host.endsWith(".pooler.supabase.com")
    ? usuario.split(".").at(-1)
    : null;
  const proyecto = refDirecta || refPooler;
  const nombre = decodeURIComponent(url.pathname.replace(/^\//, ""));
  return proyecto
    ? `supabase:${proyecto}`
    : `${host}:${url.port || "5432"}/${nombre}`;
}

function assertBaseSeparada() {
  const produccion = process.env.DATABASE_URL;
  if (
    produccion &&
    identidadBaseDeDatos(produccion) === identidadBaseDeDatos(process.env.TEST_DATABASE_URL)
  ) {
    throw new Error(
      "TEST_DATABASE_URL apunta a la misma base que DATABASE_URL. Se cancelaron las pruebas para proteger los datos."
    );
  }
}

async function verificarEsquema() {
  const requeridas = {
    usuarios: [
      "id", "nombre", "rol", "tipo_prestatario", "perfil_prestatario",
      "matricula_o_num_trabajador", "vigencia_credencial", "fecha_registro",
      "email", "password_hash", "fecha_actualizacion_registro",
    ],
    materiales: [
      "id", "tipo", "titulo", "autor", "categoria", "ejemplares_totales",
      "ejemplares_disponibles", "solo_consulta", "signatura", "editorial", "anio",
      "isbn_issn", "grado_academico", "marca", "modelo", "numero_serie", "dias_prestamo",
    ],
    prestamos: [
      "id", "id_usuario", "id_material", "fecha_prestamo", "fecha_vencimiento",
      "renovaciones_usadas", "estado", "fecha_devolucion",
    ],
    multas: ["id", "id_prestamo", "dias_atraso", "monto", "pagada"],
  };
  const resultado = await pool.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [Object.keys(requeridas)]
  );
  const presentes = new Set(
    resultado.rows.map(({ table_name, column_name }) => `${table_name}.${column_name}`)
  );
  const faltantes = Object.entries(requeridas)
    .flatMap(([tabla, columnas]) => columnas.map((columna) => `${tabla}.${columna}`))
    .filter((columna) => !presentes.has(columna));

  assert.deepEqual(
    faltantes,
    [],
    `La base de pruebas no tiene el esquema actual. Columnas faltantes: ${faltantes.join(", ")}`
  );
}

async function llamada(ruta, { method = "GET", body, usarToken = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (usarToken && token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${ruta}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const texto = await response.text();
  return { response, data: texto ? JSON.parse(texto) : null };
}

function libro(titulo, categoria, ejemplares = 1) {
  return {
    tipo: "libro",
    titulo,
    autor: "Pruebas automatizadas",
    categoria,
    signatura: `QA-${etiqueta}`,
    ejemplares_totales: ejemplares,
    solo_consulta: false,
  };
}

async function crearPrestatario() {
  const { response, data } = await llamada("/api/usuarios", {
    method: "POST",
    body: {
      nombre: `Prestatario de integración ${etiqueta}`,
      perfil_prestatario: "licenciatura",
      matricula_o_num_trabajador: `T${etiqueta}`,
      vigencia_credencial: datosDeFecha.vigencia,
      fecha_actualizacion_registro: datosDeFecha.hoy,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(data));
  ids.usuarios.push(data.usuario.id);
  return data.usuario;
}

describe("Integración API con PostgreSQL de pruebas", () => {
  before(async () => {
    assertBaseSeparada();
    await verificarEsquema();

    const fechas = await pool.query(
      `SELECT CURRENT_DATE::text AS hoy,
              (CURRENT_DATE + INTERVAL '365 days')::date::text AS vigencia`
    );
    datosDeFecha = fechas.rows[0];

    const identificador = randomUUID();
    credencialesAdmin = {
      email: `admin-${identificador}@example.invalid`,
      password: `Integracion-${identificador}`,
    };
    servidor = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
      servidor.once("listening", resolve);
      servidor.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${servidor.address().port}`;

    const estadoRegistro = await llamada("/api/auth/registro-disponible", { usarToken: false });
    assert.equal(estadoRegistro.response.status, 200, JSON.stringify(estadoRegistro.data));
    if (estadoRegistro.data.disponible) {
      const registro = await llamada("/api/auth/registro", {
        method: "POST",
        usarToken: false,
        body: {
          nombre: `Admin integración ${etiqueta}`,
          ...credencialesAdmin,
        },
      });
      assert.equal(registro.response.status, 201, JSON.stringify(registro.data));
      ids.administrativos.push(registro.data.usuario.id);
      token = registro.data.token;
    } else {
      const hash = await bcrypt.hash(credencialesAdmin.password, 4);
      const admin = await pool.query(
        `INSERT INTO usuarios (nombre, rol, email, password_hash)
         VALUES ($1, 'administrativo', $2, $3)
         RETURNING id`,
        [`Admin integración ${etiqueta}`, credencialesAdmin.email, hash]
      );
      ids.administrativos.push(admin.rows[0].id);

      const login = await llamada("/api/auth/login", {
        method: "POST",
        usarToken: false,
        body: credencialesAdmin,
      });
      assert.equal(login.response.status, 200, JSON.stringify(login.data));
      token = login.data.token;
    }
  });

  after(async () => {
    if (servidor?.listening) {
      await new Promise((resolve, reject) => {
        servidor.close((error) => error ? reject(error) : resolve());
      });
    }

    try {
      if (ids.prestamos.length) {
        await pool.query("DELETE FROM multas WHERE id_prestamo = ANY($1::int[])", [ids.prestamos]);
        await pool.query("DELETE FROM prestamos WHERE id = ANY($1::int[])", [ids.prestamos]);
      }
      if (ids.materiales.length) {
        await pool.query("DELETE FROM materiales WHERE id = ANY($1::int[])", [ids.materiales]);
      }
      if (ids.usuarios.length) {
        await pool.query("DELETE FROM usuarios WHERE id = ANY($1::int[])", [ids.usuarios]);
      }
      if (ids.administrativos.length) {
        await pool.query("DELETE FROM usuarios WHERE id = ANY($1::int[])", [ids.administrativos]);
      }
    } finally {
      await pool.end();
    }
  });

  it("protege las rutas de datos y valida la sesión administrativa", async () => {
    const anonima = await llamada("/api/materiales", { usarToken: false });
    assert.equal(anonima.response.status, 401);

    const sesion = await llamada("/api/auth/me");
    assert.equal(sesion.response.status, 200);
    assert.equal(sesion.data.usuario.email, credencialesAdmin.email);

    const credencialIncorrecta = await llamada("/api/auth/login", {
      method: "POST",
      usarToken: false,
      body: { email: credencialesAdmin.email, password: "incorrecta" },
    });
    assert.equal(credencialIncorrecta.response.status, 401);

    const estadoRegistro = await llamada("/api/auth/registro-disponible", { usarToken: false });
    assert.equal(estadoRegistro.data.disponible, true);
    const segundoBibliotecario = await llamada("/api/auth/registro", {
      method: "POST",
      usarToken: false,
      body: {
        nombre: "Segundo bibliotecario de prueba",
        email: `segundo-${etiqueta}@example.invalid`,
        password: "Clave-de-prueba-123",
      },
    });
    assert.equal(segundoBibliotecario.response.status, 201, JSON.stringify(segundoBibliotecario.data));
    ids.administrativos.push(segundoBibliotecario.data.usuario.id);
  });

  it("integra el CRUD, búsqueda, filtros y paginación de materiales", async () => {
    const categoria = `Pruebas ${etiqueta}`;
    const alta = await llamada("/api/materiales", {
      method: "POST",
      body: libro(`Libro integración ${etiqueta}`, categoria, 2),
    });
    assert.equal(alta.response.status, 201, JSON.stringify(alta.data));
    const id = alta.data.material.id;
    ids.materiales.push(id);
    assert.equal(alta.data.material.ejemplares_disponibles, 2);

    const listado = await llamada(
      `/api/materiales?search=${encodeURIComponent(etiqueta)}&tipo=libro&categoria=${encodeURIComponent(categoria)}&disponibilidad=disponibles&limit=1&offset=0`
    );
    assert.equal(listado.response.status, 200, JSON.stringify(listado.data));
    assert.equal(listado.data.total, 1);
    assert.equal(listado.data.materiales[0].id, id);

    const detalle = await llamada(`/api/materiales/${id}`);
    assert.equal(detalle.response.status, 200);
    assert.equal(detalle.data.material.signatura, `QA-${etiqueta}`);

    const actualizacion = await llamada(`/api/materiales/${id}`, {
      method: "PUT",
      body: {
        ...libro(`Libro editado ${etiqueta}`, categoria, 4),
        editorial: "Editorial de prueba",
        anio: 2024,
      },
    });
    assert.equal(actualizacion.response.status, 200, JSON.stringify(actualizacion.data));
    assert.equal(actualizacion.data.material.ejemplares_totales, 4);
    assert.equal(actualizacion.data.material.ejemplares_disponibles, 4);
    assert.equal(actualizacion.data.material.editorial, "Editorial de prueba");

    const baja = await llamada(`/api/materiales/${id}`, { method: "DELETE" });
    assert.equal(baja.response.status, 204);
    ids.materiales = ids.materiales.filter((materialId) => materialId !== id);
  });

  it("integra alta, edición, unicidad de matrícula y baja de prestatarios", async () => {
    const prestatario = await crearPrestatario();
    const actualizado = await llamada(`/api/usuarios/${prestatario.id}`, {
      method: "PUT",
      body: {
        nombre: `Prestatario editado ${etiqueta}`,
        perfil_prestatario: "licenciatura",
        matricula_o_num_trabajador: `T${etiqueta}`,
        vigencia_credencial: datosDeFecha.vigencia,
        fecha_actualizacion_registro: datosDeFecha.hoy,
      },
    });
    assert.equal(actualizado.response.status, 200, JSON.stringify(actualizado.data));
    assert.equal(actualizado.data.usuario.nombre, `Prestatario editado ${etiqueta}`);

    const duplicado = await llamada("/api/usuarios", {
      method: "POST",
      body: {
        nombre: "Matrícula duplicada de prueba",
        perfil_prestatario: "licenciatura",
        matricula_o_num_trabajador: `T${etiqueta}`,
        vigencia_credencial: datosDeFecha.vigencia,
        fecha_actualizacion_registro: datosDeFecha.hoy,
      },
    });
    assert.equal(duplicado.response.status, 409);

    const baja = await llamada(`/api/usuarios/${prestatario.id}`, { method: "DELETE" });
    assert.equal(baja.response.status, 204);
    ids.usuarios = ids.usuarios.filter((usuarioId) => usuarioId !== prestatario.id);
  });

  it("registra préstamo, renueva, devuelve, calcula y cobra la multa", async () => {
    const prestatario = await crearPrestatario();
    const altaMaterial = await llamada("/api/materiales", {
      method: "POST",
      body: libro(`Préstamo integración ${etiqueta}`, `Préstamos ${etiqueta}`, 1),
    });
    assert.equal(altaMaterial.response.status, 201, JSON.stringify(altaMaterial.data));
    const materialId = altaMaterial.data.material.id;
    ids.materiales.push(materialId);

    const altaPrestamo = await llamada("/api/prestamos", {
      method: "POST",
      body: { id_usuario: prestatario.id, id_material: materialId },
    });
    assert.equal(altaPrestamo.response.status, 201, JSON.stringify(altaPrestamo.data));
    const prestamoId = altaPrestamo.data.prestamo.id;
    ids.prestamos.push(prestamoId);
    assert.equal(altaPrestamo.data.prestamo.dias_plazo, 15);

    const sinDisponibilidad = await llamada("/api/prestamos", {
      method: "POST",
      body: { id_usuario: prestatario.id, id_material: materialId },
    });
    assert.equal(sinDisponibilidad.response.status, 409);

    const primeraRenovacion = await llamada(`/api/prestamos/${prestamoId}/renovar`, { method: "POST" });
    assert.equal(primeraRenovacion.response.status, 200, JSON.stringify(primeraRenovacion.data));
    assert.equal(primeraRenovacion.data.prestamo.renovaciones_usadas, 1);

    const segundaRenovacion = await llamada(`/api/prestamos/${prestamoId}/renovar`, { method: "POST" });
    assert.equal(segundaRenovacion.response.status, 200);
    assert.equal(segundaRenovacion.data.prestamo.renovaciones_usadas, 2);

    const terceraRenovacion = await llamada(`/api/prestamos/${prestamoId}/renovar`, { method: "POST" });
    assert.equal(terceraRenovacion.response.status, 409);

    // Adelanta fechas solo en la base desechable, conservando la coherencia
    // entre fecha de préstamo y vencimiento.
    await pool.query(
      `UPDATE prestamos
          SET fecha_prestamo = CURRENT_DATE - 3,
              fecha_vencimiento = CURRENT_DATE - 2
        WHERE id = $1`,
      [prestamoId]
    );

    const devolucion = await llamada(`/api/prestamos/${prestamoId}/devolver`, { method: "POST" });
    assert.equal(devolucion.response.status, 200, JSON.stringify(devolucion.data));
    assert.equal(devolucion.data.prestamo.dias_atraso, 2);
    assert.equal(Number(devolucion.data.multa.monto), 2.6);
    assert.equal(devolucion.data.ejemplares_disponibles, 1);

    const multaId = devolucion.data.multa.id;
    const dobleDevolucion = await llamada(`/api/prestamos/${prestamoId}/devolver`, { method: "POST" });
    assert.equal(dobleDevolucion.response.status, 409);

    const bajaMaterialConPrestamo = await llamada(`/api/materiales/${materialId}`, { method: "DELETE" });
    assert.equal(bajaMaterialConPrestamo.response.status, 409);
    const bajaPrestatarioConPrestamo = await llamada(`/api/usuarios/${prestatario.id}`, { method: "DELETE" });
    assert.equal(bajaPrestatarioConPrestamo.response.status, 409);

    const pago = await llamada(`/api/prestamos/multas/${multaId}/pagar`, { method: "POST" });
    assert.equal(pago.response.status, 200, JSON.stringify(pago.data));
    assert.equal(pago.data.multa.pagada, true);
  });
});
