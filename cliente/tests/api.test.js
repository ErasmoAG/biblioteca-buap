import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { api } from "../src/api.js";

const fetchOriginal = globalThis.fetch;
const localStorageOriginal = globalThis.localStorage;
const errorOriginal = console.error;

beforeEach(() => {
  globalThis.localStorage = { getItem: () => null };
  console.error = () => {};
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  if (localStorageOriginal === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = localStorageOriginal;
  console.error = errorOriginal;
});

test("reintenta el login después de un fallo transitorio de red", async () => {
  let llamadas = 0;
  globalThis.fetch = async () => {
    llamadas += 1;
    if (llamadas === 1) throw new TypeError("conexión inicial rechazada");
    return { ok: true, json: async () => ({ token: "token-prueba" }) };
  };

  const respuesta = await api("/auth/login", {
    method: "POST",
    body: { email: "biblioteca@buap.mx", password: "secreto" },
  });

  assert.equal(respuesta.token, "token-prueba");
  assert.equal(llamadas, 2);
});

test("no reintenta operaciones POST que pueden modificar datos", async () => {
  let llamadas = 0;
  globalThis.fetch = async () => {
    llamadas += 1;
    throw new TypeError("conexión rechazada");
  };

  await assert.rejects(api("/materiales", { method: "POST", body: { titulo: "Libro" } }), /No se pudo conectar/);
  assert.equal(llamadas, 1);
});

test("no reintenta una respuesta HTTP de error como si fuera fallo de red", async () => {
  let llamadas = 0;
  globalThis.fetch = async () => {
    llamadas += 1;
    return { ok: false, status: 401, json: async () => ({ error: "Credenciales inválidas." }) };
  };

  await assert.rejects(api("/auth/login", { method: "POST", body: {} }), /Credenciales inválidas/);
  assert.equal(llamadas, 1);
});
