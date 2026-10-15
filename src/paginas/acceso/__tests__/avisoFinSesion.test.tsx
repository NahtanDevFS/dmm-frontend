import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";

/* Hallazgo QA (CP-ACC-03): al vencer o revocarse la sesión la aplicación
   volvía al acceso sin decir nada, aunque el servidor manda el motivo. */

vi.mock("../../../auth/useAuth", () => ({
  useAuth: () => ({ entrar: vi.fn() }),
}));

import PaginaAcceso from "../PaginaAcceso";
import axiosClient from "../../../api/axiosClient";
import {
  anunciarSesionExpirada,
  alExpirarSesion,
  leerMotivoFinSesion,
  MOTIVO_GENERICO,
} from "../../../api/sesion";

/* El interceptor de respuestas, sin pasar por la red. */
function rechazarCon(status: number, url: string, data: unknown) {
  const error = new AxiosError("fallo", "ERR", { url, headers: new AxiosHeaders() }, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { url, headers: new AxiosHeaders() },
    data,
  });
  const manejadores = (
    axiosClient.interceptors.response as unknown as {
      handlers: Array<{ rejected: (e: unknown) => Promise<unknown> }>;
    }
  ).handlers;
  return manejadores[0].rejected(error).catch(() => undefined);
}

// Alguien escuchando, como dentro de la aplicación montada: sin escuchas,
// anunciarSesionExpirada hace una navegación dura que jsdom no implementa.
let darDeBaja: () => void;
beforeEach(() => {
  window.sessionStorage.clear();
  darDeBaja = alExpirarSesion(() => {});
});
afterEach(() => darDeBaja());

describe("aviso de fin de sesión", () => {
  it("la pantalla de acceso dice el motivo que mandó el servidor", async () => {
    await rechazarCon(401, "personas", {
      message: "La sesión expiró por inactividad, inicie sesión nuevamente",
    });

    render(<PaginaAcceso />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "La sesión expiró por inactividad, inicie sesión nuevamente",
    );
  });

  it("se muestra una sola vez: al volver a entrar ya no está", () => {
    anunciarSesionExpirada("La sesión ha sido cerrada");

    const { unmount } = render(<PaginaAcceso />);
    expect(screen.getByRole("status")).toHaveTextContent("La sesión ha sido cerrada");
    unmount();

    expect(leerMotivoFinSesion()).toBeNull();
    render(<PaginaAcceso />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("sin motivo del servidor usa un texto genérico", () => {
    anunciarSesionExpirada();
    render(<PaginaAcceso />);
    expect(screen.getByRole("status")).toHaveTextContent(MOTIVO_GENERICO);
  });

  it("entrar por primera vez o tras cerrar sesión no muestra aviso", async () => {
    // Un 401 de auth/me o auth/logout es parte normal del flujo
    await rechazarCon(401, "auth/me", { message: "No ha iniciado sesión" });
    await rechazarCon(401, "auth/logout", { message: "Sesión inválida" });

    render(<PaginaAcceso />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
