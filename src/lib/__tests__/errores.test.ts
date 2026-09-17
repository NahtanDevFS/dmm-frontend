import { describe, expect, it } from "vitest";
import type { AxiosError } from "axios";
import {
  errorDeCampo,
  erroresPorCampo,
  esConflicto,
  esFalloDeRed,
  esLimiteExcedido,
  esSinPermiso,
  estadoDe,
  mensajeDeError,
} from "../errores";

/**
 * Construye un objeto que `axios.isAxiosError` reconoce como AxiosError.
 * axios lo detecta por la marca `isAxiosError: true`, no por `instanceof`,
 * así que no hace falta lanzar una petición real para simular una respuesta.
 */
function errorAxios(opciones: {
  status?: number;
  data?: unknown;
  url?: string;
  sinRespuesta?: boolean;
}): unknown {
  const { status, data, url, sinRespuesta = false } = opciones;
  return {
    isAxiosError: true,
    message: "Request failed",
    response: sinRespuesta
      ? undefined
      : { status, data, headers: {}, statusText: "", config: {} },
    config: { url },
  } as unknown as AxiosError;
}

describe("estadoDe", () => {
  it("da el código de estado de un error de axios", () => {
    expect(estadoDe(errorAxios({ status: 404 }))).toBe(404);
  });

  it("da undefined si la petición nunca obtuvo respuesta", () => {
    expect(estadoDe(errorAxios({ sinRespuesta: true }))).toBeUndefined();
  });

  it("da undefined si no es un error de axios", () => {
    expect(estadoDe(new Error("algo"))).toBeUndefined();
    expect(estadoDe("string cualquiera")).toBeUndefined();
  });
});

describe("mensajeDeError", () => {
  it("prioriza el mensaje que manda el servidor sobre el mapa por código", () => {
    const error = errorAxios({
      status: 409,
      data: { message: "Ya existe un insumo con ese nombre en la categoría" },
    });
    expect(mensajeDeError(error)).toBe(
      "Ya existe un insumo con ese nombre en la categoría",
    );
  });

  it("agrega el detalle por campo al mensaje general de validación", () => {
    const error = errorAxios({
      status: 400,
      data: {
        message: "Datos inválidos",
        errores: {
          telefono: ["El teléfono debe tener 8 dígitos"],
          nombres: ["Ingrese los nombres"],
        },
      },
    });
    const mensaje = mensajeDeError(error);
    expect(mensaje).toContain("Datos inválidos");
    expect(mensaje).toContain("El teléfono debe tener 8 dígitos");
    expect(mensaje).toContain("Ingrese los nombres");
  });

  it("cae al mapa por código si el servidor no manda mensaje", () => {
    const error = errorAxios({ status: 403, data: {} });
    expect(mensajeDeError(error)).toBe(
      "Su usuario no tiene permiso para realizar esta acción.",
    );
  });

  it("usa un mensaje genérico de servidor para cualquier 5xx no listado", () => {
    const error = errorAxios({ status: 503, data: {} });
    expect(mensajeDeError(error)).toBe(
      "Ocurrió un error en el servidor. Intente de nuevo en unos minutos.",
    );
  });

  it("usa el mensaje de fallo de red cuando no hubo respuesta", () => {
    const error = errorAxios({ sinRespuesta: true });
    expect(mensajeDeError(error)).toBe(
      "No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.",
    );
  });

  it("prefiere el respaldo de la pantalla cuando no hubo respuesta y se dio uno", () => {
    const error = errorAxios({ sinRespuesta: true });
    expect(mensajeDeError(error, "No se pudo cargar el listado.")).toBe(
      "No se pudo cargar el listado.",
    );
  });

  it("usa el mensaje de un Error nativo si no es de axios", () => {
    expect(mensajeDeError(new Error("fallo interno"))).toBe("fallo interno");
  });

  it("el respaldo gana sobre el mensaje de un Error nativo", () => {
    expect(mensajeDeError(new Error("fallo interno"), "Mensaje amable")).toBe(
      "Mensaje amable",
    );
  });

  it("da un mensaje genérico si no hay nada más que decir", () => {
    expect(mensajeDeError("no es un error de verdad")).toBe(
      "Ocurrió un error inesperado.",
    );
  });
});

describe("erroresPorCampo", () => {
  it("da el mapa de errores cuando viene en la respuesta", () => {
    const error = errorAxios({
      status: 400,
      data: { errores: { telefono: ["El teléfono debe tener 8 dígitos"] } },
    });
    expect(erroresPorCampo(error)).toEqual({
      telefono: ["El teléfono debe tener 8 dígitos"],
    });
  });

  it("da null si no hay errores por campo", () => {
    const error = errorAxios({ status: 400, data: { message: "x" } });
    expect(erroresPorCampo(error)).toBeNull();
  });

  it("da null si el objeto de errores está vacío", () => {
    const error = errorAxios({ status: 400, data: { errores: {} } });
    expect(erroresPorCampo(error)).toBeNull();
  });
});

describe("errorDeCampo", () => {
  it("da el primer mensaje de un campo concreto", () => {
    const error = errorAxios({
      status: 400,
      data: {
        errores: { telefono: ["Debe tener 8 dígitos", "Otro mensaje"] },
      },
    });
    expect(errorDeCampo(error, "telefono")).toBe("Debe tener 8 dígitos");
  });

  it("da undefined si el campo no tiene error", () => {
    const error = errorAxios({
      status: 400,
      data: { errores: { telefono: ["x"] } },
    });
    expect(errorDeCampo(error, "nombres")).toBeUndefined();
  });
});

describe("esConflicto / esSinPermiso / esLimiteExcedido / esFalloDeRed", () => {
  it("esConflicto es verdadero solo en 409", () => {
    expect(esConflicto(errorAxios({ status: 409 }))).toBe(true);
    expect(esConflicto(errorAxios({ status: 400 }))).toBe(false);
  });

  it("esSinPermiso es verdadero solo en 403", () => {
    expect(esSinPermiso(errorAxios({ status: 403 }))).toBe(true);
    expect(esSinPermiso(errorAxios({ status: 401 }))).toBe(false);
  });

  it("esLimiteExcedido es verdadero solo en 429", () => {
    expect(esLimiteExcedido(errorAxios({ status: 429 }))).toBe(true);
    expect(esLimiteExcedido(errorAxios({ status: 500 }))).toBe(false);
  });

  it("esFalloDeRed es verdadero cuando la petición no obtuvo respuesta", () => {
    expect(esFalloDeRed(errorAxios({ sinRespuesta: true }))).toBe(true);
  });

  it("esFalloDeRed es falso si sí hubo respuesta, aunque sea un error", () => {
    expect(esFalloDeRed(errorAxios({ status: 500 }))).toBe(false);
  });

  it("esFalloDeRed es falso si no es un error de axios", () => {
    expect(esFalloDeRed(new Error("x"))).toBe(false);
  });
});
